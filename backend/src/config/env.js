import { config as loadDotenv } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
loadDotenv({ path: resolve(backendRoot, '.env') });
export const DEFAULT_ROUTING_USER_AGENT = 'Geoportal-Valle-de-Aburra/1.0';

function getIntegerEnv(name, defaultValue, minimum) {
    const value = process.env[name]?.trim();
    if (!value) return defaultValue;

    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < minimum) {
        throw new Error(`${name} debe ser un entero mayor o igual a ${minimum}.`);
    }
    return parsed;
}

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
        routingUserAgent: process.env.ROUTING_USER_AGENT?.trim() || DEFAULT_ROUTING_USER_AGENT,
        rateLimitMax: getIntegerEnv('RATE_LIMIT_MAX', 30, 1),
        rateLimitWindowMs: getIntegerEnv('RATE_LIMIT_WINDOW_MS', 60_000, 1),
        trustProxy: process.env.TRUST_PROXY?.trim().toLowerCase() === 'true',
        routeCacheTtlMs: getIntegerEnv('ROUTE_CACHE_TTL_MS', 600_000, 0),
        routeCacheMaxEntries: getIntegerEnv('ROUTE_CACHE_MAX_ENTRIES', 500, 0),
    };
}
