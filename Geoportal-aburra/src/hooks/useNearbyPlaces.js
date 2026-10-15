import { useCallback, useEffect, useRef, useState } from 'react';
import { useMemo } from 'react';
import { fromLonLat, toLonLat } from 'ol/proj';
import TileState from 'ol/TileState';
import { useMapContext } from '../context/useMapContext';
import { listarCalificacionesAgregadasLugares } from '../services/nearbyPlacesService';
import { NEARBY_SEARCH_RADIUS_METERS } from '../constants/location';
import { getEquipmentTypeFromProperties } from '../constants/equipmentTypes';
import { getTrainingSpotPoint } from '../utils/trainingSpotGeometry';

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
  const [trainingSpotFeatures, setTrainingSpotFeatures] = useState([]);

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

  useEffect(() => {
    if (!userLocation || !map) {
      return undefined;
    }

    const tileCollections = [];
    const localFeatures = [];
    const updateFeatures = () => {
      const featuresById = new Map();
      localFeatures.forEach((feature) => {
        const id = feature.get('trainingSpotId') ?? feature.get('id') ?? feature.getId();
        if (id !== undefined && id !== null) featuresById.set(String(id), feature);
      });
      tileCollections.forEach((tiles) => {
        tiles.forEach((tile) => {
          tile.getSourceTiles().forEach((sourceTile) => {
            if (sourceTile.getState() !== TileState.LOADED) return;

            (sourceTile.getFeatures() || []).forEach((feature) => {
              const properties = feature.getProperties();
              const id = feature.get('trainingSpotId') ?? feature.get('id') ?? feature.getId();
              const key = id ?? `${properties.name || ''}:${featuresById.size}`;
              featuresById.set(String(key), feature);
            });
          });
        });
      });
      setTrainingSpotFeatures([...featuresById.values()]);
    };

    layers
      .filter((layer) => layer.name === 'training_spots')
      .forEach((layer) => {
        const source = layer.olLayer.getSource();
        if (source?.getFeatures) {
          localFeatures.push(...source.getFeatures());
          return;
        }

        if (!source?.getTileGrid || !source?.getTile) return;

        const projection = map.getView().getProjection();
        const [centerX, centerY] = fromLonLat(
          [userLocation.longitude, userLocation.latitude],
          projection
        );
        const radius = NEARBY_SEARCH_RADIUS_METERS;
        const extent = [
          centerX - radius,
          centerY - radius,
          centerX + radius,
          centerY + radius,
        ];
        const tileGrid = source.getTileGrid();
        const zoom = tileGrid.getZForResolution(map.getView().getResolution());
        const tileRange = tileGrid.getTileRangeForExtentAndZ(extent, zoom);
        const tiles = [];
        tileCollections.push(tiles);

        source.on('tileloadend', updateFeatures);
        source.on('tileloaderror', updateFeatures);

        for (let x = tileRange.minX; x <= tileRange.maxX; x += 1) {
          for (let y = tileRange.minY; y <= tileRange.maxY; y += 1) {
            tiles.push(source.getTile(zoom, x, y, 1, projection));
          }
        }
      });

    updateFeatures();

    return () => {
      layers
        .filter((layer) => layer.name === 'training_spots')
        .forEach((layer) => {
          const source = layer.olLayer.getSource();
          source?.un('tileloadend', updateFeatures);
          source?.un('tileloaderror', updateFeatures);
        });
    };
  }, [layers, map, userLocation]);

  const places = useMemo(() => {
    const trainingSpotsLoaded = layers.some((layer) => layer.name === 'training_spots');
    if (!userLocation || !map || !ratingAggregates || !trainingSpotsLoaded) return [];

    const ratingsBySpot = new Map(
      ratingAggregates.map((rating) => [rating.trainingSpotId, rating])
    );
    const userCoordinates = [userLocation.longitude, userLocation.latitude];

    return trainingSpotFeatures
      .flatMap((feature) => {
        const trainingSpotId = feature.get('trainingSpotId') ?? feature.get('id') ?? feature.getId();
        const equipmentType = feature.get('equipmentType')
          || getEquipmentTypeFromProperties(feature.getProperties());
        const geometry = getTrainingSpotPoint(feature.getGeometry());
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
  }, [activeEquipmentTypes, layers, map, ratingAggregates, trainingSpotFeatures, userLocation]);

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
