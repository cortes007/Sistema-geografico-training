import { useEffect } from 'react';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style';
import { toLonLat } from 'ol/proj';
import { useMapContext } from '../context/MapContext';
import { extractPlaceData } from '../utils/placeDetails';

const markerStyle = new Style({
  image: new CircleStyle({
    radius: 6,
    fill: new Fill({ color: '#000000' }),
    stroke: new Stroke({ color: '#ffffff', width: 1.5 }),
  }),
});

const selectionStyle = new Style({
  image: new CircleStyle({
    radius: 8,
    fill: new Fill({ color: '#f97316' }),
    stroke: new Stroke({ color: '#ffffff', width: 2.5 }),
  }),
});

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
        if (feature.get('isSelectionMarker')) {
          return false;
        }
        foundFeature = feature;
        return true;
      });

      if (!foundFeature) {
        // No feature clicked, show black marker at click location
        markerFeature.setGeometry(new Point(event.coordinate));
        markerFeature.set('isSelectionMarker', false);
        clearSelectedPlace();
        return;
      }

      const geometry = foundFeature.getGeometry();
      if (!geometry || geometry.getType() !== 'Point') {
        markerFeature.setGeometry(null);
        clearSelectedPlace();
        return;
      }

      const [lon, lat] = toLonLat(geometry.getCoordinates());
      const basePlace = extractPlaceData(foundFeature);
      const place = {
        ...basePlace,
        type: basePlace.type || 'Lugar deportivo',
        coordinates: [Number(lon.toFixed(6)), Number(lat.toFixed(6))],
        longitude: Number(lon.toFixed(6)),
        latitude: Number(lat.toFixed(6)),
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
