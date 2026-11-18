import { useEffect, useRef } from 'react';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import {
  PARQUES_ABURRA_FALLBACK_URL,
  ZONA_MAX_ZOOM,
  ZONA_MIN_ZOOM,
  ZONAS_DEPORTIVAS,
  ZONAS_DEPORTIVAS_GEOJSON_URL,
} from '../config/zonasDeportivas';
import { useMapContext } from '../context/useMapContext';
import {
  buildZonasDeportivasFeatures,
  getZonaDeportivaStyle,
} from '../utils/gis/zonasDeportivasUtils';

let cachedGeojsonPromise = null;

/**
 * Descarga y parsea un archivo GeoJSON estático reportando ruta, HTTP status y error de parseo.
 */
export async function fetchGeojsonWithDiagnostics(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Error al cargar GeoJSON (${url}): HTTP ${response.status} ${response.statusText}`
    );
  }

  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (parseError) {
    throw new Error(
      `Error al parsear JSON (${url}): ${parseError.message}`,
      { cause: parseError }
    );
  }
}

/**
 * Carga una sola vez el GeoJSON principal de zonas deportivas y el de respaldo.
 */
export function loadZonasGeojsonSources() {
  if (!cachedGeojsonPromise) {
    cachedGeojsonPromise = Promise.allSettled([
      fetchGeojsonWithDiagnostics(ZONAS_DEPORTIVAS_GEOJSON_URL),
      fetchGeojsonWithDiagnostics(PARQUES_ABURRA_FALLBACK_URL),
    ]).then(([primaryResult, fallbackResult]) => {
      if (primaryResult.status === 'rejected') {
        console.error(primaryResult.reason?.message || primaryResult.reason);
      }
      if (fallbackResult.status === 'rejected') {
        console.error(fallbackResult.reason?.message || fallbackResult.reason);
      }

      return {
        primaryGeojson:
          primaryResult.status === 'fulfilled' ? primaryResult.value : null,
        fallbackGeojson:
          fallbackResult.status === 'fulfilled' ? fallbackResult.value : null,
      };
    });
  }

  return cachedGeojsonPromise;
}

export function clearZonasGeojsonCache() {
  cachedGeojsonPromise = null;
}

/**
 * Gestiona la capa vectorial independiente (`zIndex: 100`, no interactiva)
 * con los polígonos reales de OpenStreetMap de las zonas deportivas principales.
 */
export function useZonasDeportivasLayer() {
  const { map, layers } = useMapContext();
  const layerRef = useRef(null);
  const sourceRef = useRef(null);

  useEffect(() => {
    if (!map) return undefined;

    const source = new VectorSource();
    const layer = new VectorLayer({
      source,
      zIndex: 100,
      minZoom: ZONA_MIN_ZOOM,
      maxZoom: ZONA_MAX_ZOOM,
      declutter: true,
      style: (feature, resolution) => getZonaDeportivaStyle(feature, resolution),
    });
    layer.set('zonasDeportivasLayer', true);
    layer.set('trainingSpotsLayer', false);

    sourceRef.current = source;
    layerRef.current = layer;
    map.addLayer(layer);

    let cancelled = false;
    const featureProjection =
      map.getView()?.getProjection()?.getCode?.() || 'EPSG:3857';

    loadZonasGeojsonSources().then(({ primaryGeojson, fallbackGeojson }) => {
      if (cancelled || !sourceRef.current) return;

      const { features } = buildZonasDeportivasFeatures({
        primaryGeojson,
        fallbackGeojson,
        zonasConfig: ZONAS_DEPORTIVAS,
        dataProjection: 'EPSG:4326',
        featureProjection,
      });

      sourceRef.current.clear(true);
      if (features.length > 0) {
        sourceRef.current.addFeatures(features);
      }
      layerRef.current?.changed();
    });

    return () => {
      cancelled = true;
      map.removeLayer(layer);
      source.clear();
      sourceRef.current = null;
      layerRef.current = null;
    };
  }, [map]);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;

    const trainingLayer = layers.find((item) => item.name === 'training_spots');
    if (trainingLayer) {
      layer.setVisible(Boolean(trainingLayer.visible));
    }
  }, [layers]);
}
