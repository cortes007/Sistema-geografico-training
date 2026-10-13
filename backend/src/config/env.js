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

export function getRouteEnv() {
    const port = Number(process.env.ROUTING_API_PORT || 3001);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error('ROUTING_API_PORT debe ser un puerto entre 1 y 65535.');
    }

    return {
        host: process.env.ROUTING_API_HOST?.trim() || '127.0.0.1',
        port,
        routingEngineUrl: process.env.ROUTING_ENGINE_URL?.trim() || '',
    };
}
