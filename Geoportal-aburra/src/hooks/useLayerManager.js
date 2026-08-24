import { useCallback, useRef, useState } from 'react';
import { useMapContext } from '../context/MapContext';
import { CRS_OPTIONS } from '../config/crsDefinitions';
import { useLayerLoader } from './useLayerLoader';
import { downloadGeoJSON, reprojectGeoJSON } from '../utils/gis/reproject';

export function useLayerManager() {
  const { layers, toggleLayerVisibility, removeLayer } = useMapContext();
  const { loadFile } = useLayerLoader();
  const inputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [targetCrsByLayer, setTargetCrsByLayer] = useState({});

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

  const openFilePicker = useCallback(() => {
    inputRef.current?.click();
  }, []);

  return {
    inputRef,
    layers,
    loading,
    error,
    targetCrsByLayer,
    setTargetCrsByLayer,
    handleFileChange,
    handleDownload,
    openFilePicker,
    toggleLayerVisibility,
    removeLayer,
    crsOptions: CRS_OPTIONS,
  };
}
