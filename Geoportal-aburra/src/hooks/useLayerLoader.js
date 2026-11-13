import { useCallback } from 'react';
import GeoJSON from 'ol/format/GeoJSON';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { useMapContext } from '../context/useMapContext';
import {
  getFeatureStyle,
  prepareTrainingSpotFeature,
} from '../utils/gis/layerStyles';
import { getAnimationDuration } from '../utils/gis/mapCentering';
import { parsePrj, detectGeojsonCrs } from '../utils/gis/prjParser';
import { reprojectGeoJSON } from '../utils/gis/reproject';
import { useTrainingSpotsLayer } from './useTrainingSpotsLayer';

export function useLayerLoader() {
  const { map, addLayer, activeEquipmentTypes } = useMapContext();
  const { loadTrainingSpots } = useTrainingSpotsLayer();

  const addVectorLayer = useCallback(
    (geojson, sourceCode, name, crsLabel) => {
      const format = new GeoJSON({
        dataProjection: sourceCode,
        featureProjection: map.getView().getProjection(),
      });
      const features = format.readFeatures(geojson);
      features.forEach((feature) => {
        prepareTrainingSpotFeature(feature);
      });
      const source = new VectorSource({ features });
      const olLayer = new VectorLayer({
        source,
        style: (feature) => getFeatureStyle(feature, activeEquipmentTypes),
      });
      map.addLayer(olLayer);

      const extent = source.getExtent();
      if (extent && extent.every(Number.isFinite)) {
        map.getView().fit(extent, {
          padding: [40, 40, 40, 40],
          maxZoom: 17,
          duration: getAnimationDuration(400),
        });
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

  const reprojectLayerOnMap = useCallback(
    (layer, targetCode) => {
      const projectedGeojson = reprojectGeoJSON(
        layer.rawGeojson,
        layer.sourceCode,
        targetCode
      );
      const format = new GeoJSON({
        dataProjection: targetCode,
        featureProjection: map.getView().getProjection(),
      });
      const features = format.readFeatures(projectedGeojson);

      features.forEach((feature) => {
        prepareTrainingSpotFeature(feature);
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
      const [{ default: JSZip }, { default: shp }] = await Promise.all([
        import('jszip'),
        import('shpjs'),
      ]);

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
          crsLabel = parsed.epsg
            ? `${parsed.name} (EPSG:${parsed.epsg})`
            : parsed.name;
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
      if (lower.endsWith('.geojson') || lower.endsWith('.json')) {
        return loadGeoJSONFile(file);
      }
      throw new Error(
        'Formato no soportado. Usa .geojson, .json o un .zip con shapefile.'
      );
    },
    [loadGeoJSONFile, loadShapefileZip]
  );

  return { loadFile, loadGeoJSONUrl, loadTrainingSpots, reprojectLayerOnMap };
}
