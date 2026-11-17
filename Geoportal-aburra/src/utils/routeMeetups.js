import { parseLineGeometryToLonLat } from './gis/spotGeometryParser';

export function isValidRoutePoint(point) {
  return Boolean(
    point
    && Number.isFinite(point.latitude)
    && point.latitude >= -90
    && point.latitude <= 90
    && Number.isFinite(point.longitude)
    && point.longitude >= -180
    && point.longitude <= 180
  );
}

/**
 * Extrae la vista previa de ruta guardada cuando se edita una quedada existente.
 */
export function resolveInitialRoutePreview(initialEvent) {
  if (!initialEvent) return null;
  const coordinates = parseLineGeometryToLonLat(initialEvent.rutaGeom);
  if (!coordinates || coordinates.length < 2) return null;

  return {
    coordinates,
    distanceMeters: Number.isFinite(initialEvent.distanciaMetros) ? initialEvent.distanciaMetros : 0,
    durationSeconds: Number.isFinite(initialEvent.duracionSegundos) ? initialEvent.duracionSegundos : 0,
    profile: initialEvent.perfilRuta || (initialEvent.tipoActividad === 'ciclismo' ? 'bike' : 'foot'),
  };
}

/**
 * Valida el borrador de una quedada de running o ciclismo antes de persistirla.
 */
export function validateRouteMeetupDraft(draft) {
  if (!draft || (draft.tipoActividad !== 'running' && draft.tipoActividad !== 'ciclismo')) {
    return 'Selecciona un tipo de actividad válido (Running o Ciclismo).';
  }
  if (!String(draft.titulo || '').trim()) {
    return 'El título de la quedada es obligatorio.';
  }
  const startDate = new Date(draft.fechaHoraInicio || '');
  if (!draft.fechaHoraInicio || Number.isNaN(startDate.getTime()) || startDate <= new Date()) {
    return 'Indica una fecha y hora de inicio futura.';
  }
  if (draft.fechaHoraFin) {
    const endDate = new Date(draft.fechaHoraFin);
    if (Number.isNaN(endDate.getTime()) || endDate <= startDate) {
      return 'La fecha de finalización debe ser posterior a la de inicio.';
    }
  }
  if (!isValidRoutePoint(draft.origen)) {
    return 'Selecciona el punto de origen en el mapa.';
  }
  if (!isValidRoutePoint(draft.destino)) {
    return 'Selecciona el punto de destino en el mapa.';
  }
  if (!Array.isArray(draft.routePreview?.coordinates) || draft.routePreview.coordinates.length < 2) {
    return 'Calcula y previsualiza la ruta entre origen y destino antes de publicar.';
  }
  return '';
}
