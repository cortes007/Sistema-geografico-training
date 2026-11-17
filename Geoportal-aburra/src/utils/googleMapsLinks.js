const GOOGLE_MAPS_DIR_BASE_URL = 'https://www.google.com/maps/dir/';

function isValidCoordinatePoint(point) {
  return Boolean(
    point
    && Number.isFinite(point.latitude)
    && point.latitude >= -90
    && point.latitude <= 90
    && Number.isFinite(point.longitude)
    && point.longitude >= -180
    && point.longitude <= 180
  );
}

function formatCoordinatePair(point) {
  return `${Number(point.latitude).toFixed(6)},${Number(point.longitude).toFixed(6)}`;
}

/**
 * Construye un enlace profundo de Google Maps Directions (?api=1) en EPSG:4326.
 * Si no hay origen válido, omite `origin` para que Google Maps use la ubicación del dispositivo.
 */
export function buildGoogleMapsDirectionsUrl({
  origin = null,
  destination,
  profile = 'foot',
} = {}) {
  if (!isValidCoordinatePoint(destination)) return '';

  const url = new URL(GOOGLE_MAPS_DIR_BASE_URL);
  url.searchParams.set('api', '1');
  if (isValidCoordinatePoint(origin)) {
    url.searchParams.set('origin', formatCoordinatePair(origin));
  }
  url.searchParams.set('destination', formatCoordinatePair(destination));
  url.searchParams.set('travelmode', profile === 'bike' ? 'bicycling' : 'walking');
  return url.toString();
}
