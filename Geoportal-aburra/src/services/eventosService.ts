import { supabase } from '../lib/supabaseClient';
import type { EventoInput, Quedada, QuedadaRow, UUID } from '../types/database';
import { assertNonEmpty, throwSupabaseError } from './serviceUtils';

function mapQuedada(row: QuedadaRow): Quedada {
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

export async function getQuedadas(): Promise<Quedada[]> {
  const { data, error } = await supabase.rpc('listar_quedadas');
  if (error) throwSupabaseError('No se pudieron cargar los eventos próximos', error);
  return (data ?? []).map(mapQuedada);
}

export async function crearEvento(datosEvento: EventoInput): Promise<Quedada> {
  const titulo = assertNonEmpty(datosEvento.titulo, 'El título del evento');
  const trainingSpotId = assertNonEmpty(datosEvento.trainingSpotId, 'El lugar de la quedada');
  const organizadorId = assertNonEmpty(datosEvento.organizadorId, 'El organizador del evento');
  if (datosEvento.fechaHoraFin && new Date(datosEvento.fechaHoraFin) <= new Date(datosEvento.fechaHoraInicio)) {
    throw new Error('La fecha de finalización debe ser posterior a la de inicio.');
  }

  const { data, error } = await supabase
    .from('eventos_quedadas')
    .insert({
      training_spot_id: trainingSpotId,
      organizador_id: organizadorId,
      titulo,
      descripcion: datosEvento.descripcion ?? null,
      fecha_hora_inicio: datosEvento.fechaHoraInicio,
      fecha_hora_fin: datosEvento.fechaHoraFin ?? null,
    })
    .select('id')
    .single();
  if (error) throwSupabaseError('No se pudo crear el evento', error);
  const eventoCreado = (await getQuedadas()).find((evento) => evento.id === data.id);
  if (!eventoCreado) {
    throw new Error('El evento fue creado, pero no se pudo recuperar su detalle.');
  }
  return eventoCreado;
}

export async function confirmarAsistencia(eventoId: UUID, usuarioId: UUID): Promise<void> {
  const evento = assertNonEmpty(eventoId, 'El evento');
  const usuario = assertNonEmpty(usuarioId, 'El usuario');
  const { error } = await supabase.rpc('confirmar_asistencia', {
    evento_id_param: evento,
    usuario_id_param: usuario,
  });
  if (error) throwSupabaseError('No se pudo confirmar la asistencia', error);
}

export async function cancelarAsistencia(eventoId: UUID, usuarioId: UUID): Promise<void> {
  const evento = assertNonEmpty(eventoId, 'El evento');
  const usuario = assertNonEmpty(usuarioId, 'El usuario');
  const { error } = await supabase.rpc('cancelar_asistencia', {
    evento_id_param: evento,
    usuario_id_param: usuario,
  });
  if (error) throwSupabaseError('No se pudo cancelar la asistencia', error);
}