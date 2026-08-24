export const EQUIPMENT_TYPES = {
  park: 'parque de calistenia',
  gym: 'gimnasio',
  outdoorGym: 'gimnasio al aire libre',
};

export const EQUIPMENT_TYPE_STYLES = {
  [EQUIPMENT_TYPES.park]: {
    color: '#22c55e',
    fill: 'rgba(34, 197, 94, 0.2)',
    label: 'Parque de calistenia',
  },
  [EQUIPMENT_TYPES.gym]: {
    color: '#2563eb',
    fill: 'rgba(37, 99, 235, 0.2)',
    label: 'Gimnasio',
  },
  [EQUIPMENT_TYPES.outdoorGym]: {
    color: '#f59e0b',
    fill: 'rgba(245, 158, 11, 0.2)',
    label: 'Gimnasio al aire libre',
  },
};

export function getEquipmentTypeFromProperties(properties = {}) {
  const rawType = (
    properties.tipo ||
    properties.categoria ||
    properties.type ||
    properties.equipmentType ||
    properties.leisure ||
    properties.amenity ||
    properties.sport ||
    properties.tag ||
    ''
  ).toString().trim().toLowerCase();

  if (!rawType) return null;

  const aliases = {
    parque: EQUIPMENT_TYPES.park,
    'parque de calistenia': EQUIPMENT_TYPES.park,
    calistenia: EQUIPMENT_TYPES.park,
    gym: EQUIPMENT_TYPES.gym,
    gimnasio: EQUIPMENT_TYPES.gym,
    fitness: EQUIPMENT_TYPES.gym,
    'fitness_centre': EQUIPMENT_TYPES.gym,
    'fitness_station': EQUIPMENT_TYPES.park,
    'sports_centre': EQUIPMENT_TYPES.outdoorGym,
    'sport_centre': EQUIPMENT_TYPES.outdoorGym,
    'gimnasio al aire libre': EQUIPMENT_TYPES.outdoorGym,
    exterior: EQUIPMENT_TYPES.outdoorGym,
    outdoors: EQUIPMENT_TYPES.outdoorGym,
    openair: EQUIPMENT_TYPES.outdoorGym,
    open_air: EQUIPMENT_TYPES.outdoorGym,
    outdoor: EQUIPMENT_TYPES.outdoorGym,
    swimming: EQUIPMENT_TYPES.gym,
    soccer: EQUIPMENT_TYPES.outdoorGym,
    basketball: EQUIPMENT_TYPES.outdoorGym,
    volleyball: EQUIPMENT_TYPES.outdoorGym,
    climbing: EQUIPMENT_TYPES.outdoorGym,
  };

  return aliases[rawType] || null;
}
