import GeoJSON from 'ol/format/GeoJSON';
import Point from 'ol/geom/Point';
import { getCenter } from 'ol/extent';
import { toLonLat } from 'ol/proj';
import { supabase } from '../lib/supabaseClient';

const geoJsonFormat = new GeoJSON();

/**
 * Normaliza etiquetas OSM/QGIS a name, category y description.
 */
function normalizeSpotProperties(spot = {}) {
  return {
    name: spot.name || spot['addr:city'] || 'Punto de entrenamiento',
    category: spot.category || spot.leisure || spot.sport || spot.amenity || 'calistenia',
    description: spot.description || spot.note || '',
  };
}

/** Geometrías GeoJSON soportadas (OSM ways suelen ser Polygon). */
function isSupportedGeometry(geom) {
  if (!geom?.type || !Array.isArray(geom.coordinates)) return false;
  return ['Point', 'MultiPoint', 'Polygon', 'MultiPolygon', 'LineString', 'MultiLineString'].includes(
    geom.type
  );
}

/**
 * geom PostgREST puede incluir "crs"; se omite al armar el Feature GeoJSON.
 * Coordenadas de entrada: EPSG:4326.
 */
function spotToGeoJSONFeature(spot) {
  const { name, category, description } = normalizeSpotProperties(spot);
  return {
    type: 'Feature',
    id: spot.id,
    properties: { name, category, description },
    geometry: {
      type: spot.geom.type,
      coordinates: spot.geom.coordinates,
    },
  };
}

/**
 * Convierte Polygon/LineString/etc. a un Point visible en el mapa.
 * Geometría de entrada/salida en proyección de mapa (EPSG:3857).
 * Los polígonos pequeños de OSM (fitness_station) casi no se ven como área;
 * el punto interior restaura el comportamiento de marcadores.
 */
function toDisplayPointGeometry(geometry) {
  if (!geometry) return null;

  const type = geometry.getType();
  if (type === 'Point') return geometry;
  if (type === 'Polygon') return geometry.getInteriorPoint();
  if (type === 'MultiPolygon') {
    const first = geometry.getPolygon(0);
    return first ? first.getInteriorPoint() : new Point(getCenter(geometry.getExtent()));
  }
  if (type === 'MultiPoint') return new Point(geometry.getFirstCoordinate());

  return new Point(getCenter(geometry.getExtent()));
}

/**
 * Consulta todos los puntos de entrenamiento desde Supabase.
 * geom llega como GeoJSON (EPSG:4326) vía PostgREST.
 * select('*') tolera esquemas OSM variables (leisure, sport, amenity, etc.).
 */
export async function fetchTrainingSpots() {
  const { data, error } = await supabase
    .from('training_spots')
    .select('*');

  if (error) {
    throw new Error(error.message || 'No se pudieron cargar los training spots.');
  }

  return data ?? [];
}

/**
 * Convierte filas de training_spots a Features de OpenLayers (marcadores Point).
 * Entrada: geometría GeoJSON en EPSG:4326 (Point o Polygon, etc.).
 * Salida: Point en proyección de mapa (EPSG:3857).
 */
export function spotsToOlFeatures(spots) {
  if (!Array.isArray(spots)) return [];

  return spots
    .filter((spot) => isSupportedGeometry(spot?.geom))
    .map((spot) => {
      const feature = geoJsonFormat.readFeature(spotToGeoJSONFeature(spot), {
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:3857',
      });
      const displayPoint = toDisplayPointGeometry(feature.getGeometry());
      if (displayPoint) feature.setGeometry(displayPoint);
      feature.setId(spot.id);
      return feature;
    })
    .filter((feature) => feature.getGeometry());
}

/**
 * FeatureCollection de puntos en EPSG:4326 para rawGeojson (descarga / reproyección).
 * Usa el mismo punto representativo que el mapa, no el polígono original.
 */
export function spotsToGeoJSON(spots) {
  const features = spotsToOlFeatures(spots).map((feature) => {
    const coordinates = feature.getGeometry()?.getCoordinates?.() ?? null;
    const [lon, lat] = coordinates ? toLonLat(coordinates) : [null, null];

    return {
      type: 'Feature',
      id: feature.getId(),
      properties: {
        name: feature.get('name'),
        category: feature.get('category'),
        description: feature.get('description'),
      },
      geometry: {
        type: 'Point',
        // lon/lat en EPSG:4326
        coordinates: [lon, lat],
      },
    };
  });

  return {
    type: 'FeatureCollection',
    features,
  };
}
