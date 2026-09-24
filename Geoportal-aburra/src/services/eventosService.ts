import { supabase } from '../lib/supabaseClient';
import type {
  ActualizarEventoDTO,
  CrearEventoDTO,
  EventoQuedada,
  QuedadaRow,
  UUID,
} from '../types/database';
import { assertNonEmpty, throwSupabaseError } from './serviceUtils';

function mapQuedada(row: QuedadaRow): EventoQuedada {
  return {
    id: row.id,
    trainingSpotId: row.training_spot_id,
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
  };
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
  const trainingSpotId = assertNonEmpty(datosEvento.trainingSpotId, 'El lugar de la quedada');
  const fechaHoraInicio = normalizeDateTime(datosEvento.fechaHoraInicio);
  const fechaHoraFin = datosEvento.fechaHoraFin?.trim() || null;
  const fechaHoraFinNormalizada = fechaHoraFin ? normalizeDateTime(fechaHoraFin) : null;
  validateDates(fechaHoraInicio, fechaHoraFinNormalizada);
  if (new Date(fechaHoraInicio) <= new Date()) {
    throw new Error('La fecha de inicio debe ser futura.');
  }

  const { data, error } = await supabase
    .from('eventos_quedadas')
    .insert({
      training_spot_id: trainingSpotId,
      organizador_id: user.id,
      titulo,
      descripcion: datosEvento.descripcion ?? null,
      fecha_hora_inicio: fechaHoraInicio,
      fecha_hora_fin: fechaHoraFinNormalizada,
    })
    .select('id')
    .single();
  if (error) throwSupabaseError('No se pudo crear el evento', error);
  const eventoCreado = (await listarEventosProximos()).find((evento) => evento.id === data.id);
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
      ? { training_spot_id: assertNonEmpty(cambios.trainingSpotId, 'El lugar de la quedada') }
      : {}),
    ...(cambios.titulo !== undefined ? { titulo: assertNonEmpty(cambios.titulo, 'El título del evento') } : {}),
    ...(cambios.descripcion !== undefined ? { descripcion: cambios.descripcion } : {}),
    ...(cambios.fechaHoraInicio !== undefined ? { fecha_hora_inicio: fechaHoraInicio } : {}),
    ...(cambios.fechaHoraFin !== undefined ? { fecha_hora_fin: fechaHoraFin } : {}),
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