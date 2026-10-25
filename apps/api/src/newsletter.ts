import { Router } from 'express';
import { z } from 'zod';
import { transaction, audit } from './db.js';
import { config } from './config.js';
import { email } from './schemas.js';
import { token, digest, encrypt } from './security.js';
import { HttpError, limit } from './http.js';
export const newsletter = Router();
const tokenSchema = z.object({ token: z.string().min(20).max(200) });
newsletter.post('/subscribe', async (req, res) => {
    const input = z.object({ email, consent: z.literal(true) }).parse(req.body);
    await limit(req, 'newsletter', input.email, 3);
    await transaction(async (db) => {
        // Serialize creation and resubscription for this email, including the first insert.
        await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [input.email]);
        const existing = (await db.query('SELECT * FROM subscriptions WHERE email=$1 FOR UPDATE', [input.email])).rows[0];
        if (existing?.status === 'active')
            return;
        const confirm = token();
        const unsubscribe = token();
        const { rows } = await db.query(`
      INSERT INTO subscriptions(email, consent_version, confirm_hash, confirm_expires_at, unsubscribe_hash)
      VALUES($1, '2026-10-24', $2, NOW() + INTERVAL '24 hours', $3)
      ON CONFLICT(email) DO UPDATE SET
        confirm_hash=$2, confirm_expires_at=NOW() + INTERVAL '24 hours',
        requested_at=NOW(), consent_version='2026-10-24'
      RETURNING id`, [input.email, digest(confirm), digest(unsubscribe)]);
        // A prior unsubscribe stays suppressed until this new token is confirmed.
        await db.query('INSERT INTO outbox(encrypted_payload) VALUES($1)', [encrypt({
                to: input.email,
                subject: 'Confirm your SEES newsletter subscription',
                text: `Confirm your subscription: ${config.WEB_ORIGIN}/newsletter/confirm?token=${confirm}\nThis link expires in 24 hours. If you did not request this, ignore it.`
            })]);
        await audit(db, null, 'subscription.requested', rows[0].id);
    });
    res.status(202).json({ message: 'Check your email to confirm your subscription. If you already subscribe, you’re all set.' });
});
newsletter.post('/confirm', async (req, res) => {
    const { token: raw } = tokenSchema.parse(req.body);
    await transaction(async (db) => {
        const unsubscribe = token();
        const { rows } = await db.query(`
      UPDATE subscriptions SET status='active', confirmed_at=NOW(), unsubscribed_at=NULL,
        confirm_hash=NULL, confirm_expires_at=NULL, unsubscribe_hash=$2
      WHERE confirm_hash=$1 AND confirm_expires_at>NOW() RETURNING id, email`, [digest(raw), digest(unsubscribe)]);
        if (!rows.length)
            throw new HttpError(400, 'This confirmation link has expired or was already used.');
        await db.query('INSERT INTO outbox(encrypted_payload) VALUES($1)', [encrypt({
                to: rows[0].email, subject: 'You’re subscribed to SEES',
                text: `Thanks for joining our newsletter. You can unsubscribe without signing in: ${config.WEB_ORIGIN}/newsletter/unsubscribe?token=${unsubscribe}`
            })]);
        await audit(db, null, 'subscription.confirmed', rows[0].id);
    });
    res.json({ message: 'You’re subscribed. Thanks for being part of the community.' });
});
newsletter.post('/unsubscribe', async (req, res) => {
    const { token: raw } = tokenSchema.parse(req.body);
    await transaction(async (db) => {
        const { rows } = await db.query(`
      UPDATE subscriptions SET status='unsubscribed', unsubscribed_at=NOW(),
        confirm_hash=NULL, confirm_expires_at=NULL
      WHERE unsubscribe_hash=$1 RETURNING id`, [digest(raw)]);
        if (rows.length)
            await audit(db, null, 'subscription.unsubscribed', rows[0].id);
    });
    // Idempotent and intentionally does not reveal whether an address exists.
    res.json({ message: 'Your unsubscribe request is complete. Account security emails are separate.' });
});
