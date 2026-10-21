import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createRouteServer } from '../src/infrastructure/http/routeServer.js';

const servers = [];

after(async () => {
  await Promise.all(servers.map((server) => new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  })));
});

async function startServer(options) {
  const server = createRouteServer(options);
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
  });
  assert.equal(
    new URL(requestedUrl).pathname,
    '/routed-foot/route/v1/foot/-75.5,6.2;-75.51,6.21'
  );
  assert.equal(new URL(requestedUrl).search, '?overview=full&geometries=geojson');
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
      json: async () => {
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
