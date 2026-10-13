import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getRouteEnv } from '../../config/env.js';

const MAX_BODY_BYTES = 4096;
const ROUTE_TIMEOUT_MS = 15_000;

function sendJson(response, status, body) {
    response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify(body));
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

function buildEngineUrl(engineUrl, origin, destination) {
    const baseUrl = new URL(engineUrl);
    if (
        !['http:', 'https:'].includes(baseUrl.protocol)
        || baseUrl.username
        || baseUrl.password
        || baseUrl.search
        || baseUrl.hash
    ) {
        throw new Error('ROUTING_ENGINE_URL debe ser una URL HTTP(S) válida sin credenciales.');
    }

    const coordinates = [
        `${origin.longitude},${origin.latitude}`,
        `${destination.longitude},${destination.latitude}`,
    ].join(';');
    const routeUrl = new URL(`${baseUrl.pathname.replace(/\/$/, '')}/${coordinates}`, baseUrl.origin);
    routeUrl.search = new URLSearchParams({
        overview: 'full',
        geometries: 'geojson',
        steps: 'false',
    }).toString();
    return routeUrl;
}

export function createRouteServer({
    host = '127.0.0.1',
    port = 3001,
    routingEngineUrl = '',
    fetchRoute = fetch,
} = {}) {
    return createServer(async (request, response) => {
        const requestUrl = new URL(request.url || '/', 'http://localhost');
        if (request.method !== 'POST' || requestUrl.pathname !== '/api/routes/foot') {
            sendJson(response, 404, { error: 'Ruta no encontrada.' });
            return;
        }

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

            const engineUrl = buildEngineUrl(routingEngineUrl, payload.origin, payload.destination);
            const engineResponse = await fetchRoute(engineUrl, {
                signal: AbortSignal.timeout(ROUTE_TIMEOUT_MS),
            });
            if (!engineResponse.ok) {
                sendJson(response, 502, { error: 'El motor de rutas no está disponible.' });
                return;
            }

            const result = await engineResponse.json();
            const route = result.routes?.[0];
            if (
                result.code !== 'Ok'
                || !Array.isArray(route?.geometry?.coordinates)
                || route.geometry.coordinates.length < 2
                || !route.geometry.coordinates.every((coordinate) => (
                    Array.isArray(coordinate)
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
                sendJson(response, 404, { error: 'No se encontró una ruta peatonal para este lugar.' });
                return;
            }

            sendJson(response, 200, {
                coordinates: route.geometry.coordinates,
                distanceMeters: route.distance,
                durationSeconds: route.duration,
            });
        } catch (error) {
            sendJson(response, error.status || 502, {
                error: error.status ? error.message : 'No se pudo consultar el motor de rutas.',
            });
        }
    });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const { host, port, routingEngineUrl } = getRouteEnv();
    const server = createRouteServer({ host, port, routingEngineUrl });
    server.listen(port, host, () => {
        console.log(`Servicio de rutas disponible en http://${host}:${port}/api/routes/foot`);
    });
}
