import { isOpenNow } from './openingHours';

export const DEFAULT_SPOT_FILTERS = {
  query: '',
  municipality: '',
  minRating: 0,
  onlyWithMeetups: false,
  onlyOpenNow: false,
};

export function normalizeSearchText(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

export function hasActiveSmartFilters(filters = DEFAULT_SPOT_FILTERS) {
  return Boolean(
    normalizeSearchText(filters.query)
    || normalizeSearchText(filters.municipality)
    || Number(filters.minRating) > 0
    || filters.onlyWithMeetups
    || filters.onlyOpenNow
  );
}

/**
 * Predicado puro de filtrado combinado (AND) para lugares deportivos.
 */
export function matchesSpotFilters(
  spot,
  filters = DEFAULT_SPOT_FILTERS,
  index = {},
  { activeEquipmentTypes = null, now = new Date() } = {}
) {
  if (!spot) return false;

  const equipmentType = spot.equipmentType ?? null;
  if (activeEquipmentTypes && equipmentType && !activeEquipmentTypes[equipmentType]) {
    return false;
  }

  const normalizedQuery = normalizeSearchText(filters.query);
  if (normalizedQuery) {
    const searchable = normalizeSearchText(`${spot.name || ''} ${spot.city || ''}`);
    if (!searchable.includes(normalizedQuery)) return false;
  }

  const normalizedMunicipality = normalizeSearchText(filters.municipality);
  if (normalizedMunicipality) {
    const spotCity = normalizeSearchText(spot.city || '');
    if (spotCity !== normalizedMunicipality) return false;
  }

  const minRating = Number(filters.minRating) || 0;
  if (minRating > 0) {
    const spotId = spot.trainingSpotId ? String(spot.trainingSpotId) : '';
    const ratingInfo = spotId ? index.ratingsBySpot?.get(spotId) : null;
    if (!ratingInfo || ratingInfo.averageRating < minRating) return false;
  }

  if (filters.onlyWithMeetups) {
    const spotId = spot.trainingSpotId ? String(spot.trainingSpotId) : '';
    if (!spotId || !index.upcomingSpotIds?.has(spotId)) return false;
  }

  if (filters.onlyOpenNow) {
    if (!isOpenNow(spot.openingHours || '', { equipmentType, now })) {
      return false;
    }
  }

  return true;
}
