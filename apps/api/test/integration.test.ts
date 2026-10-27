import type { Opportunity } from '../../web/src/lib/radar.js';
import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import request from 'supertest';
import * as OTPAuth from 'otpauth';
import app from '../src/app.js';
import { pool } from '../src/db.js';
import { config } from '../src/config.js';
import { validMatric, hashPassword, encrypt, decrypt, digest } from '../src/security.js';
import { tick } from '../src/worker.js';
import { fromLagosInput, toLagosInput } from '../../web/src/lib/time.js';
// This suite is destructive only to an explicitly named local disposable database.
const target = new URL(config.DATABASE_URL);
if (config.NODE_ENV !== 'test' || !['localhost', '127.0.0.1'].includes(target.hostname) || target.pathname !== '/sees_platform_test') {
    throw new Error('Tests require NODE_ENV=test and local database sees_platform_test.');
}
const tables = 'radar_opportunities, subscriptions, outbox, audit_events, content_revisions, content, account_tokens, sessions, rate_windows, members, admins';
const pass = 'A test-only phrase 73!';
const changedPass = 'A different test phrase 91!';
const member = { name: 'Test Member', matric: '290403999', email: 'member@example.test', password: pass, consent: true };
let memberToken = '';
let adminToken = '';
let editorToken = '';
let memberId = '';
let contentId = '';
const mfa = new OTPAuth.TOTP({ secret: new OTPAuth.Secret({ size: 20 }), period: 30, digits: 6 });
const editorMfa = new OTPAuth.TOTP({ secret: new OTPAuth.Secret({ size: 20 }), period: 30, digits: 6 });
const bearer = (value: string) => ({ Authorization: `Bearer ${value}` });
async function emailToken(address: string, path: string) {
    const { rows } = await pool.query('SELECT encrypted_payload FROM outbox ORDER BY created_at DESC');
    for (const row of rows) {
        const payload = decrypt<{
            to: string;
            text: string;
        }>(row.encrypted_payload);
        if (payload.to === address && payload.text.includes(path)) {
            const url = payload.text.match(/http:\/\/localhost:3108\/[^\s]+/)?.[0];
            assert.ok(url);
            return new URL(url).searchParams.get('token')!;
        }
    }
    throw new Error('Expected encrypted outbox message was not created.');
}
before(async () => {
    await pool.query('CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())');
    const dir = new URL('../../../database/migrations/', import.meta.url);
    for (const file of (await readdir(dir)).filter(x => x.endsWith('.sql')).sort()) {
        if ((await pool.query('SELECT 1 FROM schema_migrations WHERE name=$1', [file])).rowCount)
            continue;
        const db = await pool.connect();
        try {
            await db.query('BEGIN');
            await db.query(await readFile(new URL(file, dir), 'utf8'));
            await db.query('INSERT INTO schema_migrations(name) VALUES($1)', [file]);
            await db.query('COMMIT');
        }
        catch (e) {
            await db.query('ROLLBACK');
            throw e;
        }
        finally {
            db.release();
        }
    }
    await pool.query(`TRUNCATE ${tables} RESTART IDENTITY CASCADE`);
});
after(async () => { await pool.query(`TRUNCATE ${tables} RESTART IDENTITY CASCADE`); await pool.end(); });
test('matric policy accepts exactly the requested cohorts, faculty and departments', () => {
    for (const year of ['18', '19', '21', '23', '24', '25', '26', '27', '28', '29']) {
        for (const department of ['03', '08'])
            for (const serial of ['000', '001', '999'])
                assert.equal(validMatric(year + '04' + department + serial), true);
    }
    for (const number of ['200408001', '220408001', '170408001', '300408001', '230508001', '230409001', '23040801', '2304080001', '2304080x1', '２３０４０８００１', '230408001 ', ' 230408001'])
        assert.equal(validMatric(number), false, number);
    assert.equal(validMatric('230408054'), true);
    assert.equal(validMatric('210408001'), true);
});
test('Lagos publication times round trip independently of the server timezone', () => {
    assert.equal(fromLagosInput('2026-10-24T16:30'), '2026-10-24T15:30:00.000Z');
    assert.equal(toLagosInput('2026-10-24T15:30:00.000Z'), '2026-10-24T16:30');
    assert.throws(() => fromLagosInput('not-a-date'));
});
test('registration enforces policy, is non-enumerating, and requires single-use verification', async () => {
    await request(app).post('/v1/auth/register').send({ ...member, matric: '220403999' }).expect(400);
    await request(app).post('/v1/auth/register').send({ ...member, consent: false }).expect(400);
    const first = await request(app).post('/v1/auth/register').send(member).expect(202);
    const duplicate = await request(app).post('/v1/auth/register').send(member).expect(202);
    assert.deepEqual(first.body, duplicate.body);
    assert.equal((await pool.query('SELECT COUNT(*)::INTEGER AS n FROM members')).rows[0].n, 1);
    const row = (await pool.query('SELECT * FROM members')).rows[0];
    memberId = row.id;
    assert.ok(row.password_hash.startsWith('$argon2id$'));
    assert.notEqual(row.password_hash, pass);
    assert.equal((await pool.query('SELECT COUNT(*)::INTEGER AS n FROM subscriptions')).rows[0].n, 0);
    await request(app).post('/v1/auth/login').send({ identifier: member.matric, password: pass }).expect(401);
    const token = await emailToken(member.email, 'verify-email');
    assert.equal((await pool.query('SELECT token_hash FROM account_tokens')).rows[0].token_hash, digest(token));
    await request(app).post('/v1/auth/verify').send({ token }).expect(200);
    await request(app).post('/v1/auth/verify').send({ token }).expect(400);
    memberToken = (await request(app).post('/v1/auth/login').send({ identifier: member.matric, password: pass }).expect(200)).body.token;
    const profile = (await request(app).get('/v1/me').set(bearer(memberToken)).expect(200)).body;
    assert.equal(profile.id, memberId);
    assert.equal(profile.evidence, 'format_validated');
    assert.equal(profile.password_hash, undefined);
    await request(app).get('/v1/admin/members').set(bearer(memberToken)).expect(401);
    await assert.rejects(() => pool.query("INSERT INTO members(matric,email,name,password_hash,consent_version) VALUES('220408001','invalid@example.test','Invalid','hash','test')"), { code: '23514' });
});
test('recovery uses generic responses, expires tokens, and revokes existing sessions', async () => {
    const known = await request(app).post('/v1/auth/forgot-password').send({ matric: member.matric }).expect(202);
    const unknown = await request(app).post('/v1/auth/forgot-password').send({ matric: '290403111' }).expect(202);
    assert.deepEqual(known.body, unknown.body);
    const expired = await emailToken(member.email, 'reset-password');
    await pool.query("UPDATE account_tokens SET expires_at=NOW()-INTERVAL '1 second' WHERE token_hash=$1", [digest(expired)]);
    await request(app).post('/v1/auth/reset-password').send({ token: expired, password: changedPass }).expect(400);
    await request(app).post('/v1/auth/forgot-password').send({ matric: member.matric }).expect(202);
    const token = await emailToken(member.email, 'reset-password');
    await request(app).post('/v1/auth/reset-password').send({ token, password: changedPass }).expect(200);
    await request(app).get('/v1/me').set(bearer(memberToken)).expect(401);
    await request(app).post('/v1/auth/reset-password').send({ token, password: pass }).expect(400);
    await request(app).post('/v1/auth/login').send({ identifier: member.matric, password: pass }).expect(401);
    memberToken = (await request(app).post('/v1/auth/login').send({ identifier: member.matric, password: changedPass }).expect(200)).body.token;
});
test('administrator realm requires MFA, blocks replay, and separates editor permissions', async () => {
    for (const [address, role, secret] of [['admin@example.test', 'super_admin', mfa.secret.base32], ['editor@example.test', 'editor', editorMfa.secret.base32]]) {
        await pool.query('INSERT INTO admins(email,name,password_hash,role,mfa_secret) VALUES($1,$2,$3,$4,$5)', [address, 'Test Admin', await hashPassword(pass), role, encrypt(secret)]);
    }
    const input = { identifier: 'admin@example.test', realm: 'admin', password: pass };
    await request(app).post('/v1/auth/login').send(input).expect(401);
    const code = mfa.generate();
    adminToken = (await request(app).post('/v1/auth/login').send({ ...input, code }).expect(200)).body.token;
    await request(app).post('/v1/auth/login').send({ ...input, code }).expect(401);
    editorToken = (await request(app).post('/v1/auth/login').send({ identifier: 'editor@example.test', realm: 'admin', password: pass, code: editorMfa.generate() }).expect(200)).body.token;
    await request(app).get('/v1/admin/members').set(bearer(editorToken)).expect(403);
    await request(app).get('/v1/admin/audit').set(bearer(editorToken)).expect(403);
    await request(app).get('/v1/admin/members').set(bearer(adminToken)).expect(200);
});
test('protected content never exposes its body or resource URL anonymously', async () => {
    const content = { kind: 'resource', slug: 'test-private-resource', title: 'Test resource', summary: 'Approved public excerpt', body: 'PRIVATE TEST BODY', visibility: 'members', status: 'published', data: { level: 200, course: 'EEE 200', url: 'https://example.test/private-file' } };
    await request(app).post('/v1/admin/content').send(content).expect(401);
    await request(app).post('/v1/admin/content').set(bearer(editorToken)).send({ ...content, visibility: 'public' }).expect(400);
    const created = (await request(app).post('/v1/admin/content').set(bearer(editorToken)).send(content).expect(201)).body;
    contentId = created.id;
    const listing = await request(app).get('/v1/content?kind=resource').expect(200);
    assert.equal(JSON.stringify(listing.body).includes('private-file'), false);
    assert.equal(JSON.stringify(listing.body).includes('PRIVATE TEST BODY'), false);
    const anonymous = (await request(app).get('/v1/content/resource/test-private-resource').expect(200)).body;
    assert.equal(anonymous.locked, true);
    assert.equal(anonymous.body, null);
    assert.deepEqual(anonymous.data, {});
    const permitted = (await request(app).get('/v1/content/resource/test-private-resource').set(bearer(memberToken)).expect(200)).body;
    assert.equal(permitted.body, content.body);
    assert.equal(permitted.data.url, content.data.url);
    await request(app).put('/v1/admin/content/' + contentId).set(bearer(editorToken)).send({ ...content, title: 'Updated test resource', version: 1 }).expect(200);
    await request(app).put('/v1/admin/content/' + contentId).set(bearer(editorToken)).send({ ...content, version: 1 }).expect(409);
    assert.equal((await pool.query('SELECT COUNT(*)::INTEGER AS n FROM content_revisions WHERE content_id=$1', [contentId])).rows[0].n, 1);
});
test('scheduler publishes due content once and never publishes a cancelled schedule', async () => {
    const due = { kind: 'post', slug: 'test-scheduled', title: 'Test scheduled story', body: 'test', visibility: 'public', status: 'scheduled', publish_at: '2020-01-01T00:00:00.000Z', data: {} };
    await request(app).post('/v1/admin/content').set(bearer(editorToken)).send(due).expect(201);
    await request(app).post('/v1/admin/content').set(bearer(editorToken)).send({ ...due, slug: 'test-cancelled', status: 'draft' }).expect(201);
    await request(app).get('/v1/content/post/test-scheduled').expect(404);
    const oldMailCount = (await pool.query('SELECT COUNT(*)::INTEGER AS n FROM outbox')).rows[0].n;
    await tick();
    await tick();
    await request(app).get('/v1/content/post/test-scheduled').expect(200);
    await request(app).get('/v1/content/post/test-cancelled').expect(404);
    assert.equal((await pool.query("SELECT version FROM content WHERE slug='test-scheduled'")).rows[0].version, 2);
    assert.equal((await pool.query('SELECT COUNT(*)::INTEGER AS n FROM outbox')).rows[0].n, oldMailCount, 'Publishing must not trigger a newsletter send');
});

test('RADAR is public, drafts are private, edits are authorized, versioned and audited', async () => {
    const listing = { category: 'scholarships', organisation: 'Integration fixture', title: 'RADAR test only', kind: 'Undergraduate', opens: '2026-01-01', closes: null, visa: 'unknown', notes: '<script>plain text</script>', link: 'https://example.test/apply', last_verified: null, status: 'draft' };
    await request(app).get('/v1/admin/radar').expect(401);
    await request(app).post('/v1/admin/radar').send(listing).expect(401);
    const ordinaryMember = memberToken;
    await request(app).post('/v1/admin/radar').set(bearer(ordinaryMember)).send(listing).expect(401);
    const created = (await request(app).post('/v1/admin/radar').set(bearer(editorToken)).send(listing).expect(201)).body;
    assert.equal(created.opens, '2026-01-01');
    assert.equal(created.version, 1);
    assert.equal((await request(app).get('/v1/radar').expect(200)).body.some((x: Opportunity) => x.id === created.id), false);
    await request(app).get('/v1/admin/radar/' + created.id).expect(401);
    await request(app).put('/v1/admin/radar/' + created.id).send({ ...listing, version: 1 }).expect(401);
    await request(app).put('/v1/admin/radar/' + created.id).set(bearer(editorToken)).send({ ...listing, status: 'published', version: 1 }).expect(400);
    const published = { ...listing, status: 'published', last_verified: '2026-01-01', version: 1 };
    await request(app).put('/v1/admin/radar/' + created.id).set(bearer(editorToken)).send(published).expect(200);
    const publicItem = (await request(app).get('/v1/radar').expect(200)).body.find((x: Opportunity) => x.id === created.id);
    assert.equal(publicItem.title, listing.title);
    assert.equal(publicItem.notes, listing.notes);
    assert.equal(publicItem.last_verified, '2026-01-01');
    assert.equal(publicItem.version, undefined);
    await request(app).put('/v1/admin/radar/' + created.id).set(bearer(editorToken)).send(published).expect(409);
    await request(app).put('/v1/admin/radar/' + created.id).set(bearer(editorToken)).send({ ...published, status: 'archived', version: 2 }).expect(200);
    assert.equal((await request(app).get('/v1/radar').expect(200)).body.some((x: Opportunity) => x.id === created.id), false);
    const events = (await pool.query("SELECT action,metadata FROM audit_events WHERE target_id=$1 ORDER BY created_at", [created.id])).rows;
    assert.deepEqual(events.map(x => x.action), ['radar.created', 'radar.updated', 'radar.updated']);
    assert.equal(events[1].metadata.before.version, 1);
    assert.equal(events[1].metadata.after.version, 2);
});

test('RADAR rejects invalid dates, unsafe links and invalid categories', async () => {
    const listing = { category: 'uk', organisation: 'Integration fixture', title: 'Test only', kind: 'Summer', opens: '2026-01-01', closes: null, visa: 'unknown', notes: '', link: 'https://example.test/apply', last_verified: '2026-01-01', status: 'published' };
    for (const change of [{ opens: '2026-02-30' }, { closes: '2025-12-31' }, { link: 'javascript:alert(1)' }, { link: 'https://user:pass@example.test/' }, { category: 'other' }, { last_verified: '2999-01-01' }, { category: 'scholarships', visa: 'yes' }, { title: '  ' }]) {
        await request(app).post('/v1/admin/radar').set(bearer(editorToken)).send({ ...listing, ...change }).expect(400);
    }
});

test('member deactivation immediately removes access and audit rows reject edits', async () => {
    await request(app).patch('/v1/admin/members/' + memberId).set(bearer(editorToken)).send({ status: 'deactivated', reason: 'Test only' }).expect(403);
    await request(app).patch('/v1/admin/members/' + memberId).set(bearer(adminToken)).send({ status: 'deactivated', reason: 'Test only' }).expect(200);
    await request(app).get('/v1/me').set(bearer(memberToken)).expect(401);
    const denied = await request(app).get('/v1/content/resource/test-private-resource').set(bearer(memberToken)).expect(200);
    assert.equal(denied.body.locked, true);
    await assert.rejects(() => pool.query("UPDATE audit_events SET action='tampered' WHERE id=(SELECT MIN(id) FROM audit_events)"), /append only/);
    await assert.rejects(() => pool.query('DELETE FROM audit_events'), /append only/);
    await pool.query("UPDATE sessions SET last_seen_at=NOW()-INTERVAL '31 minutes' WHERE token_hash=$1", [digest(adminToken)]);
    await request(app).get('/v1/admin/overview').set(bearer(adminToken)).expect(401);
});
test('newsletter is double opt-in; unsubscribe cannot be reversed by a signup request', async () => {
    const email = 'subscriber@example.test';
    await request(app).post('/v1/newsletter/subscribe').send({ email, consent: false }).expect(400);
    await request(app).post('/v1/newsletter/subscribe').send({ email, consent: true }).expect(202);
    assert.equal((await pool.query('SELECT status FROM subscriptions WHERE email=$1', [email])).rows[0].status, 'pending');
    const confirmation = await emailToken(email, 'newsletter/confirm');
    await request(app).post('/v1/newsletter/confirm').send({ token: confirmation }).expect(200);
    await request(app).post('/v1/newsletter/confirm').send({ token: confirmation }).expect(400);
    const unsubscribe = await emailToken(email, 'newsletter/unsubscribe');
    await request(app).post('/v1/newsletter/unsubscribe').send({ token: unsubscribe }).expect(200);
    await request(app).post('/v1/newsletter/unsubscribe').send({ token: unsubscribe }).expect(200);
    await request(app).post('/v1/newsletter/subscribe').send({ email, consent: true }).expect(202);
    assert.equal((await pool.query('SELECT status FROM subscriptions WHERE email=$1', [email])).rows[0].status, 'unsubscribed');
    const reconfirmation = await emailToken(email, 'newsletter/confirm');
    await request(app).post('/v1/newsletter/confirm').send({ token: reconfirmation }).expect(200);
    assert.equal((await pool.query('SELECT status FROM subscriptions WHERE email=$1', [email])).rows[0].status, 'active');
});
test('abusive login attempts are limited and malformed JSON is a client error', async () => {
    for (let i = 0; i < 5; i++)
        await request(app).post('/v1/auth/login').send({ identifier: '290408123', password: pass }).expect(401);
    await request(app).post('/v1/auth/login').send({ identifier: '290408123', password: pass }).expect(429);
    await request(app).post('/v1/auth/login').set('Content-Type', 'application/json').send('{oops').expect(400);
    await request(app).get('/health').expect(200);
    await request(app).get('/ready').expect(200);
});
