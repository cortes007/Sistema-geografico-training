import { colorWithAlpha, THEME_COLORS } from './themeColors';

export const EQUIPMENT_TYPES = {
  gym: 'gimnasio',
  outdoorGym: 'gimnasio al aire libre',
  sportsCentre: 'centro deportivo',
};

export const EQUIPMENT_TYPE_STYLES = {
  [EQUIPMENT_TYPES.gym]: {
    color: THEME_COLORS.gym,
    fill: colorWithAlpha(THEME_COLORS.gym, 0.2),
    label: 'Gimnasio',
  },
  [EQUIPMENT_TYPES.outdoorGym]: {
    color: THEME_COLORS.outdoor,
    fill: colorWithAlpha(THEME_COLORS.outdoor, 0.2),
    label: 'Training al aire libre',
  },
  [EQUIPMENT_TYPES.sportsCentre]: {
    color: THEME_COLORS.center,
    fill: colorWithAlpha(THEME_COLORS.center, 0.2),
    label: 'Centros deportivos',
  },
};

export function getEquipmentTypeFromProperties(properties = {}) {
  const values = Object.values(properties)
    .filter((value) => value !== null && value !== undefined)
    .map((value) => value.toString().trim().toLowerCase());
  const text = values.join(' ');

  if (
    text.includes('calistenia') ||
    text.includes('calisthenics') ||
    values.includes('aire_libre')
  ) {
    return EQUIPMENT_TYPES.outdoorGym;
  }

  if (values.includes('sports_centre') || values.includes('sport_centre')) {
    return EQUIPMENT_TYPES.sportsCentre;
  }

  if (values.includes('fitness_station')) {
    return EQUIPMENT_TYPES.outdoorGym;
  }

  if (values.includes('fitness_centre') || values.includes('fitness_center')) {
    return EQUIPMENT_TYPES.gym;
  }

  if (
    values.includes('gimnasio') ||
    values.includes('gym') ||
    values.includes('fitness')
  ) {
    return EQUIPMENT_TYPES.gym;
  }

  if (
    text.includes('gimnasio al aire libre') ||
    values.includes('exterior') ||
    values.includes('outdoors') ||
    values.includes('openair') ||
    values.includes('open_air') ||
    values.includes('outdoor')
  ) {
    return EQUIPMENT_TYPES.outdoorGym;
  }

  return null;
}
