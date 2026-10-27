import { Router } from 'express';
import { z } from 'zod';
import { pool, transaction, audit } from './db.js';
import { requireIdentity } from './session.js';
import { HttpError } from './http.js';

const date = z.iso.date();
const link = z.string().max(2048).refine(value => {
    try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password; }
    catch { return false; }
}, 'Use an official http or https application URL without embedded credentials.');
const inputSchema = z.object({
    category: z.enum(['scholarships', 'uk', 'nigeria_internships', 'nigeria_jobs']),
    organisation: z.string().trim().min(1).max(160),
    title: z.string().trim().min(1).max(200),
    kind: z.string().trim().min(1).max(100),
    opens: date,
    closes: date.nullable(),
    visa: z.enum(['yes', 'no', 'unknown']),
    notes: z.string().trim().max(2000),
    link,
    last_verified: date.nullable(),
    status: z.enum(['draft', 'published', 'archived']),
    version: z.number().int().positive().optional(),
}).superRefine((value, ctx) => {
    const issue = (path: string, message: string) => ctx.addIssue({ code: 'custom', path: [path], message });
    if (value.closes && value.closes < value.opens) issue('closes', 'Closing date must not precede opening date.');
    if (value.status === 'published' && !value.last_verified) issue('last_verified', 'Verify the official source before publishing.');
    // UTC+14 covers every local calendar date without accepting a later invented verification date.
    const latestToday = new Date(Date.now() + 14 * 3600000).toISOString().slice(0, 10);
    if (value.last_verified && value.last_verified > latestToday) issue('last_verified', 'Verification cannot be in the future.');
    if (value.category !== 'uk' && value.visa !== 'unknown') issue('visa', 'Sponsorship only applies to the UK category.');
});
const publicColumns = "id, category, organisation, title, kind, opens::TEXT, closes::TEXT, visa, notes, link, last_verified::TEXT";
const adminColumns = publicColumns + ', status, version';
export const radar = Router();
radar.get('/', async (_req, res) => {
    res.json((await pool.query(`SELECT ${publicColumns} FROM radar_opportunities WHERE status='published' ORDER BY closes NULLS LAST, id`)).rows);
});
export const radarAdmin = Router();
radarAdmin.use(requireIdentity('admin'));
radarAdmin.get('/', async (_req, res) => {
    res.json((await pool.query(`SELECT ${adminColumns} FROM radar_opportunities ORDER BY updated_at DESC, id`)).rows);
});
radarAdmin.get('/:id', async (req, res) => {
    const id = z.uuid().parse(req.params.id);
    const item = (await pool.query(`SELECT ${adminColumns} FROM radar_opportunities WHERE id=$1`, [id])).rows[0];
    if (!item) throw new HttpError(404, 'Listing not found.');
    res.json(item);
});
radarAdmin.post('/', async (req, res) => {
    const input = inputSchema.parse(req.body);
    const item = await transaction(async db => {
        const values = [input.category, input.organisation, input.title, input.kind, input.opens, input.closes, input.visa, input.notes, input.link, input.last_verified, input.status];
        const row = (await db.query(`INSERT INTO radar_opportunities(category,organisation,title,kind,opens,closes,visa,notes,link,last_verified,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING ${adminColumns}`, values)).rows[0];
        await audit(db, req.identity!.id, 'radar.created', row.id, { listing: row });
        return row;
    });
    res.status(201).json(item);
});
radarAdmin.put('/:id', async (req, res) => {
    const id = z.uuid().parse(req.params.id);
    const input = inputSchema.parse(req.body);
    const item = await transaction(async db => {
        const before = (await db.query(`SELECT ${adminColumns} FROM radar_opportunities WHERE id=$1 FOR UPDATE`, [id])).rows[0];
        if (!before) throw new HttpError(404, 'Listing not found.');
        if (before.version !== input.version) throw new HttpError(409, 'Another editor changed this listing. Reload before saving.');
        const row = (await db.query(`UPDATE radar_opportunities SET category=$2,organisation=$3,title=$4,kind=$5,opens=$6,closes=$7,visa=$8,notes=$9,link=$10,last_verified=$11,status=$12,version=version+1,updated_at=NOW() WHERE id=$1 RETURNING ${adminColumns}`, [id,input.category,input.organisation,input.title,input.kind,input.opens,input.closes,input.visa,input.notes,input.link,input.last_verified,input.status])).rows[0];
        await audit(db, req.identity!.id, 'radar.updated', id, { before, after: row });
        return row;
    });
    res.json(item);
});
