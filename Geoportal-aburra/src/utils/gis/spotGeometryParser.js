import GeoJSON from 'ol/format/GeoJSON';
import WKB from 'ol/format/WKB';
import { toLonLat } from 'ol/proj';
import { getTrainingSpotPoint } from '../trainingSpotGeometry';

const geoJsonFormat = new GeoJSON();
const wkbFormat = new WKB({ hex: true, ewkb: true });
const HEX_PATTERN = /^[0-9a-fA-F]+$/;

function toValidLonLat(coordinates) {
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null;

  const [rawX, rawY] = coordinates;
  if (!Number.isFinite(rawX) || !Number.isFinite(rawY)) return null;

  // Entrada: EPSG:4326 o EPSG:3857 (metros). Salida garantizada: EPSG:4326 [lon, lat].
  const isGeographic = Math.abs(rawX) <= 180 && Math.abs(rawY) <= 90;
  const [longitude, latitude] = isGeographic
    ? [rawX, rawY]
    : toLonLat([rawX, rawY], 'EPSG:3857');

  if (
    !Number.isFinite(longitude)
    || !Number.isFinite(latitude)
    || Math.abs(longitude) > 180
    || Math.abs(latitude) > 90
  ) {
    return null;
  }

  return { longitude, latitude };
}

function readRawGeometry(rawGeom) {
  if (!rawGeom) return null;

  if (typeof rawGeom === 'string') {
    const trimmed = rawGeom.trim();
    if (!trimmed) return null;

    if (trimmed.startsWith('{')) {
      return geoJsonFormat.readGeometry(trimmed);
    }

    const hex = trimmed.startsWith('\\x') || trimmed.startsWith('0x')
      ? trimmed.slice(2)
      : trimmed;
    if (hex.length < 18 || hex.length % 2 !== 0 || !HEX_PATTERN.test(hex)) {
      return null;
    }

    return wkbFormat.readGeometry(hex);
  }

  if (typeof rawGeom === 'object') {
    return geoJsonFormat.readGeometry(rawGeom);
  }

  return null;
}

/**
 * Decodifica una geometría de training_spot (GeoJSON o EWKB hex en EPSG:4326 / EPSG:3857)
 * y retorna su punto representativo en EPSG:4326 ({ longitude, latitude }).
 */
export function parseSpotGeometryToLonLat(rawGeom) {
  try {
    const geometry = readRawGeometry(rawGeom);
    if (!geometry) return null;

    const point = getTrainingSpotPoint(geometry);
    if (!point || point.getType() !== 'Point') return null;

    return toValidLonLat(point.getCoordinates());
  } catch {
    return null;
  }
}
