import { z } from 'zod';
import { validMatric } from './security.js';
export const password = z.string().min(15, 'Use at least 15 characters.').max(128).refine(x => !['passwordpassword', '123456789012345', 'qwertyuiopasdfgh'].includes(x.toLowerCase()), 'Choose a less common passphrase.');
export const email = z.string().trim().toLowerCase().pipe(z.email().max(254));
export const matric = z.string().trim().refine(validMatric, 'Enter an eligible nine-digit SEES matric number.');
export const registration = z.object({ name: z.string().trim().min(2).max(160), email, matric, password, consent: z.literal(true) });
export const kind = z.enum(['post', 'resource', 'executive', 'subbody', 'event', 'page']);
const safeUrl = z.string().max(2048).refine(x => { try {
    const url = new URL(x);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password;
}
catch {
    return false;
} }, 'Use a complete http or https link.');
export const contentSchema = z.object({ kind, slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(140), title: z.string().trim().min(2).max(200), summary: z.string().max(600).default(''), body: z.string().max(50000).default(''), visibility: z.enum(['public', 'members']), status: z.enum(['draft', 'published', 'scheduled', 'archived']), publish_at: z.iso.datetime().nullable().default(null), version: z.number().int().positive().optional(), data: z.object({ level: z.number().int().refine(x => [100, 200, 300, 400, 500].includes(x)).nullable().optional(), course: z.string().max(30).optional(), category: z.string().max(50).optional(), url: safeUrl.optional(), image: safeUrl.optional(), role: z.string().max(100).optional(), session: z.string().max(40).optional(), starts_at: z.iso.datetime().optional(), location: z.string().max(200).optional() }).default({}) }).refine(x => x.status !== 'scheduled' || x.publish_at !== null, 'Choose a scheduled publication date.').refine(x => x.kind !== 'resource' || x.status === 'draft' || !!x.data.url, 'Published resources need a link.');
export const levelResourcePolicy = contentSchema.refine(x => x.kind !== 'resource' || !x.data.level || x.visibility === 'members', 'Level-specific resources must be members only.');
