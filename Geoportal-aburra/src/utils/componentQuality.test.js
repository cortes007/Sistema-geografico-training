import { describe, expect, it } from 'vitest';
import {
  getComponentCriteriaForPlace,
  mergeComponentSummaryWithCriteria,
} from './componentQuality.js';

describe('componentQuality utils', () => {
  it('returns outdoor calisthenics criteria for outdoor gym and calisthenics parks', () => {
    const criteria = getComponentCriteriaForPlace({
      equipmentType: 'gimnasio al aire libre',
      type: 'fitness_station',
    });

    expect(criteria).toEqual([
      { key: 'estado_barras', label: 'Estado de barras y estructura' },
      { key: 'superficie_suelo', label: 'Superficie y suelo' },
      { key: 'iluminacion_seguridad', label: 'Iluminación y seguridad' },
    ]);

    expect(
      getComponentCriteriaForPlace({ type: 'parque de calistenia' }).map((c) => c.key)
    ).toEqual(['estado_barras', 'superficie_suelo', 'iluminacion_seguridad']);
  });

  it('returns indoor gym criteria for gyms and sports centres', () => {
    const criteria = getComponentCriteriaForPlace({
      equipmentType: 'gimnasio',
      type: 'fitness_centre',
    });

    expect(criteria).toEqual([
      { key: 'calidad_maquinas', label: 'Calidad de máquinas' },
      { key: 'variedad_pesas', label: 'Variedad de pesas y espacio' },
      { key: 'limpieza_vestier', label: 'Limpieza y vestier' },
    ]);

    expect(
      getComponentCriteriaForPlace({ equipmentType: 'centro deportivo', type: 'sports_centre' }).map((c) => c.key)
    ).toEqual(['calidad_maquinas', 'variedad_pesas', 'limpieza_vestier']);
  });

  it('merges aggregated summary rows cleanly with place criteria', () => {
    const criteria = getComponentCriteriaForPlace({ equipmentType: 'gimnasio' });
    const merged = mergeComponentSummaryWithCriteria(criteria, [
      { componente: 'calidad_maquinas', promedio: 4.5, cantidad: 4 },
      { componente: 'limpieza_vestier', promedio: 3.8, cantidad: 2 },
      { componente: 'variedad_pesas', promedio: 4.0, cantidad: 0 },
    ]);

    expect(merged).toEqual([
      {
        key: 'calidad_maquinas',
        label: 'Calidad de máquinas',
        averageRating: 4.5,
        ratingCount: 4,
      },
      {
        key: 'variedad_pesas',
        label: 'Variedad de pesas y espacio',
        averageRating: null,
        ratingCount: 0,
      },
      {
        key: 'limpieza_vestier',
        label: 'Limpieza y vestier',
        averageRating: 3.8,
        ratingCount: 2,
      },
    ]);
  });
});
