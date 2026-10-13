import { useCallback, useEffect, useRef, useState } from 'react';
import { useMemo } from 'react';
import { toLonLat } from 'ol/proj';
import { useMapContext } from '../context/MapContext';
import { listarCalificacionesAgregadasLugares } from '../services/nearbyPlacesService';
import { NEARBY_SEARCH_RADIUS_METERS } from '../constants/location';

function distanceBetweenCoordinates(first, second) {
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const latitudeDelta = radians(second[1] - first[1]);
  const longitudeDelta = radians(second[0] - first[0]);
  const firstLatitude = radians(first[1]);
  const secondLatitude = radians(second[1]);
  const haversine = Math.min(1, Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(firstLatitude) * Math.cos(secondLatitude)
    * Math.sin(longitudeDelta / 2) ** 2);

  return 2 * 6_371_000 * Math.asin(Math.sqrt(haversine));
}

export function useNearbyPlaces() {
  const {
    map,
    layers,
    userLocation,
    setSelectedPlace,
    activeEquipmentTypes,
    ratingsVersion,
    trainingSpotsError,
  } = useMapContext();
  const requestId = useRef(0);
  const [ratingAggregates, setRatingAggregates] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const currentRequest = ++requestId.current;
    if (!userLocation) return undefined;

    const loadRatingAggregates = async () => {
      await Promise.resolve();
      if (requestId.current !== currentRequest) return;

      setLoading(true);
      setError('');
      try {
        const results = await listarCalificacionesAgregadasLugares();
        if (requestId.current === currentRequest) setRatingAggregates(results);
      } catch (reason) {
        if (requestId.current === currentRequest) {
          setError(reason.message || 'No se pudieron cargar las calificaciones.');
        }
      } finally {
        if (requestId.current === currentRequest) setLoading(false);
      }
    };

    loadRatingAggregates();

    return () => {
      requestId.current += 1;
    };
  }, [ratingsVersion, userLocation]);

  const places = useMemo(() => {
    if (!userLocation || !map || !ratingAggregates) return [];

    const ratingsBySpot = new Map(
      ratingAggregates.map((rating) => [rating.trainingSpotId, rating])
    );
    const userCoordinates = [userLocation.longitude, userLocation.latitude];

    return layers
      .filter((layer) => layer.name === 'training_spots')
      .flatMap((layer) => layer.olLayer.getSource().getFeatures())
      .flatMap((feature) => {
        const trainingSpotId = feature.get('trainingSpotId');
        const equipmentType = feature.get('equipmentType');
        const geometry = feature.getGeometry();
        const rating = ratingsBySpot.get(String(trainingSpotId));
        if (
          !trainingSpotId
          || !geometry
          || geometry.getType() !== 'Point'
          || !rating
          || (equipmentType && !activeEquipmentTypes[equipmentType])
        ) {
          return [];
        }

        const [longitude, latitude] = toLonLat(
          geometry.getCoordinates(),
          map.getView().getProjection()
        );
        const coordinates = [longitude, latitude];
        const distanceMeters = distanceBetweenCoordinates(userCoordinates, coordinates);
        if (distanceMeters > NEARBY_SEARCH_RADIUS_METERS) return [];

        return [{
          trainingSpotId: String(trainingSpotId),
          name: feature.get('name') || 'Lugar deportivo',
          type: feature.get('category') || feature.get('leisure') || 'Lugar deportivo',
          longitude: Number(longitude.toFixed(6)),
          latitude: Number(latitude.toFixed(6)),
          distanceMeters,
          averageRating: rating.averageRating,
          ratingCount: rating.ratingCount,
          rankingRating: rating.rankingRating,
          feature,
        }];
      })
      .sort((first, second) => (
        second.rankingRating - first.rankingRating
        || second.averageRating - first.averageRating
        || second.ratingCount - first.ratingCount
        || first.distanceMeters - second.distanceMeters
      ))
      .slice(0, 3);
  }, [activeEquipmentTypes, layers, map, ratingAggregates, userLocation]);

  const selectPlace = useCallback((place) => {
    setSelectedPlace({
      id: place.trainingSpotId,
      name: place.name,
      type: place.type || 'Lugar deportivo',
      coordinates: [place.longitude, place.latitude],
      longitude: place.longitude,
      latitude: place.latitude,
      trainingSpotId: place.trainingSpotId,
      feature: place.feature,
      openingHours: place.feature.get('opening_hours') || '',
    });
  }, [setSelectedPlace]);

  const trainingSpotsLoaded = layers.some((layer) => layer.name === 'training_spots');
  return {
    places,
    loading: loading || Boolean(userLocation && !trainingSpotsLoaded && !trainingSpotsError),
    error: error || (userLocation && !trainingSpotsLoaded ? trainingSpotsError : ''),
    selectPlace,
  };
}
