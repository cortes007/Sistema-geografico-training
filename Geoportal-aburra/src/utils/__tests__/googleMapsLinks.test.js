import { describe, expect, it } from 'vitest';
import { buildGoogleMapsDirectionsUrl } from '../googleMapsLinks';

describe('googleMapsLinks - buildGoogleMapsDirectionsUrl', () => {
  const origin = { latitude: 6.244203, longitude: -75.581211 };
  const destination = { latitude: 6.256812, longitude: -75.590145 };

  it('builds a deep link with origin, destination, and walking travelmode', () => {
    const url = buildGoogleMapsDirectionsUrl({ origin, destination, profile: 'foot' });
    const parsed = new URL(url);

    expect(`${parsed.origin}${parsed.pathname}`).toBe('https://www.google.com/maps/dir/');
    expect(parsed.searchParams.get('api')).toBe('1');
    expect(parsed.searchParams.get('origin')).toBe('6.244203,-75.581211');
    expect(parsed.searchParams.get('destination')).toBe('6.256812,-75.590145');
    expect(parsed.searchParams.get('travelmode')).toBe('walking');
  });

  it('uses bicycling travelmode when profile is bike', () => {
    const url = buildGoogleMapsDirectionsUrl({ origin, destination, profile: 'bike' });
    const parsed = new URL(url);

    expect(parsed.searchParams.get('travelmode')).toBe('bicycling');
    expect(parsed.searchParams.get('origin')).toBe('6.244203,-75.581211');
    expect(parsed.searchParams.get('destination')).toBe('6.256812,-75.590145');
  });

  it('omits origin when user location is unavailable so Google Maps uses device location', () => {
    const url = buildGoogleMapsDirectionsUrl({ origin: null, destination, profile: 'bike' });
    const parsed = new URL(url);

    expect(parsed.searchParams.get('api')).toBe('1');
    expect(parsed.searchParams.has('origin')).toBe(false);
    expect(parsed.searchParams.get('destination')).toBe('6.256812,-75.590145');
    expect(parsed.searchParams.get('travelmode')).toBe('bicycling');
  });

  it('returns empty string when destination coordinates are missing or invalid', () => {
    expect(buildGoogleMapsDirectionsUrl({ origin, destination: null })).toBe('');
    expect(
      buildGoogleMapsDirectionsUrl({
        origin,
        destination: { latitude: 120, longitude: -75.5 },
      })
    ).toBe('');
  });
});
