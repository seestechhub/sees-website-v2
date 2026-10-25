import { randomBytes, createHash, createCipheriv, createDecipheriv } from 'node:crypto';
import argon2 from 'argon2';
import { config } from './config.js';
export const token = () => randomBytes(32).toString('base64url');
export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export const hashPassword = (value: string) => argon2.hash(value, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
export const verifyPassword = (hash: string, value: string) => argon2.verify(hash, value);
export function encrypt(value: unknown) { const iv = randomBytes(12); const c = createCipheriv('aes-256-gcm', Buffer.from(config.ENCRYPTION_KEY, 'hex'), iv); const encrypted = Buffer.concat([c.update(JSON.stringify(value), 'utf8'), c.final()]); return Buffer.concat([iv, c.getAuthTag(), encrypted]).toString('base64'); }
export function decrypt<T>(value: string): T { const b = Buffer.from(value, 'base64'); const d = createDecipheriv('aes-256-gcm', Buffer.from(config.ENCRYPTION_KEY, 'hex'), b.subarray(0, 12)); d.setAuthTag(b.subarray(12, 28)); return JSON.parse(Buffer.concat([d.update(b.subarray(28)), d.final()]).toString('utf8')); }
export const policy = { version: '2026-10-24', years: ['18', '19', '21', '23', '24', '25', '26', '27', '28', '29'], faculty: '04', departments: ['08', '03'] };
export function validMatric(value: string) { return /^[0-9]{9}$/.test(value) && policy.years.includes(value.slice(0, 2)) && value.slice(2, 4) === policy.faculty && policy.departments.includes(value.slice(4, 6)); }
