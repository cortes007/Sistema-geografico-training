import { describe, expect, it } from 'vitest';
import { extractPlaceData, buildPlaceImageQuery, buildFallbackPlaceImage } from './placeDetails.js';

describe('placeDetails utils', () => {
  it('extractPlaceData normalizes GeoJSON feature properties', () => {
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

    expect(place.name).toBe('Parque Calistenia El Poblado');
    expect(place.type).toBe('parque de calistenia');
    expect(place.coordinates).toEqual([-75.5678, 6.2134]);
  });

  it('buildPlaceImageQuery uses a stable category label for the place image', () => {
    const place = {
      name: 'Gimnasio Medellín Norte',
      type: 'gimnasio',
      coordinates: [-75.5812, 6.2291],
    };

    const query = buildPlaceImageQuery(place);

    expect(query).toMatch(/gimnasio/i);
  });

  it('fallback place image uses the geoportal brand gradient', () => {
    const image = buildFallbackPlaceImage({ name: 'Parque de calistenia' });
    const svg = decodeURIComponent(image.split(',')[1]);

    expect(svg).toMatch(/stop-color="#14301F"/);
    expect(svg).toMatch(/stop-color="#7C3AED"/);
  });
});
