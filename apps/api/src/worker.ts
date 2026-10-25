import { setTimeout as sleep } from 'node:timers/promises';
import { pool, transaction, audit } from './db.js';
import { config } from './config.js';
import { decrypt } from './security.js';
export async function tick() {
    await transaction(async (db) => { const { rows } = await db.query("SELECT * FROM content WHERE status='scheduled' AND publish_at<=NOW() FOR UPDATE SKIP LOCKED"); for (const row of rows) {
        await db.query('INSERT INTO content_revisions(content_id,version,snapshot) VALUES($1,$2,$3)', [row.id, row.version, row]);
        await db.query("UPDATE content SET status='published',version=version+1,updated_at=NOW() WHERE id=$1", [row.id]);
        await audit(db, null, 'content.scheduled_published', row.id);
    } });
    await pool.query("UPDATE outbox SET status='uncertain',last_error='Worker interrupted; reconcile before retry' WHERE status='processing' AND locked_at<NOW()-INTERVAL '10 minutes'");
    if (!config.MAIL_WEBHOOK_URL)
        return;
    const job = await transaction(async (db) => { const { rows } = await db.query("SELECT * FROM outbox WHERE status='queued' AND available_at<=NOW() ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1"); if (!rows.length)
        return null; await db.query("UPDATE outbox SET status='processing',attempts=attempts+1,locked_at=NOW() WHERE id=$1", [rows[0].id]); return rows[0]; });
    if (!job)
        return;
    try {
        const payload = decrypt<Record<string, string>>(job.encrypted_payload);
        const result = await fetch(config.MAIL_WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.MAIL_WEBHOOK_SECRET}`, 'Idempotency-Key': job.id }, body: JSON.stringify({ ...payload, id: job.id }), signal: AbortSignal.timeout(15000) });
        if (result.ok) {
            await pool.query("UPDATE outbox SET status='accepted',encrypted_payload='',last_error=NULL WHERE id=$1", [job.id]);
        }
        else {
            await pool.query("UPDATE outbox SET status=$2,last_error=$3 WHERE id=$1", [job.id, 'failed', `Mail adapter rejected request (${result.status})`]);
        }
    }
    catch {
        await pool.query("UPDATE outbox SET status='uncertain',last_error='Delivery acceptance unknown; reconcile with adapter' WHERE id=$1", [job.id]);
    }
}
if (process.env.NODE_ENV !== 'test') {
    let running = true;
    process.on('SIGTERM', () => { running = false; });
    process.on('SIGINT', () => { running = false; });
    while (running) {
        try {
            await tick();
        }
        catch {
            console.error('Worker iteration failed; retained jobs for recovery.');
        }
        await sleep(5000);
    }
    await pool.end();
}
