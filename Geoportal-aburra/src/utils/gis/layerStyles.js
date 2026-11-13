import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style';
import {
  EQUIPMENT_TYPE_STYLES,
  getEquipmentTypeFromProperties,
} from '../../constants/equipmentTypes';
import { THEME_COLORS } from '../../constants/themeColors';
import { getTrainingSpotPoint } from '../trainingSpotGeometry';
import { hasActiveSmartFilters, matchesSpotFilters } from '../spotFilters';

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

/**
 * Crea un predicado de filtrado inteligente para teselas MVT de training_spots.
 * Devuelve null cuando no hay filtros inteligentes activos (ruta rápida sin coste por feature).
 */
export function createTrainingSpotStylePredicate({
  spotFilters,
  spotFilterIndex = {},
  activeEquipmentTypes = null,
  now = new Date(),
} = {}) {
  if (!hasActiveSmartFilters(spotFilters)) {
    return null;
  }

  return (feature) => {
    const rawId = feature.get('trainingSpotId') ?? feature.get('id') ?? feature.getId();
    const trainingSpotId = rawId !== undefined && rawId !== null ? String(rawId) : '';
    const catalogSpot = trainingSpotId ? spotFilterIndex?.spotsById?.get(trainingSpotId) : null;

    return matchesSpotFilters(
      {
        trainingSpotId,
        name: feature.get('name') || catalogSpot?.name || '',
        city: feature.get('city') || feature.get('addr:city') || catalogSpot?.city || '',
        equipmentType: feature.get('equipmentType') ?? catalogSpot?.equipmentType ?? null,
        openingHours:
          feature.get('opening_hours')
          || feature.get('openingHours')
          || catalogSpot?.openingHours
          || '',
      },
      spotFilters,
      spotFilterIndex,
      { activeEquipmentTypes, now }
    );
  };
}

export function getFeatureStyle(
  feature,
  activeEquipmentTypes,
  useRepresentativePoint = false,
  filterPredicate = null
) {
  let type = feature.get('equipmentType');
  if (type === undefined) {
    type = getEquipmentTypeFromProperties(feature.getProperties());
    feature.set('equipmentType', type, true);
  }

  const palette = type ? EQUIPMENT_TYPE_STYLES[type] : null;
  if (activeEquipmentTypes && palette && !activeEquipmentTypes[type]) {
    return null;
  }
  if (typeof filterPredicate === 'function' && !filterPredicate(feature)) {
    return null;
  }
  if (!palette) {
    return createMarkerStyle(THEME_COLORS.muted, useRepresentativePoint);
  }

  return createMarkerStyle(palette.color, useRepresentativePoint);
}
