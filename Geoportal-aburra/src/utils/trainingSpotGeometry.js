import Point from 'ol/geom/Point';
import { getCenter } from 'ol/extent';

export function getTrainingSpotPoint(geometry) {
  if (!geometry) return null;

  switch (geometry.getType()) {
    case 'Point':
      return geometry;
    case 'MultiPoint':
      return geometry.getPoint(0);
    case 'Polygon':
      return geometry.getInteriorPoint();
    case 'MultiPolygon':
      return geometry.getPolygon(0)?.getInteriorPoint()
        || new Point(getCenter(geometry.getExtent()));
    default:
      return new Point(getCenter(geometry.getExtent()));
  }
}
