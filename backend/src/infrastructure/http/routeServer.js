import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_ROUTING_USER_AGENT, getRouteEnv } from '../../config/env.js';

const MAX_BODY_BYTES = 4096;
const ROUTE_TIMEOUT_MS = 15_000;
const DEFAULT_RATE_LIMIT_MAX = 30;
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_ROUTE_CACHE_TTL_MS = 600_000;
const DEFAULT_ROUTE_CACHE_MAX_ENTRIES = 500;
const PROFILE_PATHS = {
    foot: { prefix: '/routed-foot', osrmProfile: 'foot' },
};

function sendJson(response, status, body) {
    response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify(body));
}

function getClientIp(request, trustProxy) {
    if (trustProxy) {
        const forwardedFor = request.headers['x-forwarded-for'];
        if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
            const forwardedIp = forwardedFor.split(',')[0].trim();
            if (forwardedIp) return forwardedIp;
        }
    }
    return request.socket.remoteAddress || 'unknown';
}

function createRouteCacheKey(profile, origin, destination) {
    const rounded = (coordinate) => Number(coordinate).toFixed(4);
    return `${profile}|${rounded(origin.longitude)},${rounded(origin.latitude)}|${rounded(destination.longitude)},${rounded(destination.latitude)}`;
}

function copyRoute(route) {
    return {
        coordinates: route.coordinates.map((coordinate) => [...coordinate]),
        distanceMeters: route.distanceMeters,
        durationSeconds: route.durationSeconds,
    };
}

function isCoordinate(value) {
    return value
        && Number.isFinite(value.latitude)
        && value.latitude >= -90
        && value.latitude <= 90
        && Number.isFinite(value.longitude)
        && value.longitude >= -180
        && value.longitude <= 180;
}

async function readRequestBody(request) {
    const chunks = [];
    let bodySize = 0;

    for await (const chunk of request) {
        bodySize += chunk.length;
        if (bodySize > MAX_BODY_BYTES) {
            const error = new Error('El cuerpo de la solicitud supera el tamaño permitido.');
            error.status = 413;
            throw error;
        }
        chunks.push(chunk);
    }

    try {
        const payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
            const error = new Error('El cuerpo de la solicitud debe ser un objeto JSON.');
            error.status = 400;
            throw error;
        }
        return payload;
    } catch (error) {
        if (error.status) throw error;
        const parseError = new Error('El cuerpo de la solicitud debe ser JSON válido.');
        parseError.status = 400;
        throw parseError;
    }
}

function buildOsrmUrl(base, profile, origin, destination) {
    const profilePath = PROFILE_PATHS[profile];
    if (!profilePath) {
        throw new Error('El perfil de rutas no está configurado.');
    }

    const baseUrl = new URL(base);
    if (
        !['http:', 'https:'].includes(baseUrl.protocol)
        || baseUrl.username
        || baseUrl.password
        || baseUrl.pathname !== '/'
        || baseUrl.search
        || baseUrl.hash
    ) {
        throw new Error('ROUTING_ENGINE_URL debe ser una URL base HTTP(S) válida sin credenciales ni paths.');
    }

    const coordinates = [
        `${origin.longitude},${origin.latitude}`,
        `${destination.longitude},${destination.latitude}`,
    ].join(';');
    return `${baseUrl.origin}${profilePath.prefix}/route/v1/${profilePath.osrmProfile}/${coordinates}?overview=full&geometries=geojson`;
}

export function createRouteServer({
    host = '127.0.0.1',
    port = 3001,
    routingEngineUrl = '',
    routingUserAgent = DEFAULT_ROUTING_USER_AGENT,
    rateLimitMax = DEFAULT_RATE_LIMIT_MAX,
    rateLimitWindowMs = DEFAULT_RATE_LIMIT_WINDOW_MS,
    trustProxy = false,
    routeCacheTtlMs = DEFAULT_ROUTE_CACHE_TTL_MS,
    routeCacheMaxEntries = DEFAULT_ROUTE_CACHE_MAX_ENTRIES,
    now = Date.now,
    fetchRoute = fetch,
} = {}) {
    const rateLimits = new Map();
    const routeCache = new Map();

    const cleanExpiredEntries = () => {
        const currentTime = now();
        for (const [ip, entry] of rateLimits) {
            if (entry.resetAt <= currentTime) rateLimits.delete(ip);
        }
        for (const [key, entry] of routeCache) {
            if (entry.expiresAt <= currentTime) routeCache.delete(key);
        }
    };

    const server = createServer(async (request, response) => {
        const requestUrl = new URL(request.url || '/', 'http://localhost');
        if (request.method !== 'POST' || requestUrl.pathname !== '/api/routes/foot') {
            sendJson(response, 404, { error: 'Ruta no encontrada.' });
            return;
        }

        cleanExpiredEntries();
        const clientIp = getClientIp(request, trustProxy);
        const currentTime = now();
        let rateLimit = rateLimits.get(clientIp);
        if (!rateLimit || rateLimit.resetAt <= currentTime) {
            rateLimit = { count: 0, resetAt: currentTime + rateLimitWindowMs };
            rateLimits.set(clientIp, rateLimit);
        }
        if (rateLimit.count >= rateLimitMax) {
            const retryAfter = Math.max(1, Math.ceil((rateLimit.resetAt - currentTime) / 1000));
            response.setHeader('Retry-After', String(retryAfter));
            sendJson(response, 429, { error: 'Has superado el límite de solicitudes. Inténtalo de nuevo más tarde.' });
            return;
        }
        rateLimit.count += 1;

        if (!/^application\/json(?:\s*;|$)/i.test(request.headers['content-type'] || '')) {
            sendJson(response, 415, { error: 'El contenido debe ser application/json.' });
            return;
        }

        try {
            const payload = await readRequestBody(request);
            if (!isCoordinate(payload.origin) || !isCoordinate(payload.destination)) {
                sendJson(response, 400, { error: 'Las coordenadas de origen y destino no son válidas.' });
                return;
            }
            if (payload.profile !== 'foot') {
                sendJson(response, 400, { error: 'Solo se admite el perfil peatonal.' });
                return;
            }
            if (!routingEngineUrl) {
                sendJson(response, 503, { error: 'No se configuró el motor de rutas peatonales.' });
                return;
            }

            const cacheKey = createRouteCacheKey(payload.profile, payload.origin, payload.destination);
            const cachedRoute = routeCache.get(cacheKey);
            if (cachedRoute && cachedRoute.expiresAt > now()) {
                sendJson(response, 200, copyRoute(cachedRoute.route));
                return;
            }
            if (cachedRoute) routeCache.delete(cacheKey);

            const engineUrl = buildOsrmUrl(
                routingEngineUrl,
                payload.profile,
                payload.origin,
                payload.destination
            );
            const timeoutSignal = AbortSignal.timeout(ROUTE_TIMEOUT_MS);
            let engineResponse;
            try {
                engineResponse = await fetchRoute(engineUrl, {
                    headers: { 'User-Agent': routingUserAgent },
                    signal: timeoutSignal,
                });
            } catch (error) {
                if (timeoutSignal.aborted || error.name === 'TimeoutError') {
                    sendJson(response, 504, { error: 'El motor de rutas tardó demasiado en responder.' });
                    return;
                }
                throw error;
            }
            if (!engineResponse.ok) {
                sendJson(response, 502, { error: 'El motor de rutas no está disponible.' });
                return;
            }

            let result;
            try {
                result = await engineResponse.json();
            } catch (error) {
                if (timeoutSignal.aborted || error?.name === 'TimeoutError') {
                    sendJson(response, 504, { error: 'El motor de rutas tardó demasiado en responder.' });
                    return;
                }
                sendJson(response, 502, { error: 'El motor de rutas devolvió una respuesta inválida.' });
                return;
            }

            if (result?.code === 'NoRoute') {
                sendJson(response, 404, { error: 'No se encontró una ruta peatonal.' });
                return;
            }
            if (result?.code !== 'Ok') {
                sendJson(response, 502, { error: 'El motor de rutas devolvió una respuesta inválida.' });
                return;
            }

            if (!Array.isArray(result.routes) || result.routes.length === 0) {
                sendJson(response, 502, { error: 'El motor de rutas devolvió una respuesta inválida.' });
                return;
            }

            const route = result.routes[0];
            if (
                !Array.isArray(route?.geometry?.coordinates)
                || route.geometry.coordinates.length < 2
                || !route.geometry.coordinates.every((coordinate) => (
                    Array.isArray(coordinate)
                    && coordinate.length === 2
                    && Number.isFinite(coordinate[0])
                    && coordinate[0] >= -180
                    && coordinate[0] <= 180
                    && Number.isFinite(coordinate[1])
                    && coordinate[1] >= -90
                    && coordinate[1] <= 90
                ))
                || !Number.isFinite(route.distance)
                || !Number.isFinite(route.duration)
            ) {
                sendJson(response, 502, { error: 'El motor de rutas devolvió una respuesta inválida.' });
                return;
            }

            const routeResult = {
                coordinates: route.geometry.coordinates,
                distanceMeters: route.distance,
                durationSeconds: route.duration,
            };
            if (routeCacheTtlMs > 0 && routeCacheMaxEntries > 0) {
                while (routeCache.size >= routeCacheMaxEntries) {
                    routeCache.delete(routeCache.keys().next().value);
                }
                routeCache.set(cacheKey, {
                    route: copyRoute(routeResult),
                    expiresAt: now() + routeCacheTtlMs,
                });
            }
            sendJson(response, 200, copyRoute(routeResult));
        } catch (error) {
            sendJson(response, error.status || 502, {
                error: error.status ? error.message : 'No se pudo consultar el motor de rutas.',
            });
        }
    });

    const cleanupIntervalMs = Math.min(
        rateLimitWindowMs,
        routeCacheTtlMs > 0 ? routeCacheTtlMs : rateLimitWindowMs
    );
    const cleanupTimer = setInterval(cleanExpiredEntries, cleanupIntervalMs);
    cleanupTimer.unref();
    server.on('close', () => clearInterval(cleanupTimer));
    return server;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const {
        host,
        port,
        routingEngineUrl,
        routingUserAgent,
        rateLimitMax,
        rateLimitWindowMs,
        trustProxy,
        routeCacheTtlMs,
        routeCacheMaxEntries,
    } = getRouteEnv();
    const server = createRouteServer({
        host,
        port,
        routingEngineUrl,
        routingUserAgent,
        rateLimitMax,
        rateLimitWindowMs,
        trustProxy,
        routeCacheTtlMs,
        routeCacheMaxEntries,
    });
    server.listen(port, host, () => {
        console.log(`Servicio de rutas disponible en http://${host}:${port}/api/routes/foot`);
    });
}
