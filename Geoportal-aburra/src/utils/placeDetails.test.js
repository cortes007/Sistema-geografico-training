import test from 'node:test';
import assert from 'node:assert/strict';

import { extractPlaceData, buildPlaceImageQuery, buildFallbackPlaceImage } from './placeDetails.js';

test('extractPlaceData normalizes GeoJSON feature properties', () => {
  const feature = {
    getProperties: () => ({
      nombre: 'Parque Calistenia El Poblado',
      tipo: 'parque de calistenia',
    }),
    getGeometry: () => ({
      getType: () => 'Point',
      getCoordinates: () => [-75.5678, 6.2134],
    }),
  };

  const place = extractPlaceData(feature);

  assert.equal(place.name, 'Parque Calistenia El Poblado');
  assert.equal(place.type, 'parque de calistenia');
  assert.deepEqual(place.coordinates, [-75.5678, 6.2134]);
});

test('buildPlaceImageQuery uses a stable category label for the place image', () => {
  const place = {
    name: 'Gimnasio Medellín Norte',
    type: 'gimnasio',
    coordinates: [-75.5812, 6.2291],
  };

  const query = buildPlaceImageQuery(place);

  assert.match(query, /gimnasio/i);
});

test('fallback place image uses the geoportal brand gradient', () => {
  const image = buildFallbackPlaceImage({ name: 'Parque de calistenia' });
  const svg = decodeURIComponent(image.split(',')[1]);

  assert.match(svg, /stop-color="#14301F"/);
  assert.match(svg, /stop-color="#7C3AED"/);
});
