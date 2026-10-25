import type { Request, Response, NextFunction } from 'express';
import { pool } from './db.js';
import { digest } from './security.js';
export type Identity = {
    id: string;
    name: string;
    email: string;
    realm: 'member' | 'admin';
    role?: 'editor' | 'super_admin';
    matric?: string;
    level?: number | null;
    evidence?: string;
};
declare global {
    namespace Express {
        interface Request {
            identity?: Identity;
            sessionHash?: string;
        }
    }
}
export async function loadIdentity(req: Request, _res: Response, next: NextFunction) { const bearer = req.get('authorization'); if (bearer?.startsWith('Bearer ')) {
    const h = digest(bearer.slice(7));
    const result = await pool.query(`SELECT s.*,m.name AS member_name,m.email AS member_email,m.matric,m.level,m.evidence,m.status,m.verified_at,a.name AS admin_name,a.email AS admin_email,a.role,a.enabled FROM sessions s LEFT JOIN members m ON s.member_id=m.id LEFT JOIN admins a ON s.admin_id=a.id WHERE s.token_hash=$1 AND s.expires_at>NOW()`, [h]);
    const row = result.rows[0];
    if (row?.member_id && row.status === 'active' && row.verified_at)
        req.identity = { id: row.member_id, name: row.member_name, email: row.member_email, matric: row.matric, level: row.level, evidence: row.evidence, realm: 'member' };
    if (row?.admin_id && row.enabled && Date.now() - new Date(row.last_seen_at).getTime() < 30 * 60 * 1000) {
        req.identity = { id: row.admin_id, name: row.admin_name, email: row.admin_email, role: row.role, realm: 'admin' };
        await pool.query('UPDATE sessions SET last_seen_at=NOW() WHERE token_hash=$1', [h]);
    }
    if (req.identity)
        req.sessionHash = h;
} next(); }
export function requireIdentity(realm: 'member' | 'admin', role?: string) { return (req: Request, res: Response, next: NextFunction) => { if (req.identity?.realm !== realm)
    return res.status(401).json({ error: 'Please sign in.' }); if (role && req.identity.role !== role)
    return res.status(403).json({ error: 'Access denied.' }); next(); }; }
