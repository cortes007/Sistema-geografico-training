import { useEffect } from 'react';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style';
import { useMapContext } from '../context/MapContext';

const markerStyle = new Style({
  image: new CircleStyle({
    radius: 6,
    fill: new Fill({ color: '#000000' }),
    stroke: new Stroke({ color: '#ffffff', width: 1.5 }),
  }),
});

export function useClickMarker() {
  const { map } = useMapContext();

  useEffect(() => {
    if (!map) return;

    const markerFeature = new Feature();
    const source = new VectorSource({ features: [markerFeature] });
    const markerLayer = new VectorLayer({
      source,
      style: markerStyle,
    });
    markerLayer.setZIndex(1000);
    map.addLayer(markerLayer);

    const handleClick = (event) => {
      // El mapa usa EPSG:3857; la coordenada del clic ya está en ese CRS.
      markerFeature.setGeometry(new Point(event.coordinate));
    };

    map.on('singleclick', handleClick);

    return () => {
      map.un('singleclick', handleClick);
      map.removeLayer(markerLayer);
      source.clear();
    };
  }, [map]);
}
