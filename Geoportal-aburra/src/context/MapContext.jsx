import { createContext, useContext, useMemo, useState, useCallback } from 'react';

const MapContext = createContext(null);

export function MapProvider({ children }) {
  const [map, setMap] = useState(null);
  const [layers, setLayers] = useState([]); // { id, name, olLayer, sourceCRS, sourceCode, rawGeojson, visible }
  const [activeCRS, setActiveCRS] = useState('EPSG:4326');
  const [capturedCoord, setCapturedCoord] = useState(null); // [x, y] en EPSG:3857

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
    }),
    [map, layers, addLayer, removeLayer, toggleLayerVisibility, activeCRS, capturedCoord]
  );

  return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
}

export function useMapContext() {
  const ctx = useContext(MapContext);
  if (!ctx) throw new Error('useMapContext debe usarse dentro de <MapProvider>');
  return ctx;
}
