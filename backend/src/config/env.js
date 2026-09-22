import { config as loadDotenv } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
loadDotenv({ path: resolve(backendRoot, '.env') });
export function getEnv() {
    const databaseUrl = process.env.DATABASE_URL?.trim();
    if (!databaseUrl) {
        throw new Error('Falta DATABASE_URL. Copia backend/.env.example a backend/.env y pega la URI de PostgreSQL.');
    }
    return { databaseUrl };
}
