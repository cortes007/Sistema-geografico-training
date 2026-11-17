import { describe, expect, it, vi } from 'vitest';
import {
  buildRouteState,
  formatStepDistance,
  resolveStepCenterLonLat,
} from '../useDirections';

describe('useDirections pure helpers', () => {
  it('builds multimodal route state preserving profile, steps, and endpoints', () => {
    const result = {
      coordinates: [[-75.59, 6.25], [-75.58, 6.24]],
      distanceMeters: 1850,
      durationSeconds: 420,
      profile: 'bike',
      steps: [
        {
          instruction: 'Inicia el recorrido por Ciclorruta 70',
          distanceMeters: 450,
          durationSeconds: 110,
          location: [-75.59, 6.25],
        },
      ],
    };
    const origin = { latitude: 6.25, longitude: -75.59 };
    const destination = {
      trainingSpotId: 'spot-9',
      latitude: 6.24,
      longitude: -75.58,
    };

    const state = buildRouteState(result, origin, destination);

    expect(state.profile).toBe('bike');
    expect(state.destinationKey).toBe('spot-9');
    expect(state.originCoordinates).toEqual([-75.59, 6.25]);
    expect(state.destinationCoordinates).toEqual([-75.58, 6.24]);
    expect(state.steps).toHaveLength(1);
  });

  it('validates step location before centering map', () => {
    expect(resolveStepCenterLonLat({ location: [-75.59, 6.25] })).toEqual([-75.59, 6.25]);
    expect(resolveStepCenterLonLat({ location: [250, 6.25] })).toBeNull();
    expect(resolveStepCenterLonLat({ location: null })).toBeNull();
    expect(resolveStepCenterLonLat(null)).toBeNull();
  });

  it('formats step distances in meters below 1 km and kilometers from 1 km', () => {
    expect(formatStepDistance(85)).toBe('85 m');
    expect(formatStepDistance(999)).toBe('999 m');
    expect(formatStepDistance(1000)).toBe('1.0 km');
    expect(formatStepDistance(2450)).toBe('2.5 km');
  });

  it('invokes focus callback cleanly only when location is valid', () => {
    const onFocus = vi.fn();
    const loc = resolveStepCenterLonLat({ location: [-75.58, 6.24] });
    if (loc) onFocus(loc);
    expect(onFocus).toHaveBeenCalledWith([-75.58, 6.24]);
  });
});
