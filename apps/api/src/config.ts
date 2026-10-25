import "dotenv/config";
import { z } from "zod";
const schema = z.object({ NODE_ENV: z.enum(["development", "test", "production"]).default("development"), PORT: z.coerce.number().default(4108), DATABASE_URL: z.string().min(1), WEB_ORIGIN: z.url(), ENCRYPTION_KEY: z.string().regex(/^[a-fA-F0-9]{64}$/), MAIL_WEBHOOK_URL: z.url().optional(), MAIL_WEBHOOK_SECRET: z.string().optional(), TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(3).default(0) });
export const config = schema.parse({ ...process.env, MAIL_WEBHOOK_URL: process.env.MAIL_WEBHOOK_URL || undefined });
if (config.NODE_ENV === 'production' && !config.WEB_ORIGIN.startsWith('https://'))
    throw new Error('Production requires HTTPS');
if (config.MAIL_WEBHOOK_URL && !config.MAIL_WEBHOOK_SECRET)
    throw new Error('Mail adapter requires authentication');
if (config.NODE_ENV === 'production' && config.MAIL_WEBHOOK_URL && !config.MAIL_WEBHOOK_URL.startsWith('https://'))
    throw new Error('Production email adapter requires HTTPS');
