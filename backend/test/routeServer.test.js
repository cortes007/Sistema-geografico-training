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

test('returns a pedestrian route from the configured private routing engine', async () => {
  let requestedUrl;
  const url = await startServer({
    routingEngineUrl: 'http://127.0.0.1:5000/route/v1/driving',
    fetchRoute: async (routeUrl) => {
      requestedUrl = routeUrl;
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

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    coordinates: [[-75.5, 6.2], [-75.51, 6.21]],
    distanceMeters: 1200,
    durationSeconds: 900,
  });
  assert.equal(
    new URL(requestedUrl).pathname,
    '/route/v1/driving/-75.5,6.2;-75.51,6.21'
  );
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
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /No se configuró/);
});
