import {
  HORAS_PICO_POR_TIPO,
  PEAK_BASE_LEVEL,
  PEAK_END_HOUR,
  PEAK_LEVEL_THRESHOLDS,
  PEAK_SHOULDER_MINUTES,
  PEAK_START_HOUR,
  PEAK_STEP_MINUTES,
  PEAK_TIMEZONE,
} from '../config/horasPicoReferencia';
import {
  EQUIPMENT_TYPES,
  getEquipmentTypeFromProperties,
} from '../constants/equipmentTypes';

const EDGE_BELL_RATIO = 0.68;

/**
 * Convierte una cadena "HH:MM" a minutos desde las 00:00.
 */
export function parseTimeToMinutes(timeStr) {
  if (typeof timeStr !== 'string') return null;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);
  if (
    !Number.isInteger(hours)
    || !Number.isInteger(minutes)
    || hours < 0
    || hours > 24
    || minutes < 0
    || minutes >= 60
  ) {
    return null;
  }

  return hours * 60 + minutes;
}

/**
 * Resuelve la clave canónica de `HORAS_PICO_POR_TIPO` ('gimnasio', 'gimnasio al aire libre',
 * 'centro deportivo') a partir del tipo de equipamiento o de la categoría OSM.
 * Devuelve `null` si no corresponde a ninguno de los 3 tipos.
 */
export function resolvePeakPlaceType(typeInput) {
  if (!typeInput) return null;

  if (typeof typeInput === 'object') {
    const fromEquipment = resolvePeakPlaceType(typeInput.equipmentType);
    if (fromEquipment) return fromEquipment;
    return resolvePeakPlaceType(typeInput.type);
  }

  const normalized = String(typeInput).trim().toLowerCase();
  if (!normalized) return null;

  if (Object.prototype.hasOwnProperty.call(HORAS_PICO_POR_TIPO, normalized)) {
    return normalized;
  }

  const mapped = getEquipmentTypeFromProperties({ type: normalized });
  if (mapped && Object.prototype.hasOwnProperty.call(HORAS_PICO_POR_TIPO, mapped)) {
    return mapped;
  }

  if (normalized === 'aire libre') {
    return EQUIPMENT_TYPES.outdoorGym;
  }

  return null;
}

/**
 * Calcula la contribución (entre 0 y 1) de una ventana pico `[startMin, endMin]`
 * para un instante `minuteOfDay`, con forma de campana (máxima en el centro)
 * y subida/bajada suaves en los hombros laterales (`shoulderMinutes`).
 */
function evaluateWindowBell(minuteOfDay, startMin, endMin, shoulderMinutes) {
  if (!Number.isFinite(startMin) || !Number.isFinite(endMin) || endMin <= startMin) {
    return 0;
  }

  const center = (startMin + endMin) / 2;
  const halfWidth = (endMin - startMin) / 2;
  const dist = Math.abs(minuteOfDay - center);

  if (dist <= halfWidth) {
    const normalizedInner = halfWidth > 0 ? dist / halfWidth : 0;
    return 1 - (1 - EDGE_BELL_RATIO) * (normalizedInner ** 2);
  }

  const shoulder = Math.max(0, Number(shoulderMinutes) || 0);
  if (shoulder <= 0 || dist >= halfWidth + shoulder) {
    return 0;
  }

  const shoulderProgress = (dist - halfWidth) / shoulder;
  return EDGE_BELL_RATIO * 0.5 * (1 + Math.cos(Math.PI * shoulderProgress));
}

/**
 * Genera de forma determinista el arreglo de alturas normalizadas (entre 0 y 1)
 * por cada paso de 15 minutos entre las 04:00 y las 22:00 para un tipo de lugar.
 * Devuelve `[]` si el tipo no corresponde a ninguno de los 3 tipos configurados.
 */
export function generatePeakCurve(typeInput) {
  const canonicalType = resolvePeakPlaceType(typeInput);
  if (!canonicalType) return [];

  const windows = HORAS_PICO_POR_TIPO[canonicalType] || [];
  const parsedWindows = windows
    .map((w) => ({
      startMin: parseTimeToMinutes(w.start),
      endMin: parseTimeToMinutes(w.end),
    }))
    .filter((w) => w.startMin !== null && w.endMin !== null && w.endMin > w.startMin);

  const startMinutes = PEAK_START_HOUR * 60;
  const endMinutes = PEAK_END_HOUR * 60;
  const curve = [];

  for (
    let minute = startMinutes;
    minute <= endMinutes;
    minute += PEAK_STEP_MINUTES
  ) {
    let maxBell = 0;
    for (let i = 0; i < parsedWindows.length; i += 1) {
      const { startMin, endMin } = parsedWindows[i];
      const bell = evaluateWindowBell(
        minute,
        startMin,
        endMin,
        PEAK_SHOULDER_MINUTES
      );
      if (bell > maxBell) maxBell = bell;
    }

    const rawHeight = PEAK_BASE_LEVEL + (1 - PEAK_BASE_LEVEL) * maxBell;
    const clampedHeight = Math.min(1, Math.max(0, Number(rawHeight.toFixed(4))));
    curve.push(clampedHeight);
  }

  return curve;
}

/**
 * Obtiene los minutos transcurridos desde las 00:00 en la zona horaria `America/Bogota`
 * usando `Intl.DateTimeFormat` con `timeZone`, sin depender de la hora local del navegador.
 */
export function getBogotaMinutesOfDay(date = new Date()) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return null;
  }

  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: PEAK_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });

  const parts = formatter.formatToParts(date);
  const hourPart = parts.find((part) => part.type === 'hour')?.value;
  const minutePart = parts.find((part) => part.type === 'minute')?.value;

  const hours = Number.parseInt(hourPart ?? '', 10);
  const minutes = Number.parseInt(minutePart ?? '', 10);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
    return null;
  }

  return (hours % 24) * 60 + minutes;
}

/**
 * Devuelve el índice de la barra correspondiente a la hora actual en `America/Bogota`.
 * Si la hora en Bogotá está fuera del rango 04:00–22:00, devuelve `null`.
 */
export function getActivePeakBarIndex(date = new Date()) {
  const minutesOfDay = getBogotaMinutesOfDay(date);
  if (minutesOfDay === null) return null;

  const startMinutes = PEAK_START_HOUR * 60;
  const endMinutes = PEAK_END_HOUR * 60;

  if (minutesOfDay < startMinutes || minutesOfDay > endMinutes) {
    return null;
  }

  const totalSteps = Math.floor((endMinutes - startMinutes) / PEAK_STEP_MINUTES);
  const index = Math.round((minutesOfDay - startMinutes) / PEAK_STEP_MINUTES);
  return Math.min(totalSteps, Math.max(0, index));
}

/**
 * Devuelve el nivel de afluencia actual ("Alto" | "Medio" | "Bajo") según el valor de la
 * curva a la hora indicada en `America/Bogota`.
 * Fuera del rango 04:00–22:00 o para tipos desconocidos devuelve `null`.
 */
export function getCurrentLevel(typeInput, date = new Date()) {
  const canonicalType = resolvePeakPlaceType(typeInput);
  if (!canonicalType) return null;

  const barIndex = getActivePeakBarIndex(date);
  if (barIndex === null) return null;

  const curve = generatePeakCurve(canonicalType);
  const value = curve[barIndex];
  if (!Number.isFinite(value)) return null;

  if (value >= PEAK_LEVEL_THRESHOLDS.high) return 'Alto';
  if (value >= PEAK_LEVEL_THRESHOLDS.medium) return 'Medio';
  return 'Bajo';
}

function formatHour12(minutes, includePeriod = true) {
  const hours24 = Math.floor(minutes / 60) % 24;
  const mins = String(minutes % 60).padStart(2, '0');
  const period = hours24 < 12 ? 'am' : 'pm';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return includePeriod ? `${hours12}:${mins} ${period}` : `${hours12}:${mins}`;
}

function formatWindowRange(startStr, endStr) {
  const startMin = parseTimeToMinutes(startStr);
  const endMin = parseTimeToMinutes(endStr);
  if (startMin === null || endMin === null) return '';

  const startIsAm = Math.floor(startMin / 60) < 12;
  const endIsAm = Math.floor(endMin / 60) < 12;
  const samePeriod = startIsAm === endIsAm;

  const startFormatted = formatHour12(startMin, !samePeriod);
  const endFormatted = formatHour12(endMin, true);
  return `${startFormatted}-${endFormatted}`;
}

/**
 * Genera el texto resumen de horas pico derivado directamente de `HORAS_PICO_POR_TIPO`
 * (ej. "Horas pico: 5:00-6:00 am y 6:00-8:00 pm").
 */
export function getPeakSummary(typeInput) {
  const canonicalType = resolvePeakPlaceType(typeInput);
  if (!canonicalType) return '';

  const windows = HORAS_PICO_POR_TIPO[canonicalType] || [];
  const formattedRanges = windows
    .map((w) => formatWindowRange(w.start, w.end))
    .filter(Boolean);

  if (formattedRanges.length === 0) return '';
  if (formattedRanges.length === 1) {
    return `Horas pico: ${formattedRanges[0]}`;
  }

  const allButLast = formattedRanges.slice(0, -1).join(', ');
  const last = formattedRanges[formattedRanges.length - 1];
  return `Horas pico: ${allButLast} y ${last}`;
}

/**
 * Devuelve los marcadores de etiquetas de hora cada 2 horas debajo del gráfico
 * (4:00, 6:00, 8:00, ..., 22:00) junto con su índice de barra correspondiente.
 */
export function getPeakHourAxisTicks() {
  const startMinutes = PEAK_START_HOUR * 60;
  const ticks = [];

  for (let hour = PEAK_START_HOUR; hour <= PEAK_END_HOUR; hour += 2) {
    const minute = hour * 60;
    const barIndex = Math.round((minute - startMinutes) / PEAK_STEP_MINUTES);
    ticks.push({
      hour,
      label: `${hour}:00`,
      barIndex,
    });
  }

  return ticks;
}
