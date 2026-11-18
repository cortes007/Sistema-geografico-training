import Feature from 'ol/Feature';
import GeoJSON from 'ol/format/GeoJSON';
import MultiPolygon from 'ol/geom/MultiPolygon';
import { Fill, Stroke, Style, Text } from 'ol/style';
import {
  ZONA_INITIAL_RESOLUTION,
  ZONA_LABEL_MIN_ZOOM,
  ZONA_MAX_ZOOM,
  ZONA_MIN_ZOOM,
  ZONAS_DEPORTIVAS,
} from '../../config/zonasDeportivas';
import { colorWithAlpha, THEME_COLORS } from '../../constants/themeColors';
import { getTrainingSpotPoint } from '../trainingSpotGeometry';

const zoneStyleCache = new Map();

/**
 * Calcula el nivel de zoom Web Mercator (EPSG:3857) a partir de la resolución.
 */
export function getZoomForResolution(
  resolution,
  initialResolution = ZONA_INITIAL_RESOLUTION
) {
  if (!Number.isFinite(resolution) || resolution <= 0) return null;
  return Math.log2(initialResolution / resolution);
}

/**
 * Extrae el identificador OSM (`id` o `properties['@id']`) de un feature GeoJSON crudo.
 */
export function getRawFeatureOsmId(rawFeature) {
  if (!rawFeature || typeof rawFeature !== 'object') return '';
  const id = rawFeature.properties?.['@id'] ?? rawFeature.id ?? '';
  return String(id).trim();
}

/**
 * Indexa los features poligonales (`Polygon` y `MultiPolygon`) de una colección GeoJSON
 * por su identificador de OpenStreetMap (`way/...`, `relation/...`).
 */
export function indexPolygonFeaturesById(geojsonCollection) {
  const index = new Map();
  const features = geojsonCollection?.features;
  if (!Array.isArray(features)) return index;

  for (let i = 0; i < features.length; i += 1) {
    const rawFeature = features[i];
    const geomType = rawFeature?.geometry?.type;
    if (geomType !== 'Polygon' && geomType !== 'MultiPolygon') {
      continue;
    }

    const osmId = getRawFeatureOsmId(rawFeature);
    if (osmId && !index.has(osmId)) {
      index.set(osmId, rawFeature);
    }
  }

  return index;
}

/**
 * Construye las `ol/Feature` de las zonas deportivas a partir del GeoJSON primario
 * (`zonas_deportiva.geojson`) y el GeoJSON de respaldo (`parques_aburra.geojson`),
 * proyectando de `EPSG:4326` a `EPSG:3857` con `ol/format/GeoJSON` sin simplificar
 * ni alterar las coordenadas originales.
 *
 * @param {object} params
 * @param {object} params.primaryGeojson FeatureCollection principal (en EPSG:4326).
 * @param {object} [params.fallbackGeojson] FeatureCollection de respaldo (en EPSG:4326).
 * @param {Array} [params.zonasConfig] Lista de `{ id, nombre, osmIds }`.
 * @param {string} [params.dataProjection='EPSG:4326'] CRS de entrada del GeoJSON.
 * @param {string} [params.featureProjection='EPSG:3857'] CRS de salida para el mapa.
 */
export function buildZonasDeportivasFeatures({
  primaryGeojson = null,
  fallbackGeojson = null,
  zonasConfig = ZONAS_DEPORTIVAS,
  dataProjection = 'EPSG:4326',
  featureProjection = 'EPSG:3857',
} = {}) {
  const primaryIndex = indexPolygonFeaturesById(primaryGeojson);
  const fallbackIndex = indexPolygonFeaturesById(fallbackGeojson);
  const format = new GeoJSON({
    dataProjection,
    featureProjection,
  });

  const features = [];
  const drawnZones = [];
  const missingZones = [];

  for (let i = 0; i < (zonasConfig ?? []).length; i += 1) {
    const zona = zonasConfig[i];
    const osmIds = Array.isArray(zona?.osmIds)
      ? zona.osmIds.map((id) => String(id).trim()).filter(Boolean)
      : [];

    if (osmIds.length === 0) {
      missingZones.push({
        id: zona.id,
        nombre: zona.nombre,
        missingOsmIds: [],
        reason: 'sin_osm_id_configurado',
      });
      continue;
    }

    const matchedRawFeatures = [];
    const sourcesUsed = new Set();
    const missingOsmIds = [];

    for (let j = 0; j < osmIds.length; j += 1) {
      const osmId = osmIds[j];
      if (primaryIndex.has(osmId)) {
        matchedRawFeatures.push(primaryIndex.get(osmId));
        sourcesUsed.add('primary');
      } else if (fallbackIndex.has(osmId)) {
        matchedRawFeatures.push(fallbackIndex.get(osmId));
        sourcesUsed.add('fallback');
      } else {
        missingOsmIds.push(osmId);
      }
    }

    if (matchedRawFeatures.length === 0 || missingOsmIds.length > 0) {
      missingZones.push({
        id: zona.id,
        nombre: zona.nombre,
        missingOsmIds,
        reason: 'id_no_encontrado_en_geojson',
      });
      continue;
    }

    // Lectura directa con ol/format/GeoJSON de EPSG:4326 a EPSG:3857 sin simplificar
    const parsedGeometries = matchedRawFeatures
      .map((raw) => format.readFeature(raw)?.getGeometry?.())
      .filter(Boolean);

    if (parsedGeometries.length === 0) {
      missingZones.push({
        id: zona.id,
        nombre: zona.nombre,
        missingOsmIds: osmIds,
        reason: 'geometria_vacia',
      });
      continue;
    }

    let finalGeometry;
    if (parsedGeometries.length === 1) {
      finalGeometry = parsedGeometries[0];
    } else {
      const multiCoordinates = [];
      parsedGeometries.forEach((geom) => {
        if (geom.getType() === 'Polygon') {
          multiCoordinates.push(geom.getCoordinates());
        } else if (geom.getType() === 'MultiPolygon') {
          multiCoordinates.push(...geom.getCoordinates());
        }
      });
      finalGeometry = new MultiPolygon(multiCoordinates);
    }

    const labelPoint = getTrainingSpotPoint(finalGeometry);
    const feature = new Feature({
      geometry: finalGeometry,
      zonaId: zona.id,
      zonaNombre: zona.nombre,
      osmIds,
      labelPoint,
    });
    feature.setId(`zona-${zona.id}`);

    features.push(feature);
    drawnZones.push({
      id: zona.id,
      nombre: zona.nombre,
      osmIds,
      geometryType: finalGeometry.getType(),
      sources: Array.from(sourcesUsed),
    });
  }

  return {
    features,
    drawnZones,
    missingZones,
  };
}

/**
 * Crea el estilo de contorno morado suave (trazo sólido 2px, relleno 11% opacidad,
 * sin línea punteada) y etiqueta con el nombre de config desde `ZONA_LABEL_MIN_ZOOM`.
 * La zona se dibuja siempre dentro de los umbrales de zoom sin depender de los chips de categoría.
 */
export function getZonaDeportivaStyle(zonaFeature, resolution) {
  if (!zonaFeature) return null;

  const zoom =
    resolution !== undefined ? getZoomForResolution(resolution) : ZONA_LABEL_MIN_ZOOM;

  if (zoom !== null && (zoom < ZONA_MIN_ZOOM || zoom > ZONA_MAX_ZOOM)) {
    return null;
  }

  const zonaNombre = zonaFeature.get('zonaNombre') || '';
  const showLabel = Boolean(zonaNombre) && (zoom === null || zoom >= ZONA_LABEL_MIN_ZOOM);
  const cacheKey = `${zonaNombre}|${showLabel ? 'label' : 'nolabel'}`;
  const cached = zoneStyleCache.get(cacheKey);
  if (cached) return cached;

  const polygonStyle = new Style({
    stroke: new Stroke({
      color: THEME_COLORS.accent,
      width: 2,
    }),
    fill: new Fill({
      color: colorWithAlpha(THEME_COLORS.accent, 0.11),
    }),
  });

  if (!showLabel) {
    zoneStyleCache.set(cacheKey, polygonStyle);
    return polygonStyle;
  }

  const labelStyle = new Style({
    geometry: (feature) =>
      feature.get('labelPoint') || getTrainingSpotPoint(feature.getGeometry()),
    text: new Text({
      text: zonaNombre,
      font: '700 12px Inter, system-ui, sans-serif',
      fill: new Fill({ color: THEME_COLORS.accent }),
      stroke: new Stroke({ color: THEME_COLORS.white, width: 3.5 }),
      textAlign: 'center',
      textBaseline: 'middle',
      overflow: false,
    }),
  });

  const combined = [polygonStyle, labelStyle];
  zoneStyleCache.set(cacheKey, combined);
  return combined;
}
