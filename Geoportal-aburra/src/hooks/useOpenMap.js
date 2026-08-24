import { useEffect } from 'react';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import { fromLonLat } from 'ol/proj';
import { useMapContext } from '../context/MapContext';

// Centro aproximado del Valle de Aburrá (sur del valle, Medellín/Envigado)
const CENTER_LONLAT = [-75.58, 6.22];
const DEFAULT_ZOOM = 12;

/**
 * Única responsabilidad: crear la instancia de OpenLayers,
 * inyectarla al contexto global y destruirla al desmontar.
 */
export function useOpenMap(targetRef) {
  const { map, setMap } = useMapContext();

  useEffect(() => {
    if (!targetRef.current) return;

    const olMap = new Map({
      target: targetRef.current,
      layers: [
        new TileLayer({
          source: new OSM(), // atribución OSM incluida por defecto
        }),
      ],
      view: new View({
        projection: 'EPSG:3857',
        center: fromLonLat(CENTER_LONLAT),
        zoom: DEFAULT_ZOOM,
      }),
    });

    requestAnimationFrame(() => olMap.updateSize());
    setMap(olMap);

    return () => {
      olMap.setTarget(undefined);
      setMap(null);
    };
  }, [setMap, targetRef]);

  return map;
}
