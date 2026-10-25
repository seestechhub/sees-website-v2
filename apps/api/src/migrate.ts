import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { pool, transaction } from './db.js';
// Run explicitly by an operator. Never runs during API startup or deployment.
const dir = fileURLToPath(new URL('../../../database/migrations/', import.meta.url));
await transaction(async (db) => { await db.query('SELECT pg_advisory_xact_lock(20261024)'); await db.query('CREATE TABLE IF NOT EXISTS schema_migrations(name TEXT PRIMARY KEY,applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())'); for (const name of (await readdir(dir)).filter(x => x.endsWith('.sql')).sort()) {
    if ((await db.query('SELECT 1 FROM schema_migrations WHERE name=$1', [name])).rowCount)
        continue;
    await db.query(await readFile(dir + name, 'utf8'));
    await db.query('INSERT INTO schema_migrations(name) VALUES($1)', [name]);
    console.log('Applied', name);
} });
await pool.end();
