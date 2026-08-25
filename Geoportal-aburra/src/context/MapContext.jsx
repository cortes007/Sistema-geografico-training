import { createContext, useContext, useMemo, useState, useCallback } from 'react';
import { EQUIPMENT_TYPES } from '../constants/equipmentTypes';

const MapContext = createContext(null);

export function MapProvider({ children }) {
  const [map, setMap] = useState(null);
  const [layers, setLayers] = useState([]); // { id, name, olLayer, sourceCRS, sourceCode, rawGeojson, visible }
  const [activeCRS, setActiveCRS] = useState('EPSG:4326');
  const [capturedCoord, setCapturedCoord] = useState(null); // [x, y] en EPSG:3857
  const [activeEquipmentTypes, setActiveEquipmentTypes] = useState(() =>
    Object.values(EQUIPMENT_TYPES).reduce((types, type) => ({ ...types, [type]: true }), {})
  );

  const addLayer = useCallback((layer) => {
    setLayers((prev) => [...prev, layer]);
  }, []);

  const removeLayer = useCallback((id) => {
    setLayers((prev) => {
      const target = prev.find((l) => l.id === id);
      if (target && map) map.removeLayer(target.olLayer);
      return prev.filter((l) => l.id !== id);
    });
  }, [map]);

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
