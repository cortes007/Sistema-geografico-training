import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { fromLonLat } from 'ol/proj';

vi.mock('../../services/nearbyPlacesService', () => ({
  listarCalificacionesAgregadasLugares: vi.fn(),
}));

import {
  NEARBY_TILE_SCAN_MAX_ZOOM,
  createBatchedTileUpdater,
  filterAndRankNearbyPlaces,
  getNearbyScanZoom,
  scanNearbyTileFeatures,
} from '../useNearbyPlaces';

describe('useNearbyPlaces optimizations (zoom clamping & rAF batching)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('clamps the MVT tile scan zoom to NEARBY_TILE_SCAN_MAX_ZOOM (14) when zoomed in deeply', () => {
    expect(NEARBY_TILE_SCAN_MAX_ZOOM).toBe(14);

    const mockTileGridHighZoom = {
      getZForResolution: vi.fn(() => 19),
    };
    expect(getNearbyScanZoom(mockTileGridHighZoom, 0.3)).toBe(14);
    expect(mockTileGridHighZoom.getZForResolution).toHaveBeenCalledWith(0.3);

    const mockTileGridLowZoom = {
      getZForResolution: vi.fn(() => 12),
    };
    expect(getNearbyScanZoom(mockTileGridLowZoom, 38.2)).toBe(12);
  });

  it('coalesces multiple tileloadend events within the same frame into a single update call', () => {
    const rafCallbacks = [];
    const requestFrame = vi.fn((cb) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });
    const cancelFrame = vi.fn();
    const updateFeatures = vi.fn();

    const { schedule, cancel } = createBatchedTileUpdater(
      updateFeatures,
      requestFrame,
      cancelFrame
    );

    schedule();
    schedule();
    schedule();
    schedule();

    expect(requestFrame).toHaveBeenCalledTimes(1);
    expect(updateFeatures).not.toHaveBeenCalled();

    rafCallbacks[0]();
    expect(updateFeatures).toHaveBeenCalledTimes(1);

    schedule();
    expect(requestFrame).toHaveBeenCalledTimes(2);
    cancel();
    expect(cancelFrame).toHaveBeenCalledWith(2);
  });
});

describe('filterAndRankNearbyPlaces (1 km / 3 km / 5 km radius & smart filters)', () => {
  const userLocation = { latitude: 6.21, longitude: -75.57 };
  // ~0.5 km north
  const closeSpot = new Feature({
    geometry: new Point(fromLonLat([-75.57, 6.2145], 'EPSG:3857')),
    id: 'spot-close',
    name: 'Parque Cercano',
    leisure: 'fitness_station',
    city: 'Medellín',
  });
  // ~2.2 km north
  const mediumSpot = new Feature({
    geometry: new Point(fromLonLat([-75.57, 6.23], 'EPSG:3857')),
    id: 'spot-medium',
    name: 'Gimnasio Intermedio',
    leisure: 'fitness_centre',
    city: 'Medellín',
  });
  // ~4.1 km north
  const farSpot = new Feature({
    geometry: new Point(fromLonLat([-75.57, 6.247], 'EPSG:3857')),
    id: 'spot-far',
    name: 'Centro Deportivo Lejano',
    leisure: 'sports_centre',
    city: 'Bello',
  });

  const ratingAggregates = [
    { trainingSpotId: 'spot-close', averageRating: 4.1, ratingCount: 5, rankingRating: 4.0 },
    { trainingSpotId: 'spot-medium', averageRating: 4.8, ratingCount: 10, rankingRating: 4.7 },
    { trainingSpotId: 'spot-far', averageRating: 4.9, ratingCount: 20, rankingRating: 4.85 },
  ];

  const activeEquipmentTypes = {
    gimnasio: true,
    'gimnasio al aire libre': true,
    'centro deportivo': true,
  };

  it('filters places accurately for 1000 m, 3000 m, and 5000 m radius options', () => {
    const features = [closeSpot, mediumSpot, farSpot];

    const at1Km = filterAndRankNearbyPlaces({
      features,
      userLocation,
      projection: 'EPSG:3857',
      radiusMeters: 1000,
      ratingAggregates,
      activeEquipmentTypes,
    });
    expect(at1Km.map((item) => item.trainingSpotId)).toEqual(['spot-close']);

    const at3Km = filterAndRankNearbyPlaces({
      features,
      userLocation,
      projection: 'EPSG:3857',
      radiusMeters: 3000,
      ratingAggregates,
      activeEquipmentTypes,
    });
    expect(at3Km.map((item) => item.trainingSpotId)).toEqual(['spot-medium', 'spot-close']);

    const at5Km = filterAndRankNearbyPlaces({
      features,
      userLocation,
      projection: 'EPSG:3857',
      radiusMeters: 5000,
      ratingAggregates,
      activeEquipmentTypes,
    });
    expect(at5Km.map((item) => item.trainingSpotId)).toEqual([
      'spot-far',
      'spot-medium',
      'spot-close',
    ]);
  });

  it('applies active smart filters (minRating / upcoming meetups) inside the nearby radius', () => {
    const filtered = filterAndRankNearbyPlaces({
      features: [closeSpot, mediumSpot, farSpot],
      userLocation,
      projection: 'EPSG:3857',
      radiusMeters: 5000,
      ratingAggregates,
      activeEquipmentTypes,
      spotFilters: {
        query: '',
        municipality: '',
        minRating: 4.5,
        onlyWithMeetups: true,
        onlyOpenNow: false,
      },
      spotFilterIndex: {
        ratingsBySpot: new Map([
          ['spot-close', { averageRating: 4.1, ratingCount: 5 }],
          ['spot-medium', { averageRating: 4.8, ratingCount: 10 }],
          ['spot-far', { averageRating: 4.9, ratingCount: 20 }],
        ]),
        upcomingSpotIds: new Set(['spot-medium']),
      },
    });

    expect(filtered.map((item) => item.trainingSpotId)).toEqual(['spot-medium']);
  });

  it('tracks pending outer tiles and reloads features when a loading source tile finishes for an expanded radius', () => {
    const innerTile = {
      getState: () => 2,
      getFeatures: () => [closeSpot],
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    let outerState = 1; // TileState.LOADING
    let outerChangeListener = null;
    const outerSourceTile = {
      getState: () => outerState,
      getFeatures: () => (outerState === 2 ? [farSpot] : []),
      addEventListener: vi.fn((eventName, listener) => {
        if (eventName === 'change') outerChangeListener = listener;
      }),
      removeEventListener: vi.fn(),
    };
    const outerRenderTile = {
      getState: () => 1,
      getSourceTiles: () => [outerSourceTile],
    };
    const innerRenderTile = {
      getState: () => 2,
      getSourceTiles: () => [innerTile],
    };

    const onTileChange = vi.fn();
    const subscribedTiles = new Set();
    const initialScan = scanNearbyTileFeatures({
      localFeatures: [],
      tileCollections: [[innerRenderTile, outerRenderTile]],
      subscribedTiles,
      onSourceTileChange: onTileChange,
    });

    expect(initialScan.hasPendingTiles).toBe(true);
    expect(initialScan.features).toEqual([closeSpot]);
    expect(outerSourceTile.addEventListener).toHaveBeenCalledWith('change', onTileChange);

    // Simulate outer tile finishing async load after selecting 5 km radius
    outerState = 2; // TileState.LOADED
    outerChangeListener?.();
    expect(onTileChange).toHaveBeenCalledTimes(1);

    const updatedScan = scanNearbyTileFeatures({
      localFeatures: [],
      tileCollections: [[innerRenderTile, outerRenderTile]],
      subscribedTiles,
      onSourceTileChange: onTileChange,
    });

    expect(updatedScan.hasPendingTiles).toBe(false);
    expect(updatedScan.features).toEqual([closeSpot, farSpot]);
  });
});
