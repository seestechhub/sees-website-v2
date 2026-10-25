import pg, { type PoolClient } from 'pg';
import { config } from './config.js';
export const pool = new pg.Pool({ connectionString: config.DATABASE_URL, max: 10, connectionTimeoutMillis: 5000 });
export async function transaction<T>(fn: (db: PoolClient) => Promise<T>): Promise<T> { const db = await pool.connect(); try {
    await db.query('BEGIN');
    const result = await fn(db);
    await db.query('COMMIT');
    return result;
}
catch (e) {
    await db.query('ROLLBACK');
    throw e;
}
finally {
    db.release();
} }
export async function audit(db: PoolClient, actor: string | null, action: string, target: string | null = null, metadata: Record<string, unknown> = {}) { await db.query('INSERT INTO audit_events(actor_id,action,target_id,metadata) VALUES($1,$2,$3,$4)', [actor, action, target, metadata]); }
