import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createRouteHandler, createRouteServer } from '../src/infrastructure/http/routeServer.js';

const servers = [];

after(async () => {
  await Promise.all(servers.map((server) => new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  })));
});

async function startServer(options) {
  const server = createRouteServer({ diagnosticsEnabled: false, ...options });
  servers.push(server);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const { port } = server.address();
  return `http://127.0.0.1:${port}/api/routes/foot`;
}

const requestBody = {
  origin: { latitude: 6.2, longitude: -75.5 },
  destination: { latitude: 6.21, longitude: -75.51 },
  profile: 'foot',
};

async function requestRoute(url, body = requestBody, headers = {}) {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

function invokeHandler(handler, request) {
  return new Promise((resolve, reject) => {
    const response = {
      status: 200,
      headers: {},
      setHeader(name, value) {
        this.headers[name] = value;
      },
      writeHead(status, headers) {
        this.status = status;
        Object.assign(this.headers, headers);
      },
      end(body) {
        resolve({ status: this.status, headers: this.headers, body: JSON.parse(body) });
      },
    };
    Promise.resolve(handler(request, response)).catch(reject);
  });
}

function successResponse(distance = 1200) {
  return Response.json({
    code: 'Ok',
    routes: [{
      geometry: { coordinates: [[-75.5, 6.2], [-75.51, 6.21]] },
      distance,
      duration: 900,
    }],
  });
}

test('accepts a pre-parsed request body from a serverless runtime', async () => {
  const handler = createRouteHandler({
    routingEngineUrl: 'https://routing.openstreetmap.de',
    diagnosticsEnabled: false,
    fetchRoute: async () => successResponse(),
  });

  const response = await invokeHandler(handler, {
    method: 'POST',
    url: '/api/routes/foot',
    headers: { 'content-type': 'application/json' },
    socket: { remoteAddress: '127.0.0.1' },
    body: requestBody,
  });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    coordinates: [[-75.5, 6.2], [-75.51, 6.21]],
    distanceMeters: 1200,
    durationSeconds: 900,
    steps: [],
  });
});

test('returns a pedestrian route from the configured OSRM-compatible routing engine', async () => {
  let requestedUrl;
  let requestedOptions;
  const url = await startServer({
    routingEngineUrl: 'https://routing.openstreetmap.de',
    fetchRoute: async (routeUrl, options) => {
      requestedUrl = routeUrl;
      requestedOptions = options;
      return Response.json({
        code: 'Ok',
        routes: [{
          geometry: { coordinates: [[-75.5, 6.2], [-75.51, 6.21]] },
          distance: 1200,
          duration: 900,
          legs: [{
            steps: [{
              distance: 1200,
              duration: 900,
              name: 'Avenida Regional',
              maneuver: { type: 'depart', location: [-75.5, 6.2] },
            }],
          }],
        }],
      });
    },
  });

  const response = await requestRoute(url);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    coordinates: [[-75.5, 6.2], [-75.51, 6.21]],
    distanceMeters: 1200,
    durationSeconds: 900,
    steps: [{
      instruction: 'Inicia el recorrido por Avenida Regional',
      streetName: 'Avenida Regional',
      distanceMeters: 1200,
      durationSeconds: 900,
      maneuverType: 'depart',
      modifier: null,
      location: [-75.5, 6.2],
    }],
  });
  assert.equal(
    new URL(requestedUrl).pathname,
    '/routed-foot/route/v1/foot/-75.5,6.2;-75.51,6.21'
  );
  assert.equal(new URL(requestedUrl).search, '?overview=full&geometries=geojson&steps=true');
  assert.equal(requestedOptions.headers['User-Agent'], 'Geoportal-Valle-de-Aburra/1.0');
});

test('rejects invalid coordinates without calling the routing engine', async () => {
  let routingRequested = false;
  const url = await startServer({
    routingEngineUrl: 'http://127.0.0.1:5000/route/v1/driving',
    fetchRoute: async () => {
      routingRequested = true;
      return Response.json({});
    },
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...requestBody,
      origin: { latitude: 100, longitude: -75.5 },
    }),
  });

  assert.equal(response.status, 400);
  assert.equal(routingRequested, false);
});

test('reports an unavailable routing engine when it is not configured', async () => {
  const url = await startServer();
  const response = await requestRoute(url);

  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /No se configuró/);
});

test('returns 404 when the routing engine reports NoRoute', async () => {
  const url = await startServer({
    routingEngineUrl: 'https://routing.openstreetmap.de',
    fetchRoute: async () => Response.json({ code: 'NoRoute', routes: [] }),
  });

  const response = await requestRoute(url);

  assert.equal(response.status, 404);
  assert.equal((await response.json()).error, 'No se encontró una ruta peatonal.');
});

test('returns 502 for a non-success response from the routing engine without forwarding its body', async () => {
  const url = await startServer({
    routingEngineUrl: 'https://routing.openstreetmap.de',
    fetchRoute: async () => new Response('internal engine details', { status: 500 }),
  });

  const response = await requestRoute(url);
  const responseBody = await response.text();

  assert.equal(response.status, 502);
  assert.doesNotMatch(responseBody, /internal engine details/);
  assert.match(responseBody, /El motor de rutas no está disponible/);
});

test('logs engine status, response body, and a URL with coordinates redacted in development', async () => {
  const logEntries = [];
  const url = await startServer({
    routingEngineUrl: 'https://routing.openstreetmap.de',
    diagnosticsEnabled: true,
    logger: {
      info: (...entry) => logEntries.push(entry),
      error: (...entry) => logEntries.push(entry),
    },
    fetchRoute: async () => new Response('upstream diagnostic body', { status: 500 }),
  });

  const response = await requestRoute(url);

  assert.equal(response.status, 502);
  assert.equal(logEntries.length, 1);
  assert.deepEqual(logEntries[0][1], {
    status: 500,
    url: 'https://routing.openstreetmap.de/routed-foot/route/v1/foot/[coordenadas]?overview=full&geometries=geojson&steps=true',
    body: 'upstream diagnostic body',
  });
  assert.doesNotMatch(logEntries[0][1].url, /-75\.5|6\.2/);
});

test('returns 504 when the routing engine request times out', async () => {
  const url = await startServer({
    routingEngineUrl: 'https://routing.openstreetmap.de',
    fetchRoute: async () => {
      throw Object.assign(new Error('request timed out'), { name: 'TimeoutError' });
    },
  });

  const response = await requestRoute(url);

  assert.equal(response.status, 504);
  assert.match((await response.json()).error, /tardó demasiado/);
});

test('returns 504 when the routing engine response body times out', async () => {
  const url = await startServer({
    routingEngineUrl: 'https://routing.openstreetmap.de',
    fetchRoute: async () => ({
      ok: true,
      text: async () => {
        throw Object.assign(new Error('response body timed out'), { name: 'TimeoutError' });
      },
    }),
  });

  const response = await requestRoute(url);

  assert.equal(response.status, 504);
  assert.match((await response.json()).error, /tardó demasiado/);
});

test('returns 502 when the routing engine returns invalid JSON', async () => {
  const url = await startServer({
    routingEngineUrl: 'https://routing.openstreetmap.de',
    fetchRoute: async () => new Response('not json'),
  });

  const response = await requestRoute(url);

  assert.equal(response.status, 502);
  assert.match((await response.json()).error, /respuesta inválida/);
});

test('returns 502 when the routing engine returns empty route geometry', async () => {
  const url = await startServer({
    routingEngineUrl: 'https://routing.openstreetmap.de',
    fetchRoute: async () => Response.json({
      code: 'Ok',
      routes: [{
        geometry: { coordinates: [] },
        distance: 1200,
        duration: 900,
      }],
    }),
  });

  const response = await requestRoute(url);

  assert.equal(response.status, 502);
  assert.match((await response.json()).error, /respuesta inválida/);
});

test('rate limits requests by client IP and includes Retry-After', async () => {
  const url = await startServer({
    routingEngineUrl: 'https://routing.openstreetmap.de',
    rateLimitMax: 1,
    fetchRoute: async () => successResponse(),
  });

  assert.equal((await requestRoute(url)).status, 200);
  const limitedResponse = await requestRoute(url);

  assert.equal(limitedResponse.status, 429);
  assert.match(limitedResponse.headers.get('Retry-After'), /^\d+$/);
  assert.match((await limitedResponse.json()).error, /límite de solicitudes/);
});

test('resets the rate limit counter after its fixed window', async () => {
  let currentTime = 1000;
  let routeCalls = 0;
  const url = await startServer({
    routingEngineUrl: 'https://routing.openstreetmap.de',
    rateLimitMax: 1,
    rateLimitWindowMs: 100,
    routeCacheTtlMs: 0,
    now: () => currentTime,
    fetchRoute: async () => {
      routeCalls += 1;
      return successResponse();
    },
  });

  assert.equal((await requestRoute(url)).status, 200);
  assert.equal((await requestRoute(url)).status, 429);
  currentTime = 1100;
  assert.equal((await requestRoute(url)).status, 200);
  assert.equal(routeCalls, 2);
});

test('uses the route cache for repeated coordinates', async () => {
  let routeCalls = 0;
  const url = await startServer({
    routingEngineUrl: 'https://routing.openstreetmap.de',
    fetchRoute: async () => {
      routeCalls += 1;
      return successResponse();
    },
  });

  assert.equal((await requestRoute(url)).status, 200);
  assert.equal((await requestRoute(url)).status, 200);
  assert.equal(routeCalls, 1);
});

test('does not share cached routes for different coordinates', async () => {
  let routeCalls = 0;
  const url = await startServer({
    routingEngineUrl: 'https://routing.openstreetmap.de',
    fetchRoute: async () => {
      routeCalls += 1;
      return successResponse();
    },
  });
  const otherCoordinates = {
    ...requestBody,
    destination: { ...requestBody.destination, longitude: -75.52 },
  };

  assert.equal((await requestRoute(url)).status, 200);
  assert.equal((await requestRoute(url, otherCoordinates)).status, 200);
  assert.equal(routeCalls, 2);
});

test('does not cache failed engine responses', async () => {
  let routeCalls = 0;
  const url = await startServer({
    routingEngineUrl: 'https://routing.openstreetmap.de',
    fetchRoute: async () => {
      routeCalls += 1;
      return routeCalls === 1
        ? new Response('engine error', { status: 500 })
        : successResponse();
    },
  });

  assert.equal((await requestRoute(url)).status, 502);
  assert.equal((await requestRoute(url)).status, 200);
  assert.equal(routeCalls, 2);
});

test('expires successful routes from the cache after its TTL', async () => {
  let currentTime = 1000;
  let routeCalls = 0;
  const url = await startServer({
    routingEngineUrl: 'https://routing.openstreetmap.de',
    routeCacheTtlMs: 40,
    now: () => currentTime,
    fetchRoute: async () => {
      routeCalls += 1;
      return successResponse();
    },
  });

  assert.equal((await requestRoute(url)).status, 200);
  assert.equal((await requestRoute(url)).status, 200);
  assert.equal(routeCalls, 1);
  currentTime = 1040;
  assert.equal((await requestRoute(url)).status, 200);
  assert.equal(routeCalls, 2);
});

test('ignores X-Forwarded-For unless proxy trust is enabled', async () => {
  const url = await startServer({
    routingEngineUrl: 'https://routing.openstreetmap.de',
    rateLimitMax: 1,
    fetchRoute: async () => successResponse(),
  });

  assert.equal((await requestRoute(url, requestBody, { 'X-Forwarded-For': '198.51.100.1' })).status, 200);
  assert.equal((await requestRoute(url, requestBody, { 'X-Forwarded-For': '203.0.113.8' })).status, 429);
});

test('evicts the least recently used (LRU) route when routeCacheMaxEntries is reached', async () => {
  let routeCalls = 0;
  const url = await startServer({
    routingEngineUrl: 'https://routing.openstreetmap.de',
    routeCacheMaxEntries: 2,
    fetchRoute: async () => {
      routeCalls += 1;
      return successResponse();
    },
  });

  const routeA = requestBody;
  const routeB = {
    ...requestBody,
    destination: { ...requestBody.destination, longitude: -75.52 },
  };
  const routeC = {
    ...requestBody,
    destination: { ...requestBody.destination, longitude: -75.53 },
  };

  assert.equal((await requestRoute(url, routeA)).status, 200);
  assert.equal((await requestRoute(url, routeB)).status, 200);
  assert.equal(routeCalls, 2);

  // Accessing routeA promotes it as most recently used; routeB becomes LRU
  assert.equal((await requestRoute(url, routeA)).status, 200);
  assert.equal(routeCalls, 2);

  // Inserting routeC with maxEntries=2 must evict routeB and keep routeA
  assert.equal((await requestRoute(url, routeC)).status, 200);
  assert.equal(routeCalls, 3);

  // routeA should still be cached (no new fetch)
  assert.equal((await requestRoute(url, routeA)).status, 200);
  assert.equal(routeCalls, 3);

  // routeB was evicted so requesting it triggers a new fetch
  assert.equal((await requestRoute(url, routeB)).status, 200);
  assert.equal(routeCalls, 4);
});

test('supports bicycle profile on /api/routes/bike and /api/routes with steps=true', async () => {
  const requestedUrls = [];
  const serverUrl = await startServer({
    routingEngineUrl: 'https://routing.openstreetmap.de',
    fetchRoute: async (routeUrl) => {
      requestedUrls.push(new URL(routeUrl).pathname + new URL(routeUrl).search);
      return Response.json({
        code: 'Ok',
        routes: [{
          geometry: { coordinates: [[-75.5, 6.2], [-75.51, 6.21]] },
          distance: 2450,
          duration: 540,
          legs: [{
            steps: [{
              distance: 2450,
              duration: 540,
              name: 'Ciclorruta Avenida El Poblado',
              maneuver: { type: 'depart', location: [-75.5, 6.2] },
            }],
          }],
        }],
      });
    },
  });

  const bikeUrl = serverUrl.replace('/api/routes/foot', '/api/routes/bike');
  const bikeResponse = await requestRoute(bikeUrl, {
    ...requestBody,
    profile: 'bike',
  });

  assert.equal(bikeResponse.status, 200);
  const bikePayload = await bikeResponse.json();
  assert.equal(bikePayload.distanceMeters, 2450);
  assert.equal(bikePayload.steps.length, 1);
  assert.equal(
    requestedUrls[0],
    '/routed-bike/route/v1/bike/-75.5,6.2;-75.51,6.21?overview=full&geometries=geojson&steps=true'
  );

  // Unified /api/routes also routes foot without hitting bike cache
  const unifiedUrl = serverUrl.replace('/api/routes/foot', '/api/routes');
  const footResponse = await requestRoute(unifiedUrl, {
    ...requestBody,
    profile: 'foot',
  });
  assert.equal(footResponse.status, 200);
  assert.equal(requestedUrls.length, 2);
  assert.match(requestedUrls[1], /^\/routed-foot\/route\/v1\/foot\//);
});

test('rejects unsupported profiles or profile mismatches with endpoint path', async () => {
  const url = await startServer({
    routingEngineUrl: 'https://routing.openstreetmap.de',
    fetchRoute: async () => successResponse(),
  });

  const mismatchResponse = await requestRoute(url, { ...requestBody, profile: 'bike' });
  assert.equal(mismatchResponse.status, 400);

  const unsupportedResponse = await requestRoute(
    url.replace('/api/routes/foot', '/api/routes'),
    { ...requestBody, profile: 'car' }
  );
  assert.equal(unsupportedResponse.status, 400);
});

test('returns bicycle-specific 404 message on NoRoute and isolates cached steps from mutation', async () => {
  let callCount = 0;
  const handler = createRouteHandler({
    routingEngineUrl: 'https://routing.openstreetmap.de',
    diagnosticsEnabled: false,
    fetchRoute: async () => {
      callCount += 1;
      if (callCount === 1) {
        return Response.json({ code: 'NoRoute', routes: [] });
      }
      return Response.json({
        code: 'Ok',
        routes: [{
          geometry: { coordinates: [[-75.5, 6.2], [-75.51, 6.21]] },
          distance: 1500,
          duration: 360,
          legs: [{
            steps: [{
              distance: 1500,
              duration: 360,
              name: 'Ciclovía',
              maneuver: { type: 'depart', location: [-75.5, 6.2] },
            }],
          }],
        }],
      });
    },
  });

  const notFound = await invokeHandler(handler, {
    method: 'POST',
    url: '/api/routes/bike',
    headers: { 'content-type': 'application/json' },
    socket: { remoteAddress: '127.0.0.1' },
    body: { ...requestBody, profile: 'bike' },
  });
  assert.equal(notFound.status, 404);
  assert.equal(notFound.body.error, 'No se encontró una ruta en bicicleta.');

  const ok = await invokeHandler(handler, {
    method: 'POST',
    url: '/api/routes/bike',
    headers: { 'content-type': 'application/json' },
    socket: { remoteAddress: '127.0.0.1' },
    body: {
      origin: { latitude: 6.22, longitude: -75.55 },
      destination: { latitude: 6.23, longitude: -75.56 },
      profile: 'bike',
    },
  });
  assert.equal(ok.status, 200);
  ok.body.steps[0].location[0] = 0;

  const cached = await invokeHandler(handler, {
    method: 'POST',
    url: '/api/routes/bike',
    headers: { 'content-type': 'application/json' },
    socket: { remoteAddress: '127.0.0.1' },
    body: {
      origin: { latitude: 6.22, longitude: -75.55 },
      destination: { latitude: 6.23, longitude: -75.56 },
      profile: 'bike',
    },
  });
  assert.equal(cached.body.steps[0].location[0], -75.5);
});
