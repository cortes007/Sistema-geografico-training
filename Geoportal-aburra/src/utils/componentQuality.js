const OUTDOOR_CRITERIA = [
  { key: 'estado_barras', label: 'Estado de barras y estructura' },
  { key: 'superficie_suelo', label: 'Superficie y suelo' },
  { key: 'iluminacion_seguridad', label: 'Iluminación y seguridad' },
];

const INDOOR_GYM_CRITERIA = [
  { key: 'calidad_maquinas', label: 'Calidad de máquinas' },
  { key: 'variedad_pesas', label: 'Variedad de pesas y espacio' },
  { key: 'limpieza_vestier', label: 'Limpieza y vestier' },
];

/**
 * Devuelve los criterios de evaluación de componentes según el tipo de equipamiento.
 */
export function getComponentCriteriaForPlace({ equipmentType = null, type = '' } = {}) {
  const normalizedEquipment = String(equipmentType || '').trim().toLowerCase();
  const normalizedType = String(type || '').trim().toLowerCase();
  const combined = `${normalizedEquipment} ${normalizedType}`;

  if (
    combined.includes('aire libre')
    || combined.includes('calistenia')
    || combined.includes('calisthenics')
    || combined.includes('fitness_station')
  ) {
    return OUTDOOR_CRITERIA;
  }

  return INDOOR_GYM_CRITERIA;
}

/**
 * Combina la definición de criterios con el resumen agregado desde Supabase.
 */
export function mergeComponentSummaryWithCriteria(criteria = [], summaryRows = []) {
  if (!Array.isArray(criteria) || criteria.length === 0) return [];

  const summaryByKey = new Map(
    (summaryRows ?? []).map((row) => [String(row.componente), row])
  );

  return criteria.map((criterion) => {
    const match = summaryByKey.get(criterion.key);
    const count = Number(match?.cantidad || 0);
    const hasSamples = count > 0 && Number.isFinite(Number(match?.promedio));

    return {
      key: criterion.key,
      label: criterion.label,
      averageRating: hasSamples ? Number(match.promedio) : null,
      ratingCount: hasSamples ? count : 0,
    };
  });
}
