import { EQUIPMENT_TYPES } from '../constants/equipmentTypes';

/**
 * Configuración de referencia para la curva de horas de mayor afluencia (horas pico).
 * Todos los parámetros son editables para ajustar el comportamiento de la estimación.
 */

/** Zona horaria de referencia para determinar la barra "Ahora" y el nivel actual. */
export const PEAK_TIMEZONE = 'America/Bogota';

/** Hora de inicio del gráfico en formato 24h (04:00). */
export const PEAK_START_HOUR = 4;

/** Hora de cierre del gráfico en formato 24h (22:00). */
export const PEAK_END_HOUR = 22;

/** Tamaño del paso entre barras en minutos (15 minutos). */
export const PEAK_STEP_MINUTES = 15;

/**
 * Nivel base de afluencia (entre 0 y 1) fuera de las ventanas pico.
 * Ajusta qué tan altas se ven las barras en horas valle.
 */
export const PEAK_BASE_LEVEL = 0.14;

/**
 * Duración en minutos del hombro suave de entrada y salida antes y después
 * de cada ventana pico (sugerido entre 30 y 45 minutos).
 */
export const PEAK_SHOULDER_MINUTES = 45;

/**
 * Umbrales sobre la altura normalizada (0 a 1) para clasificar el nivel actual:
 * - >= PEAK_LEVEL_THRESHOLDS.high -> "Alto"
 * - >= PEAK_LEVEL_THRESHOLDS.medium -> "Medio"
 * - <  PEAK_LEVEL_THRESHOLDS.medium -> "Bajo"
 */
export const PEAK_LEVEL_THRESHOLDS = {
  high: 0.62,
  medium: 0.28,
};

/**
 * Ventanas de horas pico por tipo de equipamiento (claves de `EQUIPMENT_TYPES`).
 * Puedes modificar `start` y `end` (en formato "HH:MM") o añadir ventanas adicionales.
 */
export const HORAS_PICO_POR_TIPO = {
  // Gimnasios cerrados (fitness_centre): picos temprano en la mañana y al final de la tarde
  [EQUIPMENT_TYPES.gym]: [
    { start: '05:00', end: '06:00' },
    { start: '18:00', end: '20:00' },
  ],

  // Parques de calistenia y gimnasios al aire libre (fitness_station): tarde y noche
  [EQUIPMENT_TYPES.outdoorGym]: [
    { start: '16:00', end: '22:00' },
  ],

  // Centros y unidades deportivas (sports_centre): tarde y noche
  [EQUIPMENT_TYPES.sportsCentre]: [
    { start: '16:00', end: '22:00' },
  ],
};
