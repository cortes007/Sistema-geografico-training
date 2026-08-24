import { useCallback } from 'react';
import GeoJSON from 'ol/format/GeoJSON';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Style, Stroke, Fill, Circle as CircleStyle } from 'ol/style';
import shp from 'shpjs';
import JSZip from 'jszip';
import { useMapContext } from '../context/MapContext';
import { getEquipmentTypeFromProperties, EQUIPMENT_TYPE_STYLES } from '../constants/equipmentTypes';
import { parsePrj, detectGeojsonCrs } from '../utils/gis/prjParser';

const defaultStyle = new Style({
  stroke: new Stroke({ color: '#2563eb', width: 2 }),
  fill: new Fill({ color: 'rgba(37, 99, 235, 0.15)' }),
  image: new CircleStyle({
    radius: 6,
    fill: new Fill({ color: '#2563eb' }),
    stroke: new Stroke({ color: '#ffffff', width: 1.5 }),
  }),
});

function getFeatureStyle(feature) {
  const type = getEquipmentTypeFromProperties(feature?.getProperties?.() || feature?.properties || {});
  const palette = EQUIPMENT_TYPE_STYLES[type] || EQUIPMENT_TYPE_STYLES['gimnasio'];

  return new Style({
    stroke: new Stroke({ color: palette.color, width: 2 }),
    fill: new Fill({ color: palette.fill }),
    image: new CircleStyle({
      radius: 6,
      fill: new Fill({ color: palette.color }),
      stroke: new Stroke({ color: '#ffffff', width: 1.5 }),
    }),
  });
}

export function useLayerLoader() {
  const { map, addLayer } = useMapContext();

  const addVectorLayer = useCallback(
    (geojson, sourceCode, name, crsLabel) => {
      const format = new GeoJSON({
        dataProjection: sourceCode,
        featureProjection: map.getView().getProjection(),
      });
      const features = format.readFeatures(geojson);
      const source = new VectorSource({ features });
      const olLayer = new VectorLayer({
        source,
        style: (feature) => getFeatureStyle(feature),
      });
      map.addLayer(olLayer);

      const extent = source.getExtent();
      if (extent && extent.every(Number.isFinite)) {
        map.getView().fit(extent, { padding: [40, 40, 40, 40], maxZoom: 17, duration: 400 });
      }

      addLayer({
        id: crypto.randomUUID(),
        name,
        olLayer,
        sourceCode,
        sourceCRS: crsLabel,
        rawGeojson: geojson,
        visible: true,
      });
    },
    [map, addLayer]
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

  return { loadFile };
}
