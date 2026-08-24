import { useEffect } from 'react';
import { useMapContext } from '../context/MapContext';

/**
 * Única responsabilidad: escuchar clics en el mapa y guardar la
 * coordenada (en la proyección nativa del mapa, EPSG:3857) en el contexto.
 * La transformación al CRS elegido por el usuario se hace en la UI
 * (CoordinateDisplay), no aquí.
 */
export function useCoordinateCapture() {
  const { map, setCapturedCoord } = useMapContext();

  useEffect(() => {
    if (!map) return;

    const handler = (evt) => {
      setCapturedCoord(evt.coordinate);
    };

    map.on('singleclick', handler);
    return () => map.un('singleclick', handler);
  }, [map, setCapturedCoord]);
}
