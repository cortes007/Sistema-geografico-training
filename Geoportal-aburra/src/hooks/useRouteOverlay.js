import { useEffect } from 'react';
import Feature from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { fromLonLat } from 'ol/proj';
import { Stroke, Style } from 'ol/style';
import { useMapContext } from '../context/useMapContext';

const routeStyle = new Style({
  stroke: new Stroke({
    color: '#9333ea',
    width: 5,
    lineCap: 'round',
    lineJoin: 'round',
  }),
});

export function useRouteOverlay() {
  const { map, route } = useMapContext();

  useEffect(() => {
    if (!map) return undefined;

    const source = new VectorSource();
    const layer = new VectorLayer({ source, zIndex: 850 });
    layer.set('routeLayer', true);
    map.addLayer(layer);

    return () => {
      map.removeLayer(layer);
      source.clear();
    };
  }, [map]);

  useEffect(() => {
    if (!map) return;

    const layer = map.getLayers().getArray().find((candidate) => candidate.get('routeLayer'));
    if (!layer) return;

    const source = layer.getSource();
    source.clear();
    if (!route?.coordinates?.length) return;

    const geometry = new LineString(route.coordinates.map((coordinate) => fromLonLat(coordinate)));
    const feature = new Feature(geometry);
    feature.setStyle(routeStyle);
    source.addFeature(feature);
    map.getView().fit(geometry.getExtent(), {
      padding: [70, 70, 70, 70],
      maxZoom: 17,
      duration: 500,
    });
  }, [map, route]);
}
