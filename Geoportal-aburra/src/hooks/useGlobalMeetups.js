import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fromLonLat } from 'ol/proj';
import { useMapContext } from '../context/useMapContext';
import { useAuth } from './useAuth';
import {
  actualizarEvento,
  cancelarAsistencia,
  confirmarAsistencia,
  crearEvento,
  eliminarEvento,
  listarEventosProximos,
  listarInscripcionesUsuario,
} from '../services/eventosService';
import { listarTrainingSpots } from '../services/trainingSpotsService';
import { getRoute } from '../services/routingService';
import { getEquipmentTypeFromProperties } from '../constants/equipmentTypes';
import { centerOnFeature, getAnimationDuration } from '../utils/gis/mapCentering';
import {
  parseLineGeometryToLonLat,
  parseSpotGeometryToLonLat,
} from '../utils/gis/spotGeometryParser';
import { buildGoogleMapsDirectionsUrl } from '../utils/googleMapsLinks';
import { resolveStepCenterLonLat } from './useDirections';

export function sortMeetupsChronologically(events = []) {
  if (!Array.isArray(events)) return [];

  return [...events].sort((first, second) => {
    const firstTime = new Date(first?.fechaHoraInicio ?? '').getTime();
    const secondTime = new Date(second?.fechaHoraInicio ?? '').getTime();
    const validFirst = Number.isFinite(firstTime);
    const validSecond = Number.isFinite(secondTime);
    if (!validFirst && !validSecond) return 0;
    if (!validFirst) return 1;
    if (!validSecond) return -1;
    return firstTime - secondTime;
  });
}

export function filterMeetupsByActivity(events = [], activityFilter = 'todas') {
  if (!Array.isArray(events)) return [];
  if (!activityFilter || activityFilter === 'todas') return events;
  return events.filter((event) => (event?.tipoActividad || 'entrenamiento') === activityFilter);
}

export function resolveMeetupTargetPlace(event) {
  if (!event) return null;

  const coordinates = parseSpotGeometryToLonLat(event.geom);
  if (!coordinates) return null;

  const longitude = Number(coordinates.longitude.toFixed(6));
  const latitude = Number(coordinates.latitude.toFixed(6));
  const trainingSpotId = event.trainingSpotId ? String(event.trainingSpotId) : `${longitude},${latitude}`;

  return {
    id: trainingSpotId,
    trainingSpotId,
    name: event.lugarNombre || event.titulo || 'Lugar deportivo',
    type: event.lugarTipo || 'Lugar deportivo',
    equipmentType: getEquipmentTypeFromProperties({
      name: event.lugarNombre,
      leisure: event.lugarTipo,
      description: event.lugarDescripcion,
    }),
    description: event.lugarDescripcion || '',
    city: event.ciudad || '',
    coordinates: [longitude, latitude],
    longitude,
    latitude,
    openingHours: '',
  };
}

export function resolveMeetupRouteOverlay(event) {
  if (!event) return null;

  const coordinates = parseLineGeometryToLonLat(event.rutaGeom);
  if (!coordinates || coordinates.length < 2) return null;

  const origin = parseSpotGeometryToLonLat(event.origenGeom);
  const destination = parseSpotGeometryToLonLat(event.destinoGeom);
  const profile = event.perfilRuta || (event.tipoActividad === 'ciclismo' ? 'bike' : 'foot');
  const label = event.tipoActividad === 'ciclismo' ? 'Ciclismo' : 'Running';

  return {
    meetupId: event.id,
    profile,
    label,
    coordinates,
    distanceMeters: Number.isFinite(event.distanciaMetros) ? event.distanciaMetros : 0,
    durationSeconds: Number.isFinite(event.duracionSegundos) ? event.duracionSegundos : 0,
    steps: [],
    showEndpoints: true,
    originCoordinates: origin ? [origin.longitude, origin.latitude] : coordinates[0],
    destinationCoordinates: destination
      ? [destination.longitude, destination.latitude]
      : coordinates[coordinates.length - 1],
  };
}

export function resolveMeetupGoogleMapsUrl(event) {
  if (!event) return '';

  const origin = parseSpotGeometryToLonLat(event.origenGeom);
  const destination = parseSpotGeometryToLonLat(event.destinoGeom) || parseSpotGeometryToLonLat(event.geom);
  if (!destination) return '';

  const profile = event.perfilRuta || (event.tipoActividad === 'ciclismo' ? 'bike' : 'foot');
  return buildGoogleMapsDirectionsUrl({ origin, destination, profile });
}

export async function loadGlobalMeetupsData({
  user = null,
  fetchEvents = listarEventosProximos,
  fetchRegistrations = listarInscripcionesUsuario,
} = {}) {
  const rawEvents = await fetchEvents();
  const events = sortMeetupsChronologically(rawEvents ?? []);

  if (!user || events.length === 0) {
    return {
      events,
      registeredIds: new Set(),
    };
  }

  try {
    const ids = await fetchRegistrations(events.map((event) => event.id));
    return {
      events,
      registeredIds: new Set(ids ?? []),
    };
  } catch (reason) {
    console.warn('No se pudieron cargar las asistencias del usuario en la agenda global.', reason);
    return {
      events,
      registeredIds: new Set(),
    };
  }
}

export function useGlobalMeetups() {
  const {
    map,
    userLocation,
    setSelectedPlace,
    clearSelectedPlace,
    route,
    setRoute,
    clearRoute,
    highlightedStep,
    setHighlightedStep,
    pickingPointTarget,
    setPickingPointTarget,
    meetupDraftPoints,
    setMeetupDraftPoints,
  } = useMapContext();
  const { user } = useAuth();
  const requestIdRef = useRef(0);
  const [events, setEvents] = useState([]);
  const [spots, setSpots] = useState([]);
  const [registeredIds, setRegisteredIds] = useState(() => new Set());
  const [activityFilter, setActivityFilter] = useState('todas');
  const [activeRouteMeetupId, setActiveRouteMeetupId] = useState(null);
  const [stepsLoadingId, setStepsLoadingId] = useState(null);
  const [actionError, setActionError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadMeetups = useCallback(async () => {
    const currentRequest = ++requestIdRef.current;
    setLoading(true);
    setError('');

    try {
      const data = await loadGlobalMeetupsData({ user });
      if (requestIdRef.current !== currentRequest) return;

      setEvents(data.events);
      setRegisteredIds(data.registeredIds);
    } catch (reason) {
      if (requestIdRef.current !== currentRequest) return;
      setError(reason.message || 'No se pudieron cargar las quedadas próximas.');
    } finally {
      if (requestIdRef.current === currentRequest) {
        setLoading(false);
      }
    }
  }, [user]);

  useEffect(() => {
    const timer = Promise.resolve().then(() => {
      loadMeetups();
    });
    return () => {
      void timer;
      requestIdRef.current += 1;
    };
  }, [loadMeetups]);

  useEffect(() => {
    let active = true;
    listarTrainingSpots()
      .then((catalog) => {
        if (active) setSpots(catalog ?? []);
      })
      .catch(() => {
        if (active) setSpots([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const filteredEvents = useMemo(
    () => filterMeetupsByActivity(events, activityFilter),
    [activityFilter, events]
  );

  const loadMeetupSteps = useCallback(async (event) => {
    const origin = parseSpotGeometryToLonLat(event?.origenGeom);
    const destination = parseSpotGeometryToLonLat(event?.destinoGeom);
    if (!origin || !destination) {
      setActionError('La quedada no tiene coordenadas válidas de origen y destino.');
      return false;
    }

    const profile = event.perfilRuta || (event.tipoActividad === 'ciclismo' ? 'bike' : 'foot');
    setStepsLoadingId(event.id);
    setActionError('');
    try {
      const result = await getRoute(origin, destination, { profile });
      clearSelectedPlace();
      setHighlightedStep(null);
      setRoute({
        ...result,
        meetupId: event.id,
        profile,
        label: event.tipoActividad === 'ciclismo' ? 'Ciclismo' : 'Running',
        showEndpoints: true,
        originCoordinates: [origin.longitude, origin.latitude],
        destinationCoordinates: [destination.longitude, destination.latitude],
      });
      setActiveRouteMeetupId(event.id);
      return true;
    } catch (reason) {
      setActionError(reason.message || 'No se pudieron cargar las indicaciones paso a paso.');
      return false;
    } finally {
      setStepsLoadingId(null);
    }
  }, [clearSelectedPlace, setHighlightedStep, setRoute]);

  const selectMeetupSpot = useCallback(
    (event) => {
      const isRouteMeetup = event?.tipoActividad === 'running' || event?.tipoActividad === 'ciclismo';
      if (isRouteMeetup) {
        const overlayRoute = resolveMeetupRouteOverlay(event);
        if (!overlayRoute) return false;
        clearSelectedPlace();
        setHighlightedStep(null);
        setRoute(overlayRoute);
        setActiveRouteMeetupId(event.id);
        setActionError('');
        void loadMeetupSteps(event);
        return true;
      }

      const place = resolveMeetupTargetPlace(event);
      if (!place) return false;

      setActiveRouteMeetupId(null);
      if (map) {
        const projected = fromLonLat(
          [place.longitude, place.latitude],
          map.getView().getProjection()
        );
        centerOnFeature(map, projected, { willSelectPlace: true });
      }
      setSelectedPlace(place);
      return true;
    },
    [clearSelectedPlace, loadMeetupSteps, map, setHighlightedStep, setRoute, setSelectedPlace]
  );

  const previewDraftRoute = useCallback(async ({ origin, destination, profile }) => {
    const result = await getRoute(origin, destination, { profile });
    clearSelectedPlace();
    setHighlightedStep(null);
    setRoute({
      ...result,
      profile,
      showEndpoints: true,
      originCoordinates: [origin.longitude, origin.latitude],
      destinationCoordinates: [destination.longitude, destination.latitude],
    });
    return result;
  }, [clearSelectedPlace, setHighlightedStep, setRoute]);

  const focusMeetupStep = useCallback((step, index) => {
    const lonLat = resolveStepCenterLonLat(step);
    if (!lonLat) return false;
    setHighlightedStep({ location: lonLat, index });
    if (map) {
      const view = map.getView();
      view.animate({
        center: fromLonLat(lonLat, view.getProjection()),
        zoom: Math.max(view.getZoom() ?? 15, 16.5),
        duration: getAnimationDuration(350),
      });
    }
    return true;
  }, [map, setHighlightedStep]);

  const toggleAttendance = useCallback(async (eventId, isRegistered) => {
    setActionError('');
    try {
      if (isRegistered) await cancelarAsistencia(eventId);
      else await confirmarAsistencia(eventId);
      await loadMeetups();
    } catch (reason) {
      setActionError(reason.message || 'No se pudo actualizar la asistencia.');
    }
  }, [loadMeetups]);

  const stopViewingRoute = useCallback(() => {
    setActiveRouteMeetupId(null);
    clearRoute();
  }, [clearRoute]);

  const deleteMeetup = useCallback(async (eventId) => {
    setActionError('');
    try {
      await eliminarEvento(eventId);
      if (activeRouteMeetupId === eventId) {
        setActiveRouteMeetupId(null);
        clearRoute();
      }
      await loadMeetups();
    } catch (reason) {
      setActionError(reason.message || 'No se pudo eliminar la quedada.');
    }
  }, [activeRouteMeetupId, clearRoute, loadMeetups]);

  const requestMapPoint = useCallback((target) => {
    setPickingPointTarget(target);
  }, [setPickingPointTarget]);

  const setDraftOrigin = useCallback((point) => {
    setMeetupDraftPoints((current) => ({ ...current, origin: point }));
  }, [setMeetupDraftPoints]);

  const setDraftDestination = useCallback((point) => {
    setMeetupDraftPoints((current) => ({ ...current, destination: point }));
  }, [setMeetupDraftPoints]);

  const resetDraftPoints = useCallback((origin = null, destination = null) => {
    setPickingPointTarget(null);
    setMeetupDraftPoints({ origin, destination });
  }, [setMeetupDraftPoints, setPickingPointTarget]);

  const prepareEditMeetup = useCallback((event) => {
    setPickingPointTarget(null);
    setMeetupDraftPoints({
      origin: parseSpotGeometryToLonLat(event?.origenGeom),
      destination: parseSpotGeometryToLonLat(event?.destinoGeom),
    });
  }, [setMeetupDraftPoints, setPickingPointTarget]);

  const saveRouteMeetup = useCallback(async (payload, eventId = null) => {
    if (eventId) {
      await actualizarEvento(eventId, payload);
    } else {
      await crearEvento(payload);
    }
    await loadMeetups();
  }, [loadMeetups]);

  return {
    user,
    userLocation,
    spots,
    events: filteredEvents,
    allEventsCount: events.length,
    registeredIds,
    activityFilter,
    setActivityFilter,
    activeRouteMeetupId,
    activeRoute: route,
    highlightedStepIndex: highlightedStep?.index ?? null,
    stepsLoadingId,
    loading,
    error,
    actionError,
    reload: loadMeetups,
    selectMeetupSpot,
    loadMeetupSteps,
    previewDraftRoute,
    focusMeetupStep,
    toggleAttendance,
    deleteMeetup,
    stopViewingRoute,
    saveRouteMeetup,
    prepareEditMeetup,
    routePickTarget: pickingPointTarget,
    draftOriginPoint: meetupDraftPoints.origin,
    draftDestinationPoint: meetupDraftPoints.destination,
    requestMapPoint,
    setDraftOrigin,
    setDraftDestination,
    resetDraftPoints,
    clearRoutePreview: clearRoute,
  };
}
