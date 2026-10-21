import { useEffect } from 'react';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { circular } from 'ol/geom/Polygon';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { fromLonLat } from 'ol/proj';
import { Icon, Fill, Stroke, Style } from 'ol/style';
import { useMapContext } from '../context/useMapContext';
import { NEARBY_SEARCH_RADIUS_METERS } from '../constants/location';
import { THEME_COLORS } from '../constants/themeColors';

const locationSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><circle cx="24" cy="24" r="8" fill="${THEME_COLORS.brand}" opacity="0.28"><animate attributeName="r" values="8;21;8" dur="1.8s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.55;0;0.55" dur="1.8s" repeatCount="indefinite"/></circle><circle cx="24" cy="24" r="8" fill="${THEME_COLORS.white}" stroke="${THEME_COLORS.brand}" stroke-width="3"/></svg>`;
const locationStyle = new Style({
  image: new Icon({
    src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(locationSvg)}`,
    anchor: [0.5, 0.5],
  }),
});
const radiusStyles = {
  light: [
    new Style({
      stroke: new Stroke({ color: 'rgba(255, 255, 255, 0.9)', width: 5 }),
    }),
    new Style({
      fill: new Fill({ color: 'rgba(124, 58, 237, 0.08)' }),
      stroke: new Stroke({
        color: 'rgba(124, 58, 237, 1)',
        width: 2.5,
        lineDash: [8, 6],
      }),
    }),
  ],
  satellite: [
    new Style({
      stroke: new Stroke({ color: 'rgba(255, 255, 255, 0.9)', width: 5 }),
    }),
    new Style({
      fill: new Fill({ color: 'rgba(196, 181, 253, 0.14)' }),
      stroke: new Stroke({
        color: 'rgba(196, 181, 253, 1)',
        width: 2.5,
        lineDash: [8, 6],
      }),
    }),
  ],
};

function isSatelliteVisible(map) {
  return map.getLayers().getArray().some(
    (layer) => layer.get('baseLayer') === 'satellite' && layer.getVisible()
  );
}

export function useLocationOverlay() {
  const { map, userLocation } = useMapContext();

  useEffect(() => {
    if (!map) return undefined;

    const radiusSource = new VectorSource();
    const radiusLayer = new VectorLayer({ source: radiusSource, zIndex: 0 });
    radiusLayer.set('locationRadiusLayer', true);
    const markerSource = new VectorSource();
    const markerLayer = new VectorLayer({ source: markerSource, zIndex: 900 });
    markerLayer.set('userLocationLayer', true);
    map.addLayer(radiusLayer);
    map.addLayer(markerLayer);

    return () => {
      map.removeLayer(radiusLayer);
      map.removeLayer(markerLayer);
      radiusSource.clear();
      markerSource.clear();
    };
  }, [map]);

  useEffect(() => {
    if (!map) return;

    const layers = map.getLayers().getArray();
    const radiusLayer = layers.find((candidate) => candidate.get('locationRadiusLayer'));
    const markerLayer = layers.find((candidate) => candidate.get('userLocationLayer'));
    if (!radiusLayer || !markerLayer) return;

    const radiusSource = radiusLayer.getSource();
    const markerSource = markerLayer.getSource();
    radiusSource.clear();
    markerSource.clear();
    if (!userLocation) return;

    const projection = map.getView().getProjection();
    const center = [userLocation.longitude, userLocation.latitude];
    const radius = circular(center, NEARBY_SEARCH_RADIUS_METERS, 96);
    radius.transform('EPSG:4326', projection);

    const radiusFeature = new Feature(radius);
    radiusFeature.setStyle(() => (
      isSatelliteVisible(map) ? radiusStyles.satellite : radiusStyles.light
    ));
    const markerFeature = new Feature(new Point(fromLonLat(center, projection)));
    markerFeature.setStyle(locationStyle);
    radiusSource.addFeature(radiusFeature);
    markerSource.addFeature(markerFeature);

    map.getView().fit(radius.getExtent(), {
      padding: [60, 60, 60, 60],
      maxZoom: 15,
      duration: 500,
    });
  }, [map, userLocation]);
}
