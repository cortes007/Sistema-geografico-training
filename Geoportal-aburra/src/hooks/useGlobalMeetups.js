import { useCallback, useEffect, useRef, useState } from 'react';
import { fromLonLat } from 'ol/proj';
import { useMapContext } from '../context/useMapContext';
import { useAuth } from './useAuth';
import {
  listarEventosProximos,
  listarInscripcionesUsuario,
} from '../services/eventosService';
import { centerOnFeature } from '../utils/gis/mapCentering';
import { parseSpotGeometryToLonLat } from '../utils/gis/spotGeometryParser';

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
    description: event.lugarDescripcion || '',
    city: event.ciudad || '',
    coordinates: [longitude, latitude],
    longitude,
    latitude,
    openingHours: '',
  };
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
  const { map, setSelectedPlace } = useMapContext();
  const { user } = useAuth();
  const requestIdRef = useRef(0);
  const [events, setEvents] = useState([]);
  const [registeredIds, setRegisteredIds] = useState(() => new Set());
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

  const selectMeetupSpot = useCallback(
    (event) => {
      const place = resolveMeetupTargetPlace(event);
      if (!place) return false;

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
    [map, setSelectedPlace]
  );

  return {
    events,
    registeredIds,
    loading,
    error,
    reload: loadMeetups,
    selectMeetupSpot,
  };
}
