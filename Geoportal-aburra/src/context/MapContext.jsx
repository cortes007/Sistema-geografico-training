import { createContext, useContext, useMemo, useState, useCallback } from 'react';
import { createEmpty, extend, isEmpty } from 'ol/extent';
import { EQUIPMENT_TYPES } from '../constants/equipmentTypes';

const MapContext = createContext(null);

export function MapProvider({ children }) {
  const [map, setMap] = useState(null);
  const [layers, setLayers] = useState([]); // { id, name, olLayer, sourceCRS, sourceCode, rawGeojson, visible }
  const [activeCRS, setActiveCRS] = useState('EPSG:4326');
  const [capturedCoord, setCapturedCoord] = useState(null); // [x, y] en EPSG:3857
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [activeEquipmentTypes, setActiveEquipmentTypes] = useState(() =>
    Object.values(EQUIPMENT_TYPES).reduce((types, type) => ({ ...types, [type]: true }), {})
  );

  const addLayer = useCallback((layer) => {
    setLayers((prev) => {
      if (layer.layerKey && prev.some((item) => item.layerKey === layer.layerKey)) {
        if (map) map.removeLayer(layer.olLayer);
        return prev;
      }

      return [...prev, layer];
    });
  }, [map]);

  const removeLayer = useCallback((id) => {
    const target = layers.find((layer) => layer.id === id);
    if (!target) return;

    if (map) map.removeLayer(target.olLayer);
    const remainingLayers = layers.filter((layer) => layer.id !== id);
    setLayers(remainingLayers);

    if (selectedPlace?.feature && target.olLayer.getSource()?.hasFeature(selectedPlace.feature)) {
      setSelectedPlace(null);
    }

    if (!map || remainingLayers.length === 0) return;

    const remainingExtent = createEmpty();
    remainingLayers.forEach(({ olLayer }) => {
      const extent = olLayer.getSource()?.getExtent();
      if (extent && extent.every(Number.isFinite)) extend(remainingExtent, extent);
    });

    if (!isEmpty(remainingExtent)) {
      map.getView().fit(remainingExtent, {
        padding: [40, 40, 40, 40],
        maxZoom: 17,
        duration: 400,
      });
    }
  }, [layers, map, selectedPlace]);

  const toggleLayerVisibility = useCallback((id) => {
    setLayers((prev) =>
      prev.map((l) => {
        if (l.id === id) {
          const nextVisible = !l.visible;
          l.olLayer.setVisible(nextVisible);
          return { ...l, visible: nextVisible };
        }
        return l;
      })
    );
  }, []);

  const toggleEquipmentType = useCallback((type) => {
    setActiveEquipmentTypes((prev) => ({ ...prev, [type]: !prev[type] }));
  }, []);

  const clearSelectedPlace = useCallback(() => {
    setSelectedPlace(null);
  }, []);

  const value = useMemo(
    () => ({
      map,
      setMap,
      layers,
      addLayer,
      removeLayer,
      toggleLayerVisibility,
      activeCRS,
      setActiveCRS,
      capturedCoord,
      setCapturedCoord,
      selectedPlace,
      setSelectedPlace,
      clearSelectedPlace,
      activeEquipmentTypes,
      toggleEquipmentType,
    }),
    [
      map,
      layers,
      addLayer,
      removeLayer,
      toggleLayerVisibility,
      activeCRS,
      capturedCoord,
      selectedPlace,
      clearSelectedPlace,
      activeEquipmentTypes,
      toggleEquipmentType,
    ]
  );

  return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
}

export function useMapContext() {
  const ctx = useContext(MapContext);
  if (!ctx) throw new Error('useMapContext debe usarse dentro de <MapProvider>');
  return ctx;
}
