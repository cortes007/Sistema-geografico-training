import { useEffect } from 'react';
import Feature from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import Point from 'ol/geom/Point';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { fromLonLat } from 'ol/proj';
import { Circle as CircleStyle, Fill, Stroke, Style, Text } from 'ol/style';
import { useMapContext } from '../context/useMapContext';
import { getAnimationDuration } from '../utils/gis/mapCentering';

const routeStyles = {
  foot: {
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
  },
  bike: {
    light: [
      new Style({
        stroke: new Stroke({
          color: 'rgba(255, 255, 255, 0.92)',
          width: 9,
          lineCap: 'round',
          lineJoin: 'round',
        }),
      }),
      new Style({
        stroke: new Stroke({
          color: 'rgba(5, 150, 105, 1)',
          width: 5,
          lineCap: 'round',
          lineJoin: 'round',
        }),
      }),
    ],
    satellite: [
      new Style({
        stroke: new Stroke({
          color: 'rgba(255, 255, 255, 0.92)',
          width: 9,
          lineCap: 'round',
          lineJoin: 'round',
        }),
      }),
      new Style({
        stroke: new Stroke({
          color: 'rgba(52, 211, 153, 1)',
          width: 5,
          lineCap: 'round',
          lineJoin: 'round',
        }),
      }),
    ],
  },
};

function createEndpointStyle(label, fillColor) {
  return new Style({
    image: new CircleStyle({
      radius: 11,
      fill: new Fill({ color: fillColor }),
      stroke: new Stroke({ color: '#ffffff', width: 2.5 }),
    }),
    text: new Text({
      text: label,
      fill: new Fill({ color: '#ffffff' }),
      font: 'bold 11px sans-serif',
    }),
  });
}

const endpointStyles = {
  origin: createEndpointStyle('A', '#16a34a'),
  destination: createEndpointStyle('B', '#e11d48'),
};

const stepHighlightStyle = new Style({
  image: new CircleStyle({
    radius: 8,
    fill: new Fill({ color: '#f59e0b' }),
    stroke: new Stroke({ color: '#ffffff', width: 2.5 }),
  }),
});

function isSatelliteVisible(map) {
  return map.getLayers().getArray().some(
    (layer) => layer.get('baseLayer') === 'satellite' && layer.getVisible()
  );
}

export function useRouteOverlay() {
  const { map, route, highlightedStep, meetupDraftPoints } = useMapContext();

  useEffect(() => {
    if (!map) return undefined;

    const routeSource = new VectorSource();
    const routeLayer = new VectorLayer({ source: routeSource, zIndex: 850 });
    routeLayer.set('routeLayer', true);
    map.addLayer(routeLayer);

    const stepSource = new VectorSource();
    const stepLayer = new VectorLayer({ source: stepSource, zIndex: 860 });
    stepLayer.set('routeStepLayer', true);
    map.addLayer(stepLayer);

    return () => {
      map.removeLayer(stepLayer);
      map.removeLayer(routeLayer);
      stepSource.clear();
      routeSource.clear();
    };
  }, [map]);

  useEffect(() => {
    if (!map) return;

    const layer = map.getLayers().getArray().find((candidate) => candidate.get('routeLayer'));
    if (!layer) return;

    const source = layer.getSource();
    source.clear();
    if (!route?.coordinates?.length) {
      if (meetupDraftPoints?.origin) {
        const originFeature = new Feature(
          new Point(fromLonLat([meetupDraftPoints.origin.longitude, meetupDraftPoints.origin.latitude]))
        );
        originFeature.setStyle(endpointStyles.origin);
        source.addFeature(originFeature);
      }
      if (meetupDraftPoints?.destination) {
        const destinationFeature = new Feature(
          new Point(fromLonLat([meetupDraftPoints.destination.longitude, meetupDraftPoints.destination.latitude]))
        );
        destinationFeature.setStyle(endpointStyles.destination);
        source.addFeature(destinationFeature);
      }
      return;
    }

    const profile = route.profile === 'bike' ? 'bike' : 'foot';
    const geometry = new LineString(route.coordinates.map((coordinate) => fromLonLat(coordinate)));
    const feature = new Feature(geometry);
    feature.setStyle(() => (
      isSatelliteVisible(map) ? routeStyles[profile].satellite : routeStyles[profile].light
    ));
    source.addFeature(feature);

    if (route.showEndpoints) {
      if (Array.isArray(route.originCoordinates) && route.originCoordinates.length >= 2) {
        const originFeature = new Feature(new Point(fromLonLat(route.originCoordinates)));
        originFeature.setStyle(endpointStyles.origin);
        source.addFeature(originFeature);
      }
      if (Array.isArray(route.destinationCoordinates) && route.destinationCoordinates.length >= 2) {
        const destinationFeature = new Feature(new Point(fromLonLat(route.destinationCoordinates)));
        destinationFeature.setStyle(endpointStyles.destination);
        source.addFeature(destinationFeature);
      }
    }

    map.getView().fit(geometry.getExtent(), {
      padding: [70, 70, 70, 70],
      maxZoom: 17,
      duration: getAnimationDuration(500),
    });
  }, [map, meetupDraftPoints, route]);

  useEffect(() => {
    if (!map) return;

    const stepLayer = map.getLayers().getArray().find((candidate) => candidate.get('routeStepLayer'));
    if (!stepLayer) return;

    const source = stepLayer.getSource();
    source.clear();
    if (!highlightedStep?.location) return;

    const marker = new Feature(new Point(fromLonLat(highlightedStep.location)));
    marker.setStyle(stepHighlightStyle);
    source.addFeature(marker);
  }, [highlightedStep, map]);
}
