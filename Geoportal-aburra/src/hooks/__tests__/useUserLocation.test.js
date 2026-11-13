import { describe, expect, it, vi } from 'vitest';
import { fromLonLat } from 'ol/proj';
import {
  applyManualLocation,
  normalizeManualCoordinates,
} from '../useUserLocation';
import { resolveMapClickCoordinate } from '../useClickMarker';

describe('useUserLocation manual location helpers', () => {
  it('validates and normalizes valid geographic coordinates to 6 decimals', () => {
    expect(normalizeManualCoordinates({ latitude: 6.24420345, longitude: -75.58121199 })).toEqual({
      latitude: 6.244203,
      longitude: -75.581212,
    });
  });

  it('rejects invalid or out-of-range coordinates', () => {
    expect(normalizeManualCoordinates(null)).toBeNull();
    expect(normalizeManualCoordinates({ latitude: 95, longitude: -75.5 })).toBeNull();
    expect(normalizeManualCoordinates({ latitude: 6.2, longitude: -185 })).toBeNull();
    expect(normalizeManualCoordinates({ latitude: Number.NaN, longitude: -75.5 })).toBeNull();
  });

  it('sets manual location, clears route/error, marks source as manual, and exits picking mode', () => {
    const actions = {
      setUserLocation: vi.fn(),
      setLocationSource: vi.fn(),
      setLocationStatus: vi.fn(),
      setLocationError: vi.fn(),
      setIsPickingLocation: vi.fn(),
      clearRoute: vi.fn(),
    };

    const ok = applyManualLocation({ latitude: 6.2134, longitude: -75.5678 }, actions);

    expect(ok).toBe(true);
    expect(actions.clearRoute).toHaveBeenCalledTimes(1);
    expect(actions.setUserLocation).toHaveBeenCalledWith({
      latitude: 6.2134,
      longitude: -75.5678,
    });
    expect(actions.setLocationSource).toHaveBeenCalledWith('manual');
    expect(actions.setLocationStatus).toHaveBeenCalledWith('ready');
    expect(actions.setLocationError).toHaveBeenCalledWith('');
    expect(actions.setIsPickingLocation).toHaveBeenCalledWith(false);
  });

  it('reports an error and preserves picking mode when coordinates are invalid', () => {
    const actions = {
      setUserLocation: vi.fn(),
      setLocationSource: vi.fn(),
      setLocationStatus: vi.fn(),
      setLocationError: vi.fn(),
      setIsPickingLocation: vi.fn(),
      clearRoute: vi.fn(),
    };

    const ok = applyManualLocation({ latitude: 999, longitude: -75.5 }, actions);

    expect(ok).toBe(false);
    expect(actions.setUserLocation).not.toHaveBeenCalled();
    expect(actions.setLocationError).toHaveBeenCalledWith(
      'Las coordenadas seleccionadas en el mapa no son válidas.'
    );
  });

  it('transforms EPSG:3857 map click coordinate to EPSG:4326 when resolving manual pick', () => {
    const projected = fromLonLat([-75.5812, 6.2291], 'EPSG:3857');
    const coords = resolveMapClickCoordinate(projected, 'EPSG:3857');

    expect(coords.longitude).toBeCloseTo(-75.5812, 4);
    expect(coords.latitude).toBeCloseTo(6.2291, 4);
  });
});
