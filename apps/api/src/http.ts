import type { Request } from 'express';
import { pool } from './db.js';
import { digest } from './security.js';
export class HttpError extends Error {
    constructor(public status: number, message: string) { super(message); }
}
export async function limit(_req: Request, scope: string, identity: string, max = 10) {
    const key = digest(`${scope}:${identity}`);
    const { rows } = await pool.query(`
    INSERT INTO rate_windows(key_hash, attempts, expires_at)
    VALUES ($1, 1, NOW() + INTERVAL '15 minutes')
    ON CONFLICT(key_hash) DO UPDATE SET
      attempts = CASE WHEN rate_windows.expires_at < NOW() THEN 1 ELSE rate_windows.attempts + 1 END,
      expires_at = CASE WHEN rate_windows.expires_at < NOW() THEN NOW() + INTERVAL '15 minutes' ELSE rate_windows.expires_at END
    RETURNING attempts`, [key]);
    if (rows[0].attempts > max)
        throw new HttpError(429, 'Too many attempts. Please try again in 15 minutes.');
}
