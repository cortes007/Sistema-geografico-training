import { describe, expect, it } from 'vitest';
import { EQUIPMENT_TYPES } from '../constants/equipmentTypes';
import {
  generatePeakCurve,
  getCurrentLevel,
  getPeakSummary,
} from './peakHours';

describe('peakHours utils', () => {
  it('genera una curva determinista de 73 pasos (04:00 a 22:00 cada 15 min) con valores entre 0 y 1', () => {
    const gymCurveA = generatePeakCurve(EQUIPMENT_TYPES.gym);
    const gymCurveB = generatePeakCurve(EQUIPMENT_TYPES.gym);

    expect(gymCurveA).toHaveLength(73);
    expect(gymCurveA).toEqual(gymCurveB);
    gymCurveA.forEach((value) => {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    });
  });

  it('alcanza su valor máximo (campana, no meseta plana) en el centro de las ventanas pico', () => {
    const gymCurve = generatePeakCurve(EQUIPMENT_TYPES.gym);
    // Índice de 05:00 = (5 - 4) * 4 = 4; 05:30 = 6; 06:00 = 8
    expect(gymCurve[6]).toBe(1);
    expect(gymCurve[6]).toBeGreaterThan(gymCurve[4]);
    expect(gymCurve[6]).toBeGreaterThan(gymCurve[8]);

    // Índice de 18:00 = (18 - 4) * 4 = 56; 19:00 = 60; 20:00 = 64
    expect(gymCurve[60]).toBe(1);
    expect(gymCurve[60]).toBeGreaterThan(gymCurve[56]);
    expect(gymCurve[60]).toBeGreaterThan(gymCurve[64]);

    // Aire libre / centro deportivo (16:00 a 22:00, centro a las 19:00 = índice 60)
    const outdoorCurve = generatePeakCurve(EQUIPMENT_TYPES.outdoorGym);
    expect(outdoorCurve[60]).toBe(1);
    expect(outdoorCurve[60]).toBeGreaterThan(outdoorCurve[48]); // 16:00
    expect(outdoorCurve[60]).toBeGreaterThan(outdoorCurve[72]); // 22:00
  });

  it('devuelve el nivel correcto ("Alto", "Medio", "Bajo") en horas conocidas de America/Bogota y null fuera de 04:00-22:00', () => {
    // 05:30 am en Bogotá (UTC-5 -> 10:30Z): pico matutino de gimnasio -> Alto
    const bogota0530 = new Date('2026-11-17T10:30:00Z');
    expect(getCurrentLevel(EQUIPMENT_TYPES.gym, bogota0530)).toBe('Alto');

    // 19:00 (7:00 pm) en Bogotá (UTC-5 -> 00:00Z del día siguiente): pico vespertino -> Alto
    const bogota1900 = new Date('2026-11-18T00:00:00Z');
    expect(getCurrentLevel(EQUIPMENT_TYPES.gym, bogota1900)).toBe('Alto');
    expect(getCurrentLevel(EQUIPMENT_TYPES.outdoorGym, bogota1900)).toBe('Alto');
    expect(getCurrentLevel(EQUIPMENT_TYPES.sportsCentre, bogota1900)).toBe('Alto');

    // 17:30 (5:30 pm) en Bogotá (UTC-5 -> 22:30Z): hombro de entrada para gimnasio -> Medio
    const bogota1730 = new Date('2026-11-17T22:30:00Z');
    expect(getCurrentLevel(EQUIPMENT_TYPES.gym, bogota1730)).toBe('Medio');

    // 11:00 am en Bogotá (UTC-5 -> 16:00Z): hora valle -> Bajo
    const bogota1100 = new Date('2026-11-17T16:00:00Z');
    expect(getCurrentLevel(EQUIPMENT_TYPES.gym, bogota1100)).toBe('Bajo');
    expect(getCurrentLevel(EQUIPMENT_TYPES.outdoorGym, bogota1100)).toBe('Bajo');

    // 23:15 (11:15 pm) y 02:30 am en Bogotá: fuera del rango 04:00-22:00 -> null
    const bogota2315 = new Date('2026-11-18T04:15:00Z');
    const bogota0230 = new Date('2026-11-17T07:30:00Z');
    expect(getCurrentLevel(EQUIPMENT_TYPES.gym, bogota2315)).toBeNull();
    expect(getCurrentLevel(EQUIPMENT_TYPES.outdoorGym, bogota0230)).toBeNull();
  });

  it('genera el texto de resumen de horas pico derivado de la configuración y vacío para tipos desconocidos', () => {
    expect(getPeakSummary(EQUIPMENT_TYPES.gym)).toBe(
      'Horas pico: 5:00-6:00 am y 6:00-8:00 pm'
    );
    expect(getPeakSummary(EQUIPMENT_TYPES.outdoorGym)).toBe(
      'Horas pico: 4:00-10:00 pm'
    );
    expect(getPeakSummary(EQUIPMENT_TYPES.sportsCentre)).toBe(
      'Horas pico: 4:00-10:00 pm'
    );
    expect(getPeakSummary('restaurante')).toBe('');
    expect(generatePeakCurve('restaurante')).toEqual([]);
  });
});
