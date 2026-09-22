import { Pool } from 'pg';
import { getEnv } from "../../config/env.js";
let pool;
export function getPool() {
    if (pool) {
        return pool;
    }
    const { databaseUrl } = getEnv();
    pool = new Pool({ connectionString: databaseUrl });
    return pool;
}
export async function closePool() {
    if (!pool) {
        return;
    }
    await pool.end();
    pool = undefined;
}
