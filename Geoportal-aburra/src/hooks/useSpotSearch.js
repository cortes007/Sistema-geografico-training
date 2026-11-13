import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fromLonLat } from 'ol/proj';
import { useMapContext } from '../context/useMapContext';
import { listarTrainingSpots } from '../services/trainingSpotsService';
import { listarCalificacionesAgregadasLugares } from '../services/nearbyPlacesService';
import { listarEventosProximos } from '../services/eventosService';
import { centerOnFeature } from '../utils/gis/mapCentering';
import {
  DEFAULT_SPOT_FILTERS,
  hasActiveSmartFilters,
  matchesSpotFilters,
} from '../utils/spotFilters';

export function buildSpotFilterIndex({
  spots = [],
  ratingAggregates = [],
  upcomingEvents = [],
} = {}) {
  const ratingsBySpot = new Map(
    ratingAggregates.map((rating) => [String(rating.trainingSpotId), rating])
  );
  const upcomingSpotIds = new Set(
    upcomingEvents
      .map((event) => event?.trainingSpotId)
      .filter((id) => id !== undefined && id !== null && id !== '')
      .map((id) => String(id))
  );
  const spotsById = new Map(
    spots
      .filter((spot) => spot?.trainingSpotId)
      .map((spot) => [String(spot.trainingSpotId), spot])
  );

  return {
    ratingsBySpot,
    upcomingSpotIds,
    spotsById,
  };
}

export function filterAndSortCatalogSpots({
  spots = [],
  spotFilters = DEFAULT_SPOT_FILTERS,
  spotFilterIndex = {},
  activeEquipmentTypes = null,
  now = new Date(),
} = {}) {
  if (!hasActiveSmartFilters(spotFilters) || !Array.isArray(spots) || spots.length === 0) {
    return [];
  }

  const ratingsBySpot = spotFilterIndex?.ratingsBySpot;
  const upcomingSpotIds = spotFilterIndex?.upcomingSpotIds;

  return spots
    .filter((spot) =>
      matchesSpotFilters(spot, spotFilters, spotFilterIndex, {
        activeEquipmentTypes,
        now,
      })
    )
    .map((spot) => {
      const id = String(spot.trainingSpotId);
      const rating = ratingsBySpot?.get(id) ?? null;
      return {
        ...spot,
        averageRating: rating?.averageRating ?? null,
        ratingCount: rating?.ratingCount ?? 0,
        rankingRating: rating?.rankingRating ?? 0,
        hasUpcomingMeetup: Boolean(upcomingSpotIds?.has(id)),
      };
    })
    .sort((first, second) => (
      second.rankingRating - first.rankingRating
      || (second.averageRating ?? 0) - (first.averageRating ?? 0)
      || second.ratingCount - first.ratingCount
      || first.name.localeCompare(second.name, 'es')
    ));
}

export function buildSelectedPlaceFromSpot(spot) {
  if (!spot) return null;

  return {
    id: spot.trainingSpotId,
    trainingSpotId: spot.trainingSpotId,
    name: spot.name,
    type: spot.type || 'Lugar deportivo',
    description: spot.description || '',
    city: spot.city || '',
    coordinates: [spot.longitude, spot.latitude],
    longitude: spot.longitude,
    latitude: spot.latitude,
    openingHours: spot.openingHours || '',
  };
}

export function useSpotSearch() {
  const {
    map,
    spotFilters,
    setSpotFilters,
    resetSpotFilters,
    spotFilterIndex,
    setSpotFilterIndex,
    activeEquipmentTypes,
    setSelectedPlace,
    ratingsVersion,
  } = useMapContext();

  const requestIdRef = useRef(0);
  const [spots, setSpots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadCatalogAndIndex = useCallback(async () => {
    const currentRequest = ++requestIdRef.current;
    setLoading(true);
    setError('');

    const [spotsResult, ratingsResult, eventsResult] = await Promise.allSettled([
      listarTrainingSpots(),
      listarCalificacionesAgregadasLugares(),
      listarEventosProximos(),
    ]);

    if (requestIdRef.current !== currentRequest) return;

    if (spotsResult.status === 'rejected') {
      setError(spotsResult.reason?.message || 'No se pudo cargar el catálogo de lugares.');
      setLoading(false);
      return;
    }

    const loadedSpots = spotsResult.value ?? [];
    const loadedRatings = ratingsResult.status === 'fulfilled' ? ratingsResult.value : [];
    const loadedEvents = eventsResult.status === 'fulfilled' ? eventsResult.value : [];

    setSpots(loadedSpots);
    setSpotFilterIndex(
      buildSpotFilterIndex({
        spots: loadedSpots,
        ratingAggregates: loadedRatings,
        upcomingEvents: loadedEvents,
      })
    );
    setLoading(false);
  }, [setSpotFilterIndex]);

  useEffect(() => {
    const timer = Promise.resolve().then(() => {
      loadCatalogAndIndex();
    });
    return () => {
      void timer;
      requestIdRef.current += 1;
    };
  }, [loadCatalogAndIndex, ratingsVersion]);

  const updateFilter = useCallback(
    (patch) => {
      setSpotFilters((prev) => ({ ...prev, ...patch }));
    },
    [setSpotFilters]
  );

  const hasActiveFilters = useMemo(
    () => hasActiveSmartFilters(spotFilters),
    [spotFilters]
  );

  const results = useMemo(
    () =>
      filterAndSortCatalogSpots({
        spots,
        spotFilters,
        spotFilterIndex,
        activeEquipmentTypes,
      }),
    [activeEquipmentTypes, spotFilterIndex, spotFilters, spots]
  );

  const selectSearchSpot = useCallback(
    (spot) => {
      const place = buildSelectedPlaceFromSpot(spot);
      if (!place) return;

      if (map) {
        const projected = fromLonLat(
          [place.longitude, place.latitude],
          map.getView().getProjection()
        );
        centerOnFeature(map, projected, { willSelectPlace: true });
      }
      setSelectedPlace(place);
    },
    [map, setSelectedPlace]
  );

  return {
    spotFilters,
    hasActiveFilters,
    results,
    loading,
    error,
    reload: loadCatalogAndIndex,
    updateFilter,
    resetSpotFilters,
    selectSearchSpot,
  };
}
