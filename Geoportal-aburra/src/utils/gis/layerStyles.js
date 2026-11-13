import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style';
import {
  EQUIPMENT_TYPE_STYLES,
  getEquipmentTypeFromProperties,
} from '../../constants/equipmentTypes';
import { THEME_COLORS } from '../../constants/themeColors';
import { getTrainingSpotPoint } from '../trainingSpotGeometry';

const styleCache = new Map();

export function getRepresentativePoint(feature) {
  const cachedPoint = feature.get('representativePoint');
  if (cachedPoint) return cachedPoint;

  const representativePoint = getTrainingSpotPoint(feature.getGeometry());
  if (representativePoint) {
    feature.set('representativePoint', representativePoint, true);
  }
  return representativePoint;
}

export function prepareTrainingSpotFeature(feature) {
  if (!feature) return;

  if (!feature.get('equipmentType')) {
    const eqType = getEquipmentTypeFromProperties(feature.getProperties());
    feature.set('equipmentType', eqType, true);
  }

  if (!feature.get('representativePoint')) {
    getRepresentativePoint(feature);
  }
}

export function createMarkerStyle(color, useRepresentativePoint = false) {
  const cacheKey = `${color}|${useRepresentativePoint ? 'point' : 'direct'}`;
  const cached = styleCache.get(cacheKey);
  if (cached) return cached;

  const style = new Style({
    ...(useRepresentativePoint && {
      geometry: getRepresentativePoint,
    }),
    image: new CircleStyle({
      radius: 6,
      fill: new Fill({ color }),
      stroke: new Stroke({ color: THEME_COLORS.white, width: 2 }),
    }),
  });

  styleCache.set(cacheKey, style);
  return style;
}

export function getFeatureStyle(
  feature,
  activeEquipmentTypes,
  useRepresentativePoint = false
) {
  let type = feature.get('equipmentType');
  if (type === undefined) {
    type = getEquipmentTypeFromProperties(feature.getProperties());
    feature.set('equipmentType', type, true);
  }

  const palette = type ? EQUIPMENT_TYPE_STYLES[type] : null;
  if (!palette) {
    return createMarkerStyle(THEME_COLORS.muted, useRepresentativePoint);
  }
  if (activeEquipmentTypes && !activeEquipmentTypes[type]) {
    return null;
  }

  return createMarkerStyle(palette.color, useRepresentativePoint);
}
