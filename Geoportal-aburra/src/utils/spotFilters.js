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

function matchMunicipalityFromText(rawText) {
  const text = normalizeSearchText(rawText);
  if (!text) return '';

  if (text.includes('barbosa')) return 'Barbosa';
  if (text.includes('girardota')) return 'Girardota';
  if (text.includes('copacabana')) return 'Copacabana';
  if (text.includes('bello')) return 'Bello';
  if (text.includes('caldas')) return 'Caldas';
  if (text.includes('la estrella') || text.includes('tablaza')) return 'La Estrella';
  if (text.includes('sabaneta') || text.includes('aves maria') || text.includes('doctora')) {
    return 'Sabaneta';
  }
  if (text.includes('itagui') || text.includes('ditaires')) return 'Itagüí';
  if (text.includes('envigado') || text.includes('envigol')) return 'Envigado';
  if (
    text.includes('medellin')
    || text.includes('el poblado')
    || text.includes('laureles')
    || text.includes('belen')
    || text.includes('robledo')
    || text.includes('san cristobal')
    || text.includes('san javier')
    || text.includes('manrique')
  ) {
    return 'Medellín';
  }

  return '';
}

/**
 * Infiere el municipio del Valle de Aburrá a partir de una coordenada en EPSG:4326 ([lon, lat])
 * cuando el registro OSM no incluye la etiqueta `addr:city`.
 */
export function inferMunicipalityFromLonLat(longitude, latitude) {
  const lon = Number(longitude);
  const lat = Number(latitude);
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return '';

  // Fuera del Valle de Aburrá hacia el Oriente Antioqueño (Rionegro / El Retiro / Guarne)
  if (lon > -75.48 && lat < 6.26) return '';

  if (lat < 6.115) return 'Caldas';

  if (lat < 6.162) {
    return lon < -75.626 ? 'La Estrella' : 'Sabaneta';
  }

  if (lat < 6.192) {
    if (lon < -75.640) return 'La Estrella';
    // Eje aproximado del río Medellín entre Itagüí (occidente) y Envigado (oriente)
    const riverLon = -75.599 + (lat - 6.162) * (0.010 / 0.030);
    return lon < riverLon ? 'Itagüí' : 'Envigado';
  }

  if (lat >= 6.41 && lon > -75.41) return 'Barbosa';
  if (lat >= 6.365 && lon > -75.47) return 'Girardota';
  if (lat >= 6.33 && lon > -75.52) return 'Copacabana';
  if (lat >= 6.301) return 'Bello';

  return 'Medellín';
}

/**
 * Resuelve el municipio canónico del Valle de Aburrá para un lugar deportivo,
 * priorizando el campo `city` normalizado, luego menciones en `name`/`description`
 * y finalmente la ubicación geográfica en EPSG:4326 (`longitude`, `latitude`).
 */
export function resolveSpotMunicipality(spot) {
  if (!spot) return '';

  const rawCity = String(spot.city || '').trim();
  if (rawCity) {
    const matchedFromCity = matchMunicipalityFromText(rawCity);
    if (matchedFromCity) return matchedFromCity;
    return rawCity;
  }

  const matchedFromText = matchMunicipalityFromText(
    `${spot.name || ''} ${spot.description || ''}`
  );
  if (matchedFromText) return matchedFromText;

  return inferMunicipalityFromLonLat(spot.longitude, spot.latitude);
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

  const resolvedCity = resolveSpotMunicipality(spot);

  const normalizedQuery = normalizeSearchText(filters.query);
  if (normalizedQuery) {
    const searchable = normalizeSearchText(
      `${spot.name || ''} ${resolvedCity || spot.city || ''} ${spot.description || ''}`
    );
    if (!searchable.includes(normalizedQuery)) return false;
  }

  const normalizedMunicipality = normalizeSearchText(filters.municipality);
  if (normalizedMunicipality) {
    const spotCity = normalizeSearchText(resolvedCity);
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
