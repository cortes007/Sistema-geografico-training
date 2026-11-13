import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  NEARBY_TILE_SCAN_MAX_ZOOM,
  createBatchedTileUpdater,
  getNearbyScanZoom,
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
