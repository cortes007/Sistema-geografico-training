import { useCallback, useRef, useState } from 'react';
import { fromLonLat } from 'ol/proj';
import { useMapContext } from '../context/useMapContext';
import { getRoute } from '../services/routingService';
import { getAnimationDuration } from '../utils/gis/mapCentering';

export function buildRouteState(result, origin, destination, extra = {}) {
  return {
    ...result,
    profile: result.profile || 'foot',
    steps: Array.isArray(result.steps) ? result.steps : [],
    destinationKey:
      destination.trainingSpotId || `${destination.longitude},${destination.latitude}`,
    originCoordinates: [origin.longitude, origin.latitude],
    destinationCoordinates: [destination.longitude, destination.latitude],
    ...extra,
  };
}

export function resolveStepCenterLonLat(step) {
  const location = step?.location;
  if (
    !Array.isArray(location)
    || location.length < 2
    || !Number.isFinite(location[0])
    || location[0] < -180
    || location[0] > 180
    || !Number.isFinite(location[1])
    || location[1] < -90
    || location[1] > 90
  ) {
    return null;
  }
  return [location[0], location[1]];
}

export function formatStepDistance(distanceMeters) {
  if (!Number.isFinite(distanceMeters) || distanceMeters < 0) return '';
  if (distanceMeters < 1000) return `${Math.round(distanceMeters)} m`;
  return `${(distanceMeters / 1000).toFixed(1)} km`;
}

export function useDirections() {
  const {
    map,
    userLocation,
    route,
    setRoute,
    clearRoute,
    routeProfile,
    setRouteProfile,
    highlightedStep,
    setHighlightedStep,
  } = useMapContext();
  const requestId = useRef(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getDirections = useCallback(async (destination, profileOverride = null, { onSuccess } = {}) => {
    if (!userLocation) {
      setError('Consulta primero tu ubicación actual para calcular la ruta.');
      return false;
    }

    const activeProfile = profileOverride || routeProfile || 'foot';
    setLoading(true);
    setError('');
    setHighlightedStep(null);
    const currentRequest = ++requestId.current;
    try {
      const result = await getRoute(userLocation, destination, { profile: activeProfile });
      if (requestId.current !== currentRequest) return false;
      setRoute(buildRouteState(result, userLocation, destination));
      onSuccess?.();
      return true;
    } catch (reason) {
      if (requestId.current !== currentRequest) return false;
      setError(reason.message || 'No se pudo calcular la ruta.');
      clearRoute();
      return false;
    } finally {
      if (requestId.current === currentRequest) setLoading(false);
    }
  }, [clearRoute, routeProfile, setHighlightedStep, setRoute, userLocation]);

  const changeProfile = useCallback(async (nextProfile, destination = null) => {
    if (nextProfile !== 'foot' && nextProfile !== 'bike') return false;
    setRouteProfile(nextProfile);
    if (!route || !destination || !userLocation) return true;
    return getDirections(destination, nextProfile);
  }, [getDirections, route, setRouteProfile, userLocation]);

  const focusStep = useCallback((step, index) => {
    const lonLat = resolveStepCenterLonLat(step);
    if (!lonLat) return false;

    setHighlightedStep({ location: lonLat, index });
    if (map) {
      const view = map.getView();
      const targetCenter = fromLonLat(lonLat, view.getProjection());
      view.animate({
        center: targetCenter,
        zoom: Math.max(view.getZoom() ?? 15, 16.5),
        duration: getAnimationDuration(350),
      });
    }
    return true;
  }, [map, setHighlightedStep]);

  const clearDirections = useCallback(() => {
    requestId.current += 1;
    clearRoute();
    setError('');
    setLoading(false);
  }, [clearRoute]);

  return {
    getDirections,
    changeProfile,
    focusStep,
    clearDirections,
    routeProfile,
    highlightedStep,
    loading,
    error,
    setError,
  };
}
