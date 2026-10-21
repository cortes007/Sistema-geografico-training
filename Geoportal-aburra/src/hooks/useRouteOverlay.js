import { useEffect } from 'react';
import Feature from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { fromLonLat } from 'ol/proj';
import { Stroke, Style } from 'ol/style';
import { useMapContext } from '../context/useMapContext';

const routeStyles = {
  light: [
    new Style({
      stroke: new Stroke({
        color: 'rgba(255, 255, 255, 0.9)',
        width: 9,
        lineCap: 'round',
        lineJoin: 'round',
      }),
    }),
    new Style({
      stroke: new Stroke({
        color: 'rgba(124, 58, 237, 1)',
        width: 5,
        lineCap: 'round',
        lineJoin: 'round',
      }),
    }),
  ],
  satellite: [
    new Style({
      stroke: new Stroke({
        color: 'rgba(255, 255, 255, 0.9)',
        width: 9,
        lineCap: 'round',
        lineJoin: 'round',
      }),
    }),
    new Style({
      stroke: new Stroke({
        color: 'rgba(196, 181, 253, 1)',
        width: 5,
        lineCap: 'round',
        lineJoin: 'round',
      }),
    }),
  ],
};

function isSatelliteVisible(map) {
  return map.getLayers().getArray().some(
    (layer) => layer.get('baseLayer') === 'satellite' && layer.getVisible()
  );
}

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
    feature.setStyle(() => (
      isSatelliteVisible(map) ? routeStyles.satellite : routeStyles.light
    ));
    source.addFeature(feature);
    map.getView().fit(geometry.getExtent(), {
      padding: [70, 70, 70, 70],
      maxZoom: 17,
      duration: 500,
    });
  }, [map, route]);
}
