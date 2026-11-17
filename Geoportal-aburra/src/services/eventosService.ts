import { supabase } from '../lib/supabaseClient';
import type {
  ActualizarEventoDTO,
  CrearEventoDTO,
  EventoQuedada,
  GeoPointInput,
  PerfilRuta,
  QuedadaRow,
  TipoActividad,
  UUID,
} from '../types/database';
import { assertNonEmpty, throwSupabaseError, validateCoordinates } from './serviceUtils';

function mapQuedada(row: QuedadaRow): EventoQuedada {
  return {
    id: row.id,
    trainingSpotId: row.training_spot_id ?? null,
    organizadorId: row.organizador_id,
    titulo: row.titulo,
    descripcion: row.descripcion,
    fechaHoraInicio: row.fecha_hora_inicio,
    fechaHoraFin: row.fecha_hora_fin,
    fechaCreacion: row.fecha_creacion,
    lugarNombre: row.lugar_nombre,
    lugarDescripcion: row.lugar_descripcion,
    lugarTipo: row.lugar_tipo,
    ciudad: row.ciudad,
    geom: row.geom,
    asistentesConfirmados: row.asistentes_confirmados,
    tipoActividad: row.tipo_actividad ?? 'entrenamiento',
    perfilRuta: row.perfil_ruta ?? null,
    origenNombre: row.origen_nombre ?? null,
    destinoNombre: row.destino_nombre ?? null,
    origenGeom: row.origen_geom ?? null,
    destinoGeom: row.destino_geom ?? null,
    rutaGeom: row.ruta_geom ?? null,
    distanciaMetros: row.distancia_metros ?? null,
    duracionSegundos: row.duracion_segundos ?? null,
  };
}

function toEwktPoint(point: GeoPointInput | null | undefined, label: string): string {
  if (!point) {
    throw new Error(`${label} es obligatorio para quedadas de ruta.`);
  }
  validateCoordinates(point.latitude, point.longitude);
  return `SRID=4326;POINT(${point.longitude} ${point.latitude})`;
}

function toEwktLineString(coordinates: Array<[number, number]> | null | undefined): string {
  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    throw new Error('Debes calcular una ruta válida entre origen y destino antes de guardar.');
  }
  const pairs = coordinates.map(([longitude, latitude]) => {
    validateCoordinates(latitude, longitude);
    return `${longitude} ${latitude}`;
  });
  return `SRID=4326;LINESTRING(${pairs.join(', ')})`;
}

function resolveRouteProfile(tipoActividad: TipoActividad): PerfilRuta | null {
  if (tipoActividad === 'running') return 'foot';
  if (tipoActividad === 'ciclismo') return 'bike';
  return null;
}

function throwRpcError(operation: string, error: { message: string; code?: string }) {
  if (error.code === 'PGRST202') {
    throw new Error(
      `${operation}: la función RPC no está disponible en Supabase. Ejecuta sql/functions.sql en el SQL Editor y recarga el schema de PostgREST.`,
    );
  }
  throwSupabaseError(operation, error);
}

async function getAuthenticatedUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throwSupabaseError('No se pudo validar la sesión', error);
  if (!data.user) throw new Error('Debes iniciar sesión para realizar esta acción.');
  return data.user;
}

function validateDates(fechaHoraInicio: string, fechaHoraFin?: string | null) {
  const inicio = new Date(fechaHoraInicio);
  if (!fechaHoraInicio || Number.isNaN(inicio.getTime())) {
    throw new Error('La fecha de inicio no es válida.');
  }

  if (!fechaHoraFin) return;

  const fin = new Date(fechaHoraFin);
  if (Number.isNaN(fin.getTime())) {
    throw new Error('La fecha de finalización no es válida.');
  }
  if (fin <= inicio) {
    throw new Error('La fecha de finalización debe ser posterior a la de inicio.');
  }
}

function normalizeDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error('La fecha proporcionada no es válida.');
  }
  return date.toISOString();
}

async function assertOrganizer(eventoId: UUID, userId: UUID) {
  const { data, error } = await supabase
    .from('eventos_quedadas')
    .select('organizador_id, fecha_hora_inicio')
    .eq('id', eventoId)
    .maybeSingle();
  if (error) throwSupabaseError('No se pudo validar el evento', error);
  if (!data) throw new Error('La quedada no existe.');
  if (data.organizador_id !== userId) {
    throw new Error('Solo el organizador puede modificar esta quedada.');
  }
  return data;
}

export async function listarEventosProximos(): Promise<EventoQuedada[]> {
  const { data, error } = await supabase.rpc('listar_eventos_proximos', {
    training_spot_id_param: null,
  });
  if (error) throwRpcError('No se pudieron cargar los eventos próximos', error);
  return (data ?? []).map(mapQuedada);
}

export async function listarEventosPorSpot(trainingSpotId: string): Promise<EventoQuedada[]> {
  const spotId = assertNonEmpty(trainingSpotId, 'El lugar de la quedada');
  const { data, error } = await supabase.rpc('listar_eventos_proximos', {
    training_spot_id_param: spotId,
  });
  if (error) throwRpcError('No se pudieron cargar las quedadas del lugar', error);
  return (data ?? []).map(mapQuedada);
}

export async function crearEvento(datosEvento: CrearEventoDTO): Promise<EventoQuedada> {
  const user = await getAuthenticatedUser();
  const titulo = assertNonEmpty(datosEvento.titulo, 'El título del evento');
  const tipoActividad: TipoActividad = datosEvento.tipoActividad ?? 'entrenamiento';
  const fechaHoraInicio = normalizeDateTime(datosEvento.fechaHoraInicio);
  const fechaHoraFin = datosEvento.fechaHoraFin?.trim() || null;
  const fechaHoraFinNormalizada = fechaHoraFin ? normalizeDateTime(fechaHoraFin) : null;
  validateDates(fechaHoraInicio, fechaHoraFinNormalizada);
  if (new Date(fechaHoraInicio) <= new Date()) {
    throw new Error('La fecha de inicio debe ser futura.');
  }

  const isRouteMeetup = tipoActividad === 'running' || tipoActividad === 'ciclismo';
  const trainingSpotId = isRouteMeetup
    ? (datosEvento.trainingSpotId?.trim() || null)
    : assertNonEmpty(datosEvento.trainingSpotId ?? '', 'El lugar de la quedada');

  const routePayload = isRouteMeetup
    ? {
        perfil_ruta: resolveRouteProfile(tipoActividad),
        origen_nombre: datosEvento.origenNombre?.trim() || null,
        destino_nombre: datosEvento.destinoNombre?.trim() || null,
        origen_geom: toEwktPoint(datosEvento.origen, 'El punto de origen'),
        destino_geom: toEwktPoint(datosEvento.destino, 'El punto de destino'),
        ruta_geom: toEwktLineString(datosEvento.rutaCoordenadas),
        distancia_metros: datosEvento.distanciaMetros ?? null,
        duracion_segundos: datosEvento.duracionSegundos ?? null,
      }
    : {
        perfil_ruta: null,
        origen_nombre: null,
        destino_nombre: null,
        origen_geom: null,
        destino_geom: null,
        ruta_geom: null,
        distancia_metros: null,
        duracion_segundos: null,
      };

  const { data, error } = await supabase
    .from('eventos_quedadas')
    .insert({
      training_spot_id: trainingSpotId,
      organizador_id: user.id,
      titulo,
      descripcion: datosEvento.descripcion ?? null,
      fecha_hora_inicio: fechaHoraInicio,
      fecha_hora_fin: fechaHoraFinNormalizada,
      tipo_actividad: tipoActividad,
      ...routePayload,
    })
    .select('id')
    .single();
  if (error) throwSupabaseError('No se pudo crear el evento', error);
  const listado = trainingSpotId
    ? await listarEventosPorSpot(trainingSpotId)
    : await listarEventosProximos();
  const eventoCreado = listado.find((evento) => evento.id === data.id);
  if (!eventoCreado) {
    throw new Error('El evento fue creado, pero no se pudo recuperar su detalle.');
  }
  return eventoCreado;
}

export async function actualizarEvento(eventoId: UUID, cambios: ActualizarEventoDTO): Promise<void> {
  const user = await getAuthenticatedUser();
  const evento = assertNonEmpty(eventoId, 'El evento');
  const existente = await assertOrganizer(evento, user.id);
  const fechaHoraInicio = cambios.fechaHoraInicio?.trim()
    ? normalizeDateTime(cambios.fechaHoraInicio)
    : undefined;
  const fechaHoraFin = cambios.fechaHoraFin?.trim()
    ? normalizeDateTime(cambios.fechaHoraFin)
    : null;
  if (cambios.fechaHoraInicio !== undefined && !fechaHoraInicio) {
    throw new Error('La fecha de inicio no es válida.');
  }
  if (cambios.fechaHoraInicio !== undefined || cambios.fechaHoraFin !== undefined) {
    validateDates(fechaHoraInicio || existente.fecha_hora_inicio, fechaHoraFin);
  }
  if (fechaHoraInicio && new Date(fechaHoraInicio) <= new Date()) {
    throw new Error('La fecha de inicio debe ser futura.');
  }
  const update = {
    ...(cambios.trainingSpotId !== undefined
      ? { training_spot_id: cambios.trainingSpotId ? assertNonEmpty(cambios.trainingSpotId, 'El lugar de la quedada') : null }
      : {}),
    ...(cambios.titulo !== undefined ? { titulo: assertNonEmpty(cambios.titulo, 'El título del evento') } : {}),
    ...(cambios.descripcion !== undefined ? { descripcion: cambios.descripcion } : {}),
    ...(cambios.fechaHoraInicio !== undefined ? { fecha_hora_inicio: fechaHoraInicio } : {}),
    ...(cambios.fechaHoraFin !== undefined ? { fecha_hora_fin: fechaHoraFin } : {}),
    ...(cambios.tipoActividad !== undefined
      ? {
          tipo_actividad: cambios.tipoActividad,
          perfil_ruta: resolveRouteProfile(cambios.tipoActividad),
        }
      : {}),
    ...(cambios.origenNombre !== undefined ? { origen_nombre: cambios.origenNombre?.trim() || null } : {}),
    ...(cambios.destinoNombre !== undefined ? { destino_nombre: cambios.destinoNombre?.trim() || null } : {}),
    ...(cambios.origen !== undefined ? { origen_geom: toEwktPoint(cambios.origen, 'El punto de origen') } : {}),
    ...(cambios.destino !== undefined ? { destino_geom: toEwktPoint(cambios.destino, 'El punto de destino') } : {}),
    ...(cambios.rutaCoordenadas !== undefined ? { ruta_geom: toEwktLineString(cambios.rutaCoordenadas) } : {}),
    ...(cambios.distanciaMetros !== undefined ? { distancia_metros: cambios.distanciaMetros } : {}),
    ...(cambios.duracionSegundos !== undefined ? { duracion_segundos: cambios.duracionSegundos } : {}),
  };
  if (Object.keys(update).length === 0) {
    throw new Error('Debes indicar al menos un cambio para actualizar la quedada.');
  }
  const { error } = await supabase.from('eventos_quedadas').update(update).eq('id', evento);
  if (error) throwSupabaseError('No se pudo actualizar el evento', error);
}

export async function eliminarEvento(eventoId: UUID): Promise<void> {
  const user = await getAuthenticatedUser();
  const evento = assertNonEmpty(eventoId, 'El evento');
  await assertOrganizer(evento, user.id);
  const { error } = await supabase.from('eventos_quedadas').delete().eq('id', evento);
  if (error) throwSupabaseError('No se pudo eliminar el evento', error);
}

export async function confirmarAsistencia(eventoId: UUID): Promise<void> {
  await getAuthenticatedUser();
  const evento = assertNonEmpty(eventoId, 'El evento');
  const { data: eventoActual, error: eventoError } = await supabase
    .from('eventos_quedadas')
    .select('fecha_hora_inicio')
    .eq('id', evento)
    .maybeSingle();
  if (eventoError) throwSupabaseError('No se pudo validar el evento', eventoError);
  if (!eventoActual) throw new Error('La quedada no existe.');
  if (new Date(eventoActual.fecha_hora_inicio) <= new Date()) {
    throw new Error('No puedes confirmar asistencia a un evento ya pasado.');
  }
  const { error } = await supabase.rpc('confirmar_asistencia', {
    evento_id_param: evento,
  });
  if (error) throwSupabaseError('No se pudo confirmar la asistencia', error);
}

export async function cancelarAsistencia(eventoId: UUID): Promise<void> {
  await getAuthenticatedUser();
  const evento = assertNonEmpty(eventoId, 'El evento');
  const { error } = await supabase.rpc('cancelar_asistencia', {
    evento_id_param: evento,
  });
  if (error) throwSupabaseError('No se pudo cancelar la asistencia', error);
}

export async function usuarioEstaInscrito(eventoId: UUID): Promise<boolean> {
  const user = await getAuthenticatedUser();
  const { data, error } = await supabase
    .from('asistencias_evento')
    .select('evento_id')
    .eq('evento_id', eventoId)
    .eq('usuario_id', user.id)
    .maybeSingle();
  if (error) throwSupabaseError('No se pudo consultar la asistencia', error);
  return Boolean(data);
}

export async function listarInscripcionesUsuario(eventoIds: UUID[]): Promise<UUID[]> {
  const uniqueIds = Array.from(
    new Set((eventoIds ?? []).map((id) => id?.trim()).filter(Boolean)),
  );
  if (uniqueIds.length === 0) return [];

  const user = await getAuthenticatedUser();
  const { data, error } = await supabase
    .from('asistencias_evento')
    .select('evento_id')
    .in('evento_id', uniqueIds)
    .eq('usuario_id', user.id);
  if (error) throwSupabaseError('No se pudieron consultar las asistencias', error);
  return (data ?? []).map((row) => row.evento_id);
}