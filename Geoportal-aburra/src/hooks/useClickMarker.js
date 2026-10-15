import { useEffect } from 'react';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Circle as CircleStyle, Fill, Icon, Stroke, Style } from 'ol/style';
import { toLonLat } from 'ol/proj';
import { useMapContext } from '../context/useMapContext';
import { extractPlaceData } from '../utils/placeDetails';
import { getTrainingSpotPoint } from '../utils/trainingSpotGeometry';

const markerStyle = new Style({
  image: new CircleStyle({
    radius: 6,
    fill: new Fill({ color: '#000000' }),
    stroke: new Stroke({ color: '#ffffff', width: 1.5 }),
  }),
});

const selectionStyle = new Style({
  image: new Icon({
    src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="44" height="56" viewBox="0 0 44 56"><path d="M22 2C10.4 2 2 10.7 2 21.6 2 36.8 22 54 22 54s20-17.2 20-32.4C42 10.7 33.6 2 22 2Z" fill="#f97316" stroke="#fff" stroke-width="3"/><circle cx="22" cy="21" r="11" fill="#fff"/><circle cx="22" cy="21" r="5" fill="#f97316"/></svg>')}`,
    anchor: [0.5, 1],
    scale: 0.8,
  }),
});

function findTrainingSpotNearPixel(map, pixel) {
  const tolerance = 10;
  const samplePixels = [
    [pixel[0] - tolerance, pixel[1] - tolerance],
    [pixel[0] + tolerance, pixel[1] - tolerance],
    [pixel[0] - tolerance, pixel[1] + tolerance],
    [pixel[0] + tolerance, pixel[1] + tolerance],
  ];
  const sampleCoordinates = samplePixels.map((samplePixel) => map.getCoordinateFromPixel(samplePixel));
  const extent = [
    Math.min(...sampleCoordinates.map(([x]) => x)),
    Math.min(...sampleCoordinates.map(([, y]) => y)),
    Math.max(...sampleCoordinates.map(([x]) => x)),
    Math.max(...sampleCoordinates.map(([, y]) => y)),
  ];
  const layer = map.getLayers().getArray().find(
    (candidate) => candidate.get('trainingSpotsLayer') === true
  );
  if (!layer?.getVisible()) return null;

  const resolution = map.getView().getResolution();
  const styleFunction = layer.getStyleFunction();
  let nearestFeature = null;
  let nearestDistance = tolerance;

  layer.getFeaturesInExtent(extent).forEach((feature) => {
    if (styleFunction && !styleFunction(feature, resolution)) return;

    const geometry = getTrainingSpotPoint(feature.getGeometry());
    if (!geometry || geometry.getType() !== 'Point') return;

    const featurePixel = map.getPixelFromCoordinate(geometry.getCoordinates());
    const distance = Math.hypot(featurePixel[0] - pixel[0], featurePixel[1] - pixel[1]);
    if (distance > nearestDistance) return;

    nearestFeature = feature;
    nearestDistance = distance;
  });

  return nearestFeature;
}

export function useClickMarker() {
  const { map, setSelectedPlace, clearSelectedPlace } = useMapContext();

  useEffect(() => {
    if (!map) return;

    const markerFeature = new Feature();
    markerFeature.set('isSelectionMarker', true);
    const source = new VectorSource({ features: [markerFeature] });
    const markerLayer = new VectorLayer({
      source,
      style: (feature) => (feature.get('isSelectionMarker') ? selectionStyle : markerStyle),
    });
    markerLayer.setZIndex(1000);
    map.addLayer(markerLayer);

    const handleClick = (event) => {
      let foundFeature = null;

      map.forEachFeatureAtPixel(event.pixel, (feature) => {
        if (feature === markerFeature || feature.get('isSelectionMarker')) {
          return false;
        }
        foundFeature = feature;
        return true;
      }, {
        layerFilter: (layer) => layer.get('trainingSpotsLayer') === true,
        hitTolerance: 10,
      });
      if (!foundFeature) foundFeature = findTrainingSpotNearPixel(map, event.pixel);

      if (!foundFeature) {
        // No feature clicked, show black marker at click location
        markerFeature.setGeometry(new Point(event.coordinate));
        markerFeature.set('isSelectionMarker', false);
        clearSelectedPlace();
        return;
      }

      const geometry = getTrainingSpotPoint(foundFeature.getGeometry());
      if (!geometry || geometry.getType() !== 'Point') {
        markerFeature.setGeometry(null);
        clearSelectedPlace();
        return;
      }

      const [lon, lat] = toLonLat(geometry.getCoordinates());
      foundFeature.__lonLat = [lon, lat];
      const basePlace = extractPlaceData(foundFeature);
      const spotId = foundFeature.get('trainingSpotId')
        || foundFeature.get('id')
        || foundFeature.getId();
      const trainingSpotId = spotId === undefined || spotId === null ? null : String(spotId);
      const place = {
        ...basePlace,
        id: trainingSpotId || basePlace.id,
        feature: foundFeature,
        openingHours: foundFeature.get('opening_hours') || foundFeature.get('openingHours') || '',
        type: basePlace.type || 'Lugar deportivo',
        coordinates: [Number(lon.toFixed(6)), Number(lat.toFixed(6))],
        longitude: Number(lon.toFixed(6)),
        latitude: Number(lat.toFixed(6)),
        trainingSpotId,
      };

      markerFeature.setGeometry(new Point(geometry.getCoordinates()));
      markerFeature.set('isSelectionMarker', true);
      setSelectedPlace(place);
    };

    map.on('singleclick', handleClick);

    return () => {
      map.un('singleclick', handleClick);
      map.removeLayer(markerLayer);
      source.clear();
    };
  }, [clearSelectedPlace, map, setSelectedPlace]);
}
