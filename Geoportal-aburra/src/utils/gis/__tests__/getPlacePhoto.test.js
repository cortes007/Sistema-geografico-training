import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import {
  EXTERNAL_REQUEST_TIMEOUT_MS,
  clearPlacePhotoCache,
  getFeatureCacheKey,
  getPlacePhoto,
} from '../getPlacePhoto';

describe('getPlacePhoto stable ID cache & timeout optimization', () => {
  beforeEach(() => {
    if (typeof clearPlacePhotoCache === 'function') {
      clearPlacePhotoCache();
    }
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          query: {
            pages: {
              1: {
                imageinfo: [
                  {
                    url: 'https://upload.wikimedia.org/example.jpg',
                    thumburl: 'https://upload.wikimedia.org/example-thumb.jpg',
                    extmetadata: {
                      Artist: { value: '<b>Fotógrafo</b>' },
                      LicenseShortName: { value: 'CC BY-SA 4.0' },
                    },
                  },
                ],
              },
            },
          },
        }),
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses an 1800 ms external request timeout', () => {
    expect(EXTERNAL_REQUEST_TIMEOUT_MS).toBe(1800);
  });

  it('reuses cached photo across distinct Feature instances sharing the same trainingSpotId', async () => {
    const featureFromFirstTileLoad = new Feature({
      geometry: new Point([-8412000, 697000]),
      trainingSpotId: 'spot-42',
      wikimedia_commons: 'File:Calistenia_Medellin.jpg',
    });
    const featureFromSecondTileLoad = new Feature({
      geometry: new Point([-8412000, 697000]),
      trainingSpotId: 'spot-42',
      wikimedia_commons: 'File:Calistenia_Medellin.jpg',
    });

    expect(featureFromFirstTileLoad).not.toBe(featureFromSecondTileLoad);
    expect(getFeatureCacheKey(featureFromFirstTileLoad)).toBe(
      getFeatureCacheKey(featureFromSecondTileLoad)
    );

    const firstPhoto = await getPlacePhoto(featureFromFirstTileLoad);
    const secondPhoto = await getPlacePhoto(featureFromSecondTileLoad);

    expect(firstPhoto).toBe(secondPhoto);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });
});
