import { useCallback, useEffect, useRef, useState } from 'react';
import { useMapContext } from '../context/MapContext';
import { CRS_OPTIONS, getCrsLabel } from '../config/crsDefinitions';
import { useLayerLoader } from './useLayerLoader';
import { downloadGeoJSON, reprojectGeoJSON } from '../utils/gis/reproject';

export function useLayerManager() {
  const {
    map,
    layers,
    toggleLayerVisibility,
    removeLayer,
    activeEquipmentTypes,
    toggleEquipmentType,
  } = useMapContext();
  const { loadFile, loadGeoJSONUrl, reprojectLayerOnMap } = useLayerLoader();
  const inputRef = useRef(null);
  const loadedMapRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [targetCrsByLayer, setTargetCrsByLayer] = useState({});

  useEffect(() => {
    if (!map || loadedMapRef.current === map) return;

    loadedMapRef.current = map;
    setError(null);
    setLoading(true);

    loadGeoJSONUrl(
      `${import.meta.env.BASE_URL}data/parques_aburra.geojson`,
      'parques_aburra.geojson'
    )
      .catch((err) => {
        setError(err.message || 'No se pudo cargar la capa inicial.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [map, loadGeoJSONUrl]);

  const handleFileChange = useCallback(
    async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setError(null);
      setLoading(true);

      try {
        await loadFile(file);
      } catch (err) {
        setError(err.message || 'No se pudo cargar el archivo.');
      } finally {
        setLoading(false);
        event.target.value = '';
      }
    },
    [loadFile]
  );

  const handleDownload = useCallback((layer) => {
    const targetCode = targetCrsByLayer[layer.id] || 'EPSG:4326';
    const reprojected = reprojectGeoJSON(layer.rawGeojson, layer.sourceCode, targetCode);
    downloadGeoJSON(
      reprojected,
      `${layer.name.replace(/\.[^.]+$/, '')}_${targetCode.replace(':', '_')}`
    );
  }, [targetCrsByLayer]);

  const handleTargetCrsChange = useCallback(
    (layerId, targetCode) => {
      const layer = layers.find((item) => item.id === layerId);
      if (!layer) return;

      try {
        reprojectLayerOnMap(layer, targetCode);
        setTargetCrsByLayer((prev) => ({ ...prev, [layerId]: targetCode }));
        setError(null);
      } catch (err) {
        setError(err.message || 'No se pudo reproyectar la capa.');
      }
    },
    [layers, reprojectLayerOnMap]
  );

  const openFilePicker = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const getCrsDetails = useCallback((code) => {
    const option = CRS_OPTIONS.find((item) => item.code === code);
    return {
      code,
      label: option?.label || getCrsLabel(code),
      unit: option?.unit || 'unidades',
    };
  }, []);

  return {
    inputRef,
    layers,
    loading,
    error,
    targetCrsByLayer,
    handleTargetCrsChange,
    handleFileChange,
    handleDownload,
    openFilePicker,
    toggleLayerVisibility,
    removeLayer,
    activeEquipmentTypes,
    toggleEquipmentType,
    crsOptions: CRS_OPTIONS,
    getCrsDetails,
  };
}
