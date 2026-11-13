import { EQUIPMENT_TYPES } from '../constants/equipmentTypes';

const DAY_INDEX = {
  su: 0,
  mo: 1,
  tu: 2,
  we: 3,
  th: 4,
  fr: 5,
  sa: 6,
};

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

function expandDayRange(startDay, endDay) {
  const days = [];
  let cursor = startDay;
  for (let step = 0; step < 7; step += 1) {
    days.push(cursor);
    if (cursor === endDay) break;
    cursor = (cursor + 1) % 7;
  }
  return days;
}

function parseDaysToken(token) {
  if (!token) return new Set(ALL_DAYS);

  const normalized = token.trim().toLowerCase();
  if (!normalized) return new Set(ALL_DAYS);

  const days = new Set();
  for (const part of normalized.split(',')) {
    const piece = part.trim();
    if (!piece) continue;

    if (piece.includes('-')) {
      const [startToken, endToken] = piece.split('-').map((item) => item.trim());
      const startDay = DAY_INDEX[startToken];
      const endDay = DAY_INDEX[endToken];
      if (startDay === undefined || endDay === undefined) return null;
      expandDayRange(startDay, endDay).forEach((day) => days.add(day));
      continue;
    }

    const singleDay = DAY_INDEX[piece];
    if (singleDay === undefined) return null;
    days.add(singleDay);
  }

  return days.size > 0 ? days : null;
}

function parseMinutes(hhmm) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours === 24 && minutes === 0) return 1440;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  return hours * 60 + minutes;
}

function parseTimeRanges(timesToken) {
  const ranges = [];
  for (const part of timesToken.split(',')) {
    const [startRaw, endRaw] = part.trim().split('-');
    if (!startRaw || !endRaw) return null;

    const startMinutes = parseMinutes(startRaw);
    const endMinutes = parseMinutes(endRaw);
    if (startMinutes === null || endMinutes === null) return null;

    ranges.push([startMinutes, endMinutes]);
  }
  return ranges.length > 0 ? ranges : null;
}

function isMinutesInRanges(currentMinutes, ranges) {
  return ranges.some(([start, end]) => {
    if (start <= end) {
      return currentMinutes >= start && currentMinutes < end;
    }
    return currentMinutes >= start || currentMinutes < end;
  });
}

function evaluateRule(rule, dayOfWeek, currentMinutes) {
  const trimmed = rule.trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();
  if (lower === '24/7') return { matchedDay: true, status: 'open' };

  const match = /^([a-z,\-\s]+?)\s+(.+)$/i.exec(trimmed);
  let days = new Set(ALL_DAYS);
  let schedulePart = trimmed;

  if (match && /[a-z]{2}/i.test(match[1])) {
    const parsedDays = parseDaysToken(match[1]);
    if (!parsedDays) return null;
    days = parsedDays;
    schedulePart = match[2].trim();
  }

  if (!days.has(dayOfWeek)) {
    return { matchedDay: false, status: 'closed' };
  }

  const normalizedSchedule = schedulePart.toLowerCase();
  if (normalizedSchedule === 'off' || normalizedSchedule === 'closed') {
    return { matchedDay: true, status: 'closed' };
  }
  if (normalizedSchedule === 'open' || normalizedSchedule === '00:00-24:00') {
    return { matchedDay: true, status: 'open' };
  }

  const ranges = parseTimeRanges(schedulePart);
  if (!ranges) return null;

  return {
    matchedDay: true,
    status: isMinutesInRanges(currentMinutes, ranges) ? 'open' : 'closed',
  };
}

/**
 * Evalúa una cadena OSM opening_hours para la fecha dada.
 * Retorna 'open', 'closed' o 'unknown' si no hay datos o no es interpretable.
 */
export function evaluateOpeningHours(rawHours, now = new Date()) {
  if (typeof rawHours !== 'string') return 'unknown';

  const trimmed = rawHours.trim();
  if (!trimmed) return 'unknown';
  if (trimmed.toLowerCase() === '24/7') return 'open';

  const dayOfWeek = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const rules = trimmed.split(';').map((part) => part.trim()).filter(Boolean);
  if (rules.length === 0) return 'unknown';

  let parsedAnyRule = false;
  let matchedStatus = null;

  for (const rule of rules) {
    const outcome = evaluateRule(rule, dayOfWeek, currentMinutes);
    if (!outcome) continue;

    parsedAnyRule = true;
    if (outcome.matchedDay) {
      matchedStatus = outcome.status;
    }
  }

  if (!parsedAnyRule) return 'unknown';
  return matchedStatus ?? 'closed';
}

/**
 * Determina si un lugar está abierto en el momento actual.
 * Regla de dominio: parques de calistenia / aire libre sin horario explícito se consideran 24/7.
 */
export function isOpenNow(rawHours, { equipmentType = null, now = new Date() } = {}) {
  const status = evaluateOpeningHours(rawHours, now);
  if (status === 'open') return true;
  if (status === 'closed') return false;

  return equipmentType === EQUIPMENT_TYPES.outdoorGym;
}
