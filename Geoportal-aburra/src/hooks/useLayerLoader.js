import { useCallback, useEffect } from 'react';
import Feature from 'ol/Feature';
import GeoJSON from 'ol/format/GeoJSON';
import MVT from 'ol/format/MVT';
import VectorLayer from 'ol/layer/Vector';
import VectorTileLayer from 'ol/layer/VectorTile';
import VectorSource from 'ol/source/Vector';
import VectorTileSource from 'ol/source/VectorTile';
import { Style, Stroke, Fill, Circle as CircleStyle } from 'ol/style';
import shp from 'shpjs';
import JSZip from 'jszip';
import { useMapContext } from '../context/useMapContext';
import { getEquipmentTypeFromProperties, EQUIPMENT_TYPE_STYLES } from '../constants/equipmentTypes';
import { getTrainingSpotPoint } from '../utils/trainingSpotGeometry';
import { parsePrj, detectGeojsonCrs } from '../utils/gis/prjParser';
import { reprojectGeoJSON } from '../utils/gis/reproject';

const TRAINING_SPOTS_TILE_URL =
  'https://agxaidzgnbgnzihefbdf.supabase.co/functions/v1/mvt-training-spots?z={z}&x={x}&y={y}';

function loadTrainingSpotsTile(tile, url) {
  tile.setLoader(async (extent, resolution, projection) => {
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    try {
      const response = await fetch(url, {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`La tesela MVT respondió con HTTP ${response.status}.`);
      }

      const data = await response.arrayBuffer();
      const features = data.byteLength === 0
        ? []
        : tile.getFormat().readFeatures(data, {
          extent,
          featureProjection: projection,
        });
      tile.setFeatures(features);
    } catch (error) {
      console.error('No se pudo cargar la tesela MVT de training_spots.', error);
      tile.onError();
    }
  });
}

function createMarkerStyle(color, useRepresentativePoint = false) {
  return new Style({
    ...(useRepresentativePoint && {
      geometry: (feature) => getTrainingSpotPoint(feature.getGeometry()),
    }),
    image: new CircleStyle({
      radius: 6,
      fill: new Fill({ color }),
      stroke: new Stroke({ color: '#ffffff', width: 1.5 }),
    }),
  });
}

function getFeatureStyle(feature, activeEquipmentTypes, useRepresentativePoint = false) {
  const type = feature.get('equipmentType') || getEquipmentTypeFromProperties(feature.getProperties());
  const palette = type ? EQUIPMENT_TYPE_STYLES[type] : null;
  if (!palette) return createMarkerStyle('#64748b', useRepresentativePoint);
  if (!activeEquipmentTypes[type]) return null;

  return createMarkerStyle(palette.color, useRepresentativePoint);
}

export function useLayerLoader() {
  const { map, addLayer, layers, activeEquipmentTypes } = useMapContext();

  useEffect(() => {
    layers.forEach(({ olLayer, name }) => {
      olLayer.setStyle((feature) => getFeatureStyle(
        feature,
        activeEquipmentTypes,
        name === 'training_spots'
      ));
    });
  }, [layers, activeEquipmentTypes]);

  const addVectorLayer = useCallback(
    (geojson, sourceCode, name, crsLabel) => {
      const format = new GeoJSON({
        dataProjection: sourceCode,
        featureProjection: map.getView().getProjection(),
      });
      const features = format.readFeatures(geojson);
      features.forEach((feature) => {
        const type = getEquipmentTypeFromProperties(feature.getProperties());
        feature.set('equipmentType', type);
      });
      const source = new VectorSource({ features });
      const olLayer = new VectorLayer({
        source,
        style: (feature) => getFeatureStyle(feature, activeEquipmentTypes),
      });
      map.addLayer(olLayer);

      const extent = source.getExtent();
      if (extent && extent.every(Number.isFinite)) {
        map.getView().fit(extent, { padding: [40, 40, 40, 40], maxZoom: 17, duration: 400 });
      }

      addLayer({
        id: crypto.randomUUID(),
        layerKey: `${name}|${sourceCode}`,
        name,
        olLayer,
        sourceCode,
        sourceCRS: crsLabel,
        rawGeojson: geojson,
        visible: true,
      });
    },
    [map, addLayer, activeEquipmentTypes]
  );

  /** Carga un archivo .geojson / .json */
  const loadGeoJSONFile = useCallback(
    async (file) => {
      const text = await file.text();
      const geojson = JSON.parse(text);
      const { code, name } = detectGeojsonCrs(geojson);
      addVectorLayer(geojson, code, file.name, name);
    },
    [addVectorLayer]
  );

  /** Carga un GeoJSON publicado por la aplicación. */
  const loadGeoJSONUrl = useCallback(
    async (url, name) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`No se pudo cargar ${name} (${response.status}).`);
      }

      const geojson = await response.json();
      const { code, name: crsName } = detectGeojsonCrs(geojson);
      addVectorLayer(geojson, code, name, crsName);
    },
    [addVectorLayer]
  );

  /** Carga lugares deportivos desde las teselas vectoriales MVT de Supabase. */
  const loadTrainingSpots = useCallback(() => {
    if (!map) {
      throw new Error('El mapa aún no está listo.');
    }

    const format = new MVT({ featureClass: Feature });
    const source = new VectorTileSource({
      format,
      url: TRAINING_SPOTS_TILE_URL,
      tileSize: 256,
      minZoom: 0,
      maxZoom: 22,
      tileLoadFunction: loadTrainingSpotsTile,
    });
    const olLayer = new VectorTileLayer({
      source,
      style: (feature) => getFeatureStyle(feature, activeEquipmentTypes, true),
      minZoom: 0,
      maxZoom: 22,
      renderMode: 'vector',
      preload: 1,
    });
    olLayer.set('trainingSpotsLayer', true);
    map.addLayer(olLayer);

    addLayer({
      id: crypto.randomUUID(),
      layerKey: 'training_spots|mvt',
      name: 'training_spots',
      olLayer,
      sourceCode: 'EPSG:3857',
      sourceCRS: 'Vector Tiles MVT (EPSG:3857)',
      rawGeojson: null,
      visible: true,
    });
  }, [map, addLayer, activeEquipmentTypes]);

  const reprojectLayerOnMap = useCallback(
    (layer, targetCode) => {
      const projectedGeojson = reprojectGeoJSON(layer.rawGeojson, layer.sourceCode, targetCode);
      const format = new GeoJSON({
        dataProjection: targetCode,
        featureProjection: map.getView().getProjection(),
      });
      const features = format.readFeatures(projectedGeojson);

      features.forEach((feature) => {
        const type = getEquipmentTypeFromProperties(feature.getProperties());
        feature.set('equipmentType', type);
      });

      const source = layer.olLayer.getSource();
      source.clear();
      source.addFeatures(features);
      layer.olLayer.changed();
    },
    [map]
  );

  /** Carga un .zip con shapefile (.shp, .dbf, .prj, ...) */
  const loadShapefileZip = useCallback(
    async (file) => {
      const buffer = await file.arrayBuffer();

      let sourceCode = 'EPSG:4326';
      let crsLabel = 'WGS 84 (no se encontró .prj, se asume por defecto)';

      try {
        const zip = await JSZip.loadAsync(buffer);
        const prjEntry = Object.values(zip.files).find(
          (entry) => !entry.dir && entry.name.toLowerCase().endsWith('.prj')
        );

        if (prjEntry) {
          const prjText = await prjEntry.async('text');
          const parsed = parsePrj(prjText);
          sourceCode = parsed.code;
          crsLabel = parsed.epsg ? `${parsed.name} (EPSG:${parsed.epsg})` : parsed.name;
        }
      } catch (error) {
        console.warn('No se pudo leer el .prj del zip; se asume WGS84.', error);
      }

      const result = await shp(buffer);
      const geojson = Array.isArray(result) ? result[0] : result;

      if (!geojson || !geojson.type) {
        throw new Error('El archivo ZIP no contiene un shapefile válido.');
      }

      addVectorLayer(geojson, sourceCode, file.name, crsLabel);
    },
    [addVectorLayer]
  );

  const loadFile = useCallback(
    async (file) => {
      const lower = file.name.toLowerCase();
      if (lower.endsWith('.zip')) return loadShapefileZip(file);
      if (lower.endsWith('.geojson') || lower.endsWith('.json')) return loadGeoJSONFile(file);
      throw new Error('Formato no soportado. Usa .geojson, .json o un .zip con shapefile.');
    },
    [loadGeoJSONFile, loadShapefileZip]
  );

  return { loadFile, loadGeoJSONUrl, loadTrainingSpots, reprojectLayerOnMap };
}
