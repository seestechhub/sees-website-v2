import express, { type Request, type Response, type NextFunction } from 'express';
import helmet from 'helmet';
import { z } from 'zod';
import * as OTPAuth from 'otpauth';
import { pool, transaction, audit } from './db.js';
import { config } from './config.js';
import { token, digest, encrypt, decrypt, hashPassword, verifyPassword, policy } from './security.js';
import { registration, password, levelResourcePolicy as contentSchema, kind } from './schemas.js';
import { loadIdentity, requireIdentity } from './session.js';
import { HttpError, limit } from './http.js';
import { newsletter } from './newsletter.js';
import { radar, radarAdmin } from './radar.js';
const ok = { message: 'If the details match an account, check your personal email for the next step.' };
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', config.TRUST_PROXY_HOPS);
app.use(helmet(), express.json({ limit: '200kb' }));
app.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'sees-api' }));
app.get('/ready', async (_req, res) => { await pool.query('SELECT id FROM members LIMIT 0'); await pool.query('SELECT id FROM subscriptions LIMIT 0'); res.json({ status: 'ready' }); });
app.get('/v1/policy', (_req, res) => res.json(policy));
app.use(loadIdentity);
app.use('/v1/radar', radar);
app.use('/v1/admin/radar', radarAdmin);
app.use('/v1/newsletter', newsletter);
app.post('/v1/auth/register', async (req, res) => {
    const input = registration.parse(req.body);
    await limit(req, 'register-ip', req.ip || 'unknown', 100);
    await limit(req, 'register', input.matric, 5);
    const hash = await hashPassword(input.password);
    await transaction(async (db) => {
        await db.query("DELETE FROM members WHERE matric=$1 AND verified_at IS NULL AND created_at<NOW()-INTERVAL '30 days'", [input.matric]);
        const { rows } = await db.query(`INSERT INTO members(matric,email,name,password_hash,consent_version) VALUES($1,$2,$3,$4,'2026-10-24') ON CONFLICT DO NOTHING RETURNING id`, [input.matric, input.email, input.name, hash]);
        if (!rows.length)
            return;
        const raw = token();
        await db.query("INSERT INTO account_tokens(token_hash,member_id,purpose,expires_at) VALUES($1,$2,'verify',NOW()+INTERVAL '24 hours')", [digest(raw), rows[0].id]);
        await db.query('INSERT INTO outbox(encrypted_payload) VALUES($1)', [encrypt({ to: input.email, subject: 'Confirm your SEES account', text: `Confirm your personal email: ${config.WEB_ORIGIN}/verify-email?token=${raw}\nThis link expires in 24 hours.` })]);
        await audit(db, rows[0].id, 'member.registered', rows[0].id, { evidence: 'format_validated' });
    });
    res.status(202).json(ok);
});
app.post('/v1/auth/verify', async (req, res) => {
    const { token: raw } = z.object({ token: z.string().min(20).max(200) }).parse(req.body);
    await transaction(async (db) => { const { rows } = await db.query("UPDATE account_tokens SET used_at=NOW() WHERE token_hash=$1 AND purpose='verify' AND used_at IS NULL AND expires_at>NOW() RETURNING member_id", [digest(raw)]); if (!rows.length)
        throw new HttpError(400, 'This verification link has expired or was already used.'); await db.query('UPDATE members SET verified_at=NOW() WHERE id=$1', [rows[0].member_id]); await audit(db, rows[0].member_id, 'member.email_verified', rows[0].member_id); });
    res.json({ message: 'Email confirmed. You can now sign in.' });
});
app.post('/v1/auth/resend', async (req, res) => {
    const { matric } = z.object({ matric: z.string().trim().max(30) }).parse(req.body);
    await limit(req, 'resend', matric, 3);
    await transaction(async (db) => { const { rows } = await db.query("SELECT id,email FROM members WHERE matric=$1 AND verified_at IS NULL AND status='active' FOR UPDATE", [matric]); if (!rows.length)
        return; const raw = token(); await db.query("UPDATE account_tokens SET used_at=NOW() WHERE member_id=$1 AND purpose='verify' AND used_at IS NULL", [rows[0].id]); await db.query("INSERT INTO account_tokens(token_hash,member_id,purpose,expires_at) VALUES($1,$2,'verify',NOW()+INTERVAL '24 hours')", [digest(raw), rows[0].id]); await db.query('INSERT INTO outbox(encrypted_payload) VALUES($1)', [encrypt({ to: rows[0].email, subject: 'Confirm your SEES account', text: `${config.WEB_ORIGIN}/verify-email?token=${raw}` })]); });
    res.status(202).json(ok);
});
app.post('/v1/auth/forgot-password', async (req, res) => {
    const { matric } = z.object({ matric: z.string().trim().max(30) }).parse(req.body);
    await limit(req, 'reset', matric, 3);
    await transaction(async (db) => { const { rows } = await db.query("SELECT id,email FROM members WHERE matric=$1 AND verified_at IS NOT NULL AND status='active' FOR UPDATE", [matric]); if (!rows.length)
        return; const raw = token(); await db.query("UPDATE account_tokens SET used_at=NOW() WHERE member_id=$1 AND purpose='reset' AND used_at IS NULL", [rows[0].id]); await db.query("INSERT INTO account_tokens(token_hash,member_id,purpose,expires_at) VALUES($1,$2,'reset',NOW()+INTERVAL '30 minutes')", [digest(raw), rows[0].id]); await db.query('INSERT INTO outbox(encrypted_payload) VALUES($1)', [encrypt({ to: rows[0].email, subject: 'Reset your SEES password', text: `Reset your password: ${config.WEB_ORIGIN}/reset-password?token=${raw}\nExpires in 30 minutes. Ignore this email if you did not request it.` })]); });
    res.status(202).json(ok);
});
app.post('/v1/auth/reset-password', async (req, res) => {
    const input = z.object({ token: z.string().min(20).max(200), password }).parse(req.body);
    await limit(req, 'reset-token', digest(input.token), 5);
    const hash = await hashPassword(input.password);
    await transaction(async (db) => { const { rows } = await db.query("UPDATE account_tokens SET used_at=NOW() WHERE token_hash=$1 AND purpose='reset' AND used_at IS NULL AND expires_at>NOW() RETURNING member_id", [digest(input.token)]); if (!rows.length)
        throw new HttpError(400, 'This reset link has expired or was already used.'); const updated = await db.query("UPDATE members SET password_hash=$1 WHERE id=$2 AND status='active' AND verified_at IS NOT NULL RETURNING id", [hash, rows[0].member_id]); if (!updated.rows.length)
        throw new HttpError(400, 'This account cannot be reset.'); await db.query('DELETE FROM sessions WHERE member_id=$1', [rows[0].member_id]); await db.query("UPDATE account_tokens SET used_at=NOW() WHERE member_id=$1 AND purpose='reset' AND used_at IS NULL", [rows[0].member_id]); await audit(db, rows[0].member_id, 'member.password_reset', rows[0].member_id); });
    res.json({ message: 'Password updated. Sign in with your new password.' });
});
const dummyHash = hashPassword(token());
app.post('/v1/auth/login', async (req, res) => {
    const input = z.object({ identifier: z.string().trim().min(1).max(254), password: z.string().min(1).max(128), realm: z.enum(['member', 'admin']).default('member'), code: z.string().max(8).optional() }).parse(req.body);
    await limit(req, 'login-' + input.realm, input.identifier.toLowerCase(), 5);
    const result = await transaction(async (db) => {
        const { rows } = await db.query(input.realm === 'member' ? 'SELECT * FROM members WHERE matric=$1 FOR UPDATE' : 'SELECT * FROM admins WHERE email=$1 FOR UPDATE', [input.identifier.toLowerCase()]);
        const row = rows[0];
        const valid = await verifyPassword(row?.password_hash || await dummyHash, input.password);
        if (!valid || !row || (input.realm === 'member' && (!row.verified_at || row.status !== 'active')) || (input.realm === 'admin' && !row.enabled))
            return null;
        if (input.realm === 'admin') {
            const secret = decrypt<string>(row.mfa_secret);
            const totp = new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(secret), period: 30, digits: 6 });
            const delta = totp.validate({ token: input.code || '', window: 1 });
            const step = Math.floor(Date.now() / 30000) + (delta ?? 0);
            if (delta === null || step <= Number(row.last_totp_step))
                return null;
            await db.query('UPDATE admins SET last_totp_step=$1 WHERE id=$2', [step, row.id]);
        }
        const raw = token();
        await db.query(`INSERT INTO sessions(token_hash,member_id,admin_id,expires_at) VALUES($1,$2,$3,NOW()+$4::INTERVAL)`, [digest(raw), input.realm === 'member' ? row.id : null, input.realm === 'admin' ? row.id : null, input.realm === 'admin' ? '8 hours' : '7 days']);
        await audit(db, row.id, input.realm + '.login', row.id);
        return { token: raw, realm: input.realm };
    });
    if (!result) {
        await transaction(db => audit(db, null, 'auth.login_failed', null, { realm: input.realm }));
        throw new HttpError(401, 'The sign-in details could not be verified. Check your password, email verification and authentication code.');
    }
    await pool.query('DELETE FROM rate_windows WHERE key_hash=$1', [digest('login-' + input.realm + ':' + input.identifier.toLowerCase())]);
    res.json(result);
});
app.post('/v1/auth/logout', async (req, res) => { if (req.sessionHash)
    await pool.query('DELETE FROM sessions WHERE token_hash=$1', [req.sessionHash]); res.json({ message: 'Signed out.' }); });
app.get('/v1/me', (req, res) => { if (!req.identity)
    throw new HttpError(401, 'Please sign in.'); res.json(req.identity); });
app.get('/v1/content', async (req, res) => { const type = kind.parse(req.query.kind || 'post'); const q = z.string().max(100).parse(req.query.q || ''); const level = req.query.level ? z.coerce.number().int().parse(req.query.level) : null; const { rows } = await pool.query(`SELECT id,kind,slug,title,summary,visibility,publish_at,created_at,data FROM content WHERE kind=$1 AND status='published' AND (publish_at IS NULL OR publish_at<=NOW()) AND (title ILIKE $2 OR summary ILIKE $2 OR data->>'course' ILIKE $2) AND ($3::INTEGER IS NULL OR (data->>'level')::INTEGER=$3) ORDER BY COALESCE(publish_at,created_at) DESC LIMIT 100`, [type, '%' + q + '%', level]); res.json(rows.map(({ data, ...row }) => ({ ...row, data: { level: data.level, course: data.course, category: data.category, role: data.role, session: data.session, image: data.image, starts_at: data.starts_at, location: data.location } }))); });
app.get('/v1/content/:kind/:slug', async (req, res) => { const type = kind.parse(req.params.kind); const { rows } = await pool.query("SELECT * FROM content WHERE kind=$1 AND slug=$2 AND status='published' AND (publish_at IS NULL OR publish_at<=NOW())", [type, req.params.slug]); if (!rows.length)
    throw new HttpError(404, 'This page is not available.'); const row = rows[0]; const allowed = row.visibility === 'public' || !!req.identity; res.json({ id: row.id, kind: row.kind, slug: row.slug, title: row.title, summary: row.summary, visibility: row.visibility, publish_at: row.publish_at, body: allowed ? row.body : null, data: allowed ? row.data : {}, locked: !allowed }); });
app.use('/v1/admin', requireIdentity('admin'));
app.get('/v1/admin/overview', async (req, res) => { const counts = await pool.query("SELECT kind,COUNT(*)::INTEGER AS count FROM content GROUP BY kind"); const people = req.identity!.role === 'super_admin' ? (await pool.query("SELECT COUNT(*)::INTEGER AS total,COUNT(*) FILTER(WHERE verified_at IS NOT NULL AND status='active')::INTEGER AS active FROM members")).rows[0] : null; res.json({ content: counts.rows, members: people }); });
app.get('/v1/admin/content', async (_req, res) => res.json((await pool.query('SELECT * FROM content ORDER BY updated_at DESC LIMIT 200')).rows));
app.post('/v1/admin/content', async (req, res) => { const input = contentSchema.parse(req.body); const row = await transaction(async (db) => { const { rows } = await db.query('INSERT INTO content(kind,slug,title,summary,body,visibility,status,publish_at,data,author_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *', [input.kind, input.slug, input.title, input.summary, input.body, input.visibility, input.status, input.publish_at, input.data, req.identity!.id]); await audit(db, req.identity!.id, 'content.created', rows[0].id, { kind: input.kind, status: input.status }); return rows[0]; }); res.status(201).json(row); });
app.put('/v1/admin/content/:id', async (req, res) => { const id = z.uuid().parse(req.params.id); const input = contentSchema.parse(req.body); const row = await transaction(async (db) => { const { rows } = await db.query('SELECT * FROM content WHERE id=$1 FOR UPDATE', [id]); if (!rows.length)
    throw new HttpError(404, 'Content not found.'); if (rows[0].version !== input.version)
    throw new HttpError(409, 'Someone changed this content. Reload before saving.'); await db.query('INSERT INTO content_revisions(content_id,version,snapshot,actor_id) VALUES($1,$2,$3,$4)', [id, rows[0].version, rows[0], req.identity!.id]); const updated = await db.query('UPDATE content SET kind=$2,slug=$3,title=$4,summary=$5,body=$6,visibility=$7,status=$8,publish_at=$9,data=$10,version=version+1,updated_at=NOW() WHERE id=$1 RETURNING *', [id, input.kind, input.slug, input.title, input.summary, input.body, input.visibility, input.status, input.publish_at, input.data]); await db.query('DELETE FROM content_revisions WHERE content_id=$1 AND version NOT IN (SELECT version FROM content_revisions WHERE content_id=$1 ORDER BY version DESC LIMIT 10)', [id]); await audit(db, req.identity!.id, 'content.updated', id, { status: input.status, version: input.version }); return updated.rows[0]; }); res.json(row); });
app.get('/v1/admin/members', requireIdentity('admin', 'super_admin'), async (req, res) => { const rows = await transaction(async (db) => { await audit(db, req.identity!.id, 'members.list_viewed'); return (await db.query('SELECT id,name,matric,email,level,status,evidence,verified_at,created_at FROM members ORDER BY created_at DESC LIMIT 200')).rows; }); res.json(rows); });
app.patch('/v1/admin/members/:id', requireIdentity('admin', 'super_admin'), async (req, res) => { const id = z.uuid().parse(req.params.id); const input = z.object({ status: z.enum(['active', 'review', 'deactivated']), reason: z.string().trim().min(3).max(300) }).parse(req.body); await transaction(async (db) => { const result = await db.query('UPDATE members SET status=$1 WHERE id=$2 RETURNING id', [input.status, id]); if (!result.rows.length)
    throw new HttpError(404, 'Member not found.'); if (input.status !== 'active')
    await db.query('DELETE FROM sessions WHERE member_id=$1', [id]); await audit(db, req.identity!.id, 'member.status_changed', id, { status: input.status, reason: input.reason }); }); res.json({ message: 'Member updated.' }); });
app.get('/v1/admin/audit', requireIdentity('admin', 'super_admin'), async (req, res) => { const rows = await transaction(async (db) => { await audit(db, req.identity!.id, 'audit.viewed'); return (await db.query('SELECT * FROM audit_events ORDER BY id DESC LIMIT 200')).rows; }); res.json(rows); });
app.use((_req, res) => res.status(404).json({ error: 'Not found.' }));
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => { if (error instanceof z.ZodError)
    return res.status(400).json({ error: error.issues[0]?.message || 'Check the form.' }); if (error instanceof SyntaxError && 'body' in error)
    return res.status(400).json({ error: 'Send a valid JSON request.' }); if (error instanceof HttpError)
    return res.status(error.status).json({ error: error.message }); if ((error as {
    code?: string;
}).code === '23505')
    return res.status(409).json({ error: 'A record with those details already exists.' }); console.error('Request failed:', error instanceof Error ? error.name : 'unknown'); res.status(500).json({ error: 'We could not complete that request. Please try again.' }); });
export default app;
