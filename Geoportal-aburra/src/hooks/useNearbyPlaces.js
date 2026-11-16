import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fromLonLat, toLonLat } from 'ol/proj';
import TileState from 'ol/TileState';
import { useMapContext } from '../context/useMapContext';
import { listarCalificacionesAgregadasLugares } from '../services/nearbyPlacesService';
import { DEFAULT_SEARCH_RADIUS_METERS } from '../constants/location';
import { getEquipmentTypeFromProperties } from '../constants/equipmentTypes';
import { getTrainingSpotPoint } from '../utils/trainingSpotGeometry';
import { DEFAULT_SPOT_FILTERS, matchesSpotFilters } from '../utils/spotFilters';
import { centerOnFeature } from '../utils/gis/mapCentering';

export const NEARBY_TILE_SCAN_MAX_ZOOM = 14;

export function getNearbyScanZoom(tileGrid, viewResolution) {
  if (!tileGrid || typeof tileGrid.getZForResolution !== 'function') {
    return NEARBY_TILE_SCAN_MAX_ZOOM;
  }
  const rawZoom = tileGrid.getZForResolution(viewResolution);
  if (!Number.isFinite(rawZoom)) {
    return NEARBY_TILE_SCAN_MAX_ZOOM;
  }
  return Math.min(rawZoom, NEARBY_TILE_SCAN_MAX_ZOOM);
}

export function createBatchedTileUpdater(
  updateFn,
  requestFrame = typeof requestAnimationFrame === 'function'
    ? requestAnimationFrame
    : (cb) => setTimeout(cb, 16),
  cancelFrame = typeof cancelAnimationFrame === 'function'
    ? cancelAnimationFrame
    : clearTimeout
) {
  let frameId = null;

  const schedule = () => {
    if (frameId !== null) return;
    frameId = requestFrame(() => {
      frameId = null;
      updateFn();
    });
  };

  const cancel = () => {
    if (frameId !== null) {
      cancelFrame(frameId);
      frameId = null;
    }
  };

  return { schedule, cancel };
}

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

export function filterAndRankNearbyPlaces({
  features,
  userLocation,
  projection = 'EPSG:3857',
  radiusMeters = DEFAULT_SEARCH_RADIUS_METERS,
  ratingAggregates = [],
  activeEquipmentTypes = null,
  spotFilters = DEFAULT_SPOT_FILTERS,
  spotFilterIndex = {},
}) {
  if (!userLocation || !Array.isArray(features) || !Array.isArray(ratingAggregates)) {
    return [];
  }

  const ratingsBySpot = new Map(
    ratingAggregates.map((rating) => [rating.trainingSpotId, rating])
  );
  const effectiveIndex = {
    ratingsBySpot: spotFilterIndex?.ratingsBySpot?.size
      ? spotFilterIndex.ratingsBySpot
      : ratingsBySpot,
    upcomingSpotIds: spotFilterIndex?.upcomingSpotIds ?? new Set(),
  };
  const userCoordinates = [userLocation.longitude, userLocation.latitude];
  const effectiveRadius = radiusMeters || DEFAULT_SEARCH_RADIUS_METERS;

  return features
    .flatMap((feature) => {
      const trainingSpotId = feature.get('trainingSpotId') ?? feature.get('id') ?? feature.getId();
      const equipmentType = feature.get('equipmentType')
        || getEquipmentTypeFromProperties(feature.getProperties());
      const geometry = getTrainingSpotPoint(feature.getGeometry());
      const rating = ratingsBySpot.get(String(trainingSpotId));
      if (!trainingSpotId || !geometry || geometry.getType() !== 'Point' || !rating) {
        return [];
      }

      const candidate = {
        trainingSpotId: String(trainingSpotId),
        name: feature.get('name') || 'Lugar deportivo',
        city: feature.get('city') || '',
        equipmentType,
        openingHours: feature.get('opening_hours') || feature.get('openingHours') || '',
      };
      if (
        !matchesSpotFilters(candidate, spotFilters, effectiveIndex, {
          activeEquipmentTypes,
        })
      ) {
        return [];
      }

      const [longitude, latitude] = toLonLat(geometry.getCoordinates(), projection);
      const coordinates = [longitude, latitude];
      const distanceMeters = distanceBetweenCoordinates(userCoordinates, coordinates);
      if (distanceMeters > effectiveRadius) return [];

      return [{
        trainingSpotId: String(trainingSpotId),
        name: candidate.name,
        type: feature.get('category') || feature.get('leisure') || 'Lugar deportivo',
        city: candidate.city,
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
}

export function scanNearbyTileFeatures({
  localFeatures = [],
  tileCollections = [],
  subscribedTiles = null,
  onSourceTileChange = null,
}) {
  const featuresById = new Map();
  let hasPendingTiles = false;

  const collectFeature = (feature) => {
    const properties = feature.getProperties?.() || {};
    const id = feature.get?.('trainingSpotId') ?? feature.get?.('id') ?? feature.getId?.();
    const key = id ?? `${properties.name || ''}:${featuresById.size}`;
    featuresById.set(String(key), feature);
  };

  localFeatures.forEach((feature) => {
    const id = feature.get?.('trainingSpotId') ?? feature.get?.('id') ?? feature.getId?.();
    if (id !== undefined && id !== null) featuresById.set(String(id), feature);
  });

  tileCollections.forEach((tiles) => {
    tiles.forEach((tile) => {
      if (tile.getState?.() === TileState.EMPTY || !tile.getSourceTiles) return;

      tile.getSourceTiles().forEach((sourceTile) => {
        const state = sourceTile.getState?.();
        if (state === TileState.IDLE || state === TileState.LOADING) {
          hasPendingTiles = true;
          if (
            onSourceTileChange
            && typeof sourceTile.addEventListener === 'function'
            && (!subscribedTiles || !subscribedTiles.has(sourceTile))
          ) {
            sourceTile.addEventListener('change', onSourceTileChange);
            subscribedTiles?.add(sourceTile);
          }
          return;
        }

        if (state !== TileState.LOADED) return;

        (sourceTile.getFeatures?.() || []).forEach(collectFeature);
      });
    });
  });

  return {
    features: [...featuresById.values()],
    hasPendingTiles,
  };
}

export function useNearbyPlaces() {
  const {
    map,
    layers,
    userLocation,
    searchRadiusMeters,
    setSelectedPlace,
    activeEquipmentTypes,
    spotFilters,
    spotFilterIndex,
    ratingsVersion,
    trainingSpotsError,
  } = useMapContext();
  const requestId = useRef(0);
  const [ratingAggregates, setRatingAggregates] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tilesLoading, setTilesLoading] = useState(false);
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
    const subscribedSourceTiles = new Set();
    let scheduleUpdateFeatures = () => {};

    const updateFeatures = () => {
      const { features, hasPendingTiles } = scanNearbyTileFeatures({
        localFeatures,
        tileCollections,
        subscribedTiles: subscribedSourceTiles,
        onSourceTileChange: scheduleUpdateFeatures,
      });
      setTrainingSpotFeatures(features);
      setTilesLoading(hasPendingTiles);
    };
    const {
      schedule: nextSchedule,
      cancel: cancelScheduledUpdate,
    } = createBatchedTileUpdater(updateFeatures);
    scheduleUpdateFeatures = nextSchedule;

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
        const radius = searchRadiusMeters || DEFAULT_SEARCH_RADIUS_METERS;
        const extent = [
          centerX - radius,
          centerY - radius,
          centerX + radius,
          centerY + radius,
        ];
        const tileGrid = source.getTileGrid();
        const zoom = getNearbyScanZoom(tileGrid, map.getView().getResolution());
        const tileRange = tileGrid.getTileRangeForExtentAndZ(extent, zoom);
        const tiles = [];
        tileCollections.push(tiles);

        source.on('tileloadend', scheduleUpdateFeatures);
        source.on('tileloaderror', scheduleUpdateFeatures);

        for (let x = tileRange.minX; x <= tileRange.maxX; x += 1) {
          for (let y = tileRange.minY; y <= tileRange.maxY; y += 1) {
            tiles.push(source.getTile(zoom, x, y, 1, projection));
          }
        }
      });

    updateFeatures();

    return () => {
      cancelScheduledUpdate();
      subscribedSourceTiles.forEach((sourceTile) => {
        sourceTile.removeEventListener?.('change', scheduleUpdateFeatures);
      });
      subscribedSourceTiles.clear();
      layers
        .filter((layer) => layer.name === 'training_spots')
        .forEach((layer) => {
          const source = layer.olLayer.getSource();
          source?.un('tileloadend', scheduleUpdateFeatures);
          source?.un('tileloaderror', scheduleUpdateFeatures);
        });
    };
  }, [layers, map, searchRadiusMeters, userLocation]);

  const places = useMemo(() => {
    const trainingSpotsLoaded = layers.some((layer) => layer.name === 'training_spots');
    if (!userLocation || !map || !ratingAggregates || !trainingSpotsLoaded) return [];

    return filterAndRankNearbyPlaces({
      features: trainingSpotFeatures,
      userLocation,
      projection: map.getView().getProjection(),
      radiusMeters: searchRadiusMeters,
      ratingAggregates,
      activeEquipmentTypes,
      spotFilters,
      spotFilterIndex,
    });
  }, [
    activeEquipmentTypes,
    layers,
    map,
    ratingAggregates,
    searchRadiusMeters,
    spotFilterIndex,
    spotFilters,
    trainingSpotFeatures,
    userLocation,
  ]);

  const selectPlace = useCallback((place) => {
    if (map) {
      const projected = fromLonLat(
        [place.longitude, place.latitude],
        map.getView().getProjection()
      );
      centerOnFeature(map, projected, { willSelectPlace: true });
    }
    setSelectedPlace({
      id: place.trainingSpotId,
      name: place.name,
      type: place.type || 'Lugar deportivo',
      equipmentType: place.feature?.get('equipmentType') || null,
      coordinates: [place.longitude, place.latitude],
      longitude: place.longitude,
      latitude: place.latitude,
      trainingSpotId: place.trainingSpotId,
      feature: place.feature,
      openingHours: place.feature.get('opening_hours') || place.feature.get('openingHours') || '',
      website: place.feature?.get('website') || place.feature?.get('contact:website') || place.feature?.get('url') || '',
      instagram: place.feature?.get('contact:instagram') || place.feature?.get('instagram') || '',
    });
  }, [map, setSelectedPlace]);

  const trainingSpotsLoaded = layers.some((layer) => layer.name === 'training_spots');
  return {
    places,
    loading:
      loading
      || Boolean(userLocation && tilesLoading)
      || Boolean(userLocation && !trainingSpotsLoaded && !trainingSpotsError),
    error: error || (userLocation && !trainingSpotsLoaded ? trainingSpotsError : ''),
    selectPlace,
  };
}
