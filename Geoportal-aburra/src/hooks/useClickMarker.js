import { useEffect } from 'react';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Circle as CircleStyle, Fill, Icon, Stroke, Style } from 'ol/style';
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
  image: new Icon({
    src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="44" height="56" viewBox="0 0 44 56"><path d="M22 2C10.4 2 2 10.7 2 21.6 2 36.8 22 54 22 54s20-17.2 20-32.4C42 10.7 33.6 2 22 2Z" fill="#f97316" stroke="#fff" stroke-width="3"/><circle cx="22" cy="21" r="11" fill="#fff"/><circle cx="22" cy="21" r="5" fill="#f97316"/></svg>')}`,
    anchor: [0.5, 1],
    scale: 0.8,
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
      foundFeature.__lonLat = [lon, lat];
      const basePlace = extractPlaceData(foundFeature);
      const place = {
        ...basePlace,
        feature: foundFeature,
        openingHours: foundFeature.get('opening_hours') || foundFeature.get('openingHours') || '',
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
