import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { closePool, getPool } from "./pool.js";
const migrationsDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../../migrations');
async function ensureMigrationsTable() {
    const pool = getPool();
    await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}
async function appliedFilenames() {
    const result = await getPool().query('SELECT filename FROM schema_migrations');
    return new Set(result.rows.map((row) => row.filename));
}
async function runMigrations() {
    await ensureMigrationsTable();
    const files = (await readdir(migrationsDir))
        .filter((name) => name.endsWith('.sql'))
        .sort();
    const applied = await appliedFilenames();
    const pending = files.filter((name) => !applied.has(name));
    if (pending.length === 0) {
        console.log('No hay migraciones pendientes.');
        return;
    }
    const client = await getPool().connect();
    try {
        await client.query('BEGIN');
        for (const filename of pending) {
            const sql = await readFile(join(migrationsDir, filename), 'utf8');
            await client.query(sql);
            await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);
            console.log(`Aplicada: ${filename}`);
        }
        await client.query('COMMIT');
    }
    catch (error) {
        await client.query('ROLLBACK');
        throw error;
    }
    finally {
        client.release();
    }
}
try {
    await runMigrations();
}
finally {
    await closePool();
}
