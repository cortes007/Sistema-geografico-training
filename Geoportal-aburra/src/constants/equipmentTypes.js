export const EQUIPMENT_TYPES = {
  gym: 'gimnasio',
  outdoorGym: 'gimnasio al aire libre',
};

export const EQUIPMENT_TYPE_STYLES = {
  [EQUIPMENT_TYPES.gym]: {
    color: '#2563eb',
    fill: 'rgba(37, 99, 235, 0.2)',
    label: 'Gimnasio',
  },
  [EQUIPMENT_TYPES.outdoorGym]: {
    color: '#15b818',
    fill: 'rgba(128, 245, 11, 0.2)',
    label: 'Training al aire libre',
  },
};

export function getEquipmentTypeFromProperties(properties = {}) {
  const values = Object.values(properties)
    .filter((value) => value !== null && value !== undefined)
    .map((value) => value.toString().trim().toLowerCase());
  const text = values.join(' ');

  if (text.includes('calistenia') || text.includes('calisthenics')) {
    return EQUIPMENT_TYPES.outdoorGym;
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
