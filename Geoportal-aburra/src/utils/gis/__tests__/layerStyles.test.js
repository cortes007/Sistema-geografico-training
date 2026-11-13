import { describe, expect, it, vi } from 'vitest';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import Polygon from 'ol/geom/Polygon';
import {
  createMarkerStyle,
  getFeatureStyle,
  prepareTrainingSpotFeature,
} from '../layerStyles';

describe('layerStyles ($O(1)$ cached styles & MVT feature pre-processing)', () => {
  it('returns the exact same cached Style reference for identical color and geometry mode', () => {
    const directStyleA = createMarkerStyle('#00BFA5', false);
    const directStyleB = createMarkerStyle('#00BFA5', false);
    const pointStyleA = createMarkerStyle('#00BFA5', true);
    const pointStyleB = createMarkerStyle('#00BFA5', true);
    const otherColorStyle = createMarkerStyle('#FF9800', false);

    expect(directStyleA).toBe(directStyleB);
    expect(pointStyleA).toBe(pointStyleB);
    expect(directStyleA).not.toBe(pointStyleA);
    expect(directStyleA).not.toBe(otherColorStyle);
  });

  it('pre-calculates equipmentType and representativePoint once for polygon features', () => {
    const polygon = new Polygon([
      [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
        [0, 0],
      ],
    ]);
    const getInteriorPointSpy = vi.spyOn(polygon, 'getInteriorPoint');
    const feature = new Feature({
      geometry: polygon,
      tipo: 'Barras de calistenia',
    });

    prepareTrainingSpotFeature(feature);

    expect(feature.get('equipmentType')).toBe('gimnasio al aire libre');
    const repPoint = feature.get('representativePoint');
    expect(repPoint).toBeDefined();
    expect(getInteriorPointSpy).toHaveBeenCalledTimes(1);

    const activeTypes = {
      'parque de calistenia': true,
      'gimnasio al aire libre': true,
      gimnasio: true,
    };

    const styleFirstFrame = getFeatureStyle(feature, activeTypes, true);
    const styleSecondFrame = getFeatureStyle(feature, activeTypes, true);

    expect(styleFirstFrame).not.toBeNull();
    expect(styleFirstFrame).toBe(styleSecondFrame);
    expect(getInteriorPointSpy).toHaveBeenCalledTimes(1);

    const geomFn = styleFirstFrame.getGeometryFunction();
    expect(geomFn(feature)).toBe(repPoint);
  });

  it('returns null when the feature equipment category is disabled in activeTypes', () => {
    const feature = new Feature({
      geometry: new Point([5, 5]),
      sport: 'fitness',
    });

    prepareTrainingSpotFeature(feature);
    expect(feature.get('equipmentType')).toBe('gimnasio');

    const hiddenStyle = getFeatureStyle(feature, {
      'parque de calistenia': true,
      'gimnasio al aire libre': true,
      gimnasio: false,
    });

    expect(hiddenStyle).toBeNull();
  });
});
