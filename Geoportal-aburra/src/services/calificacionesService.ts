import { supabase } from '../lib/supabaseClient';
import type { CalificacionLugarInsert, CalificacionLugarRow } from '../types/database';
import { assertNonEmpty, throwSupabaseError } from './serviceUtils';

export type LugarCalificable = {
  name: string;
  type: string;
  latitude: number;
  longitude: number;
};

export type CalificacionLugarInput = {
  calificacion: number;
  comentario: string;
};

function buildPlaceKey(lugar: LugarCalificable): string {
  const nombre = assertNonEmpty(lugar.name, 'El nombre del lugar').toLowerCase();
  const tipo = lugar.type.trim().toLowerCase();
  const { latitude, longitude } = lugar;

  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new Error('La latitud del lugar no es válida.');
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new Error('La longitud del lugar no es válida.');
  }

  const key = JSON.stringify([nombre, tipo, latitude.toFixed(6), longitude.toFixed(6)]);
  if (key.length > 500) {
    throw new Error('El nombre o tipo del lugar supera el límite permitido para calificarlo.');
  }
  return key;
}

function validateRating(calificacion: number): void {
  if (!Number.isInteger(calificacion) || calificacion < 1 || calificacion > 5) {
    throw new Error('Selecciona una calificación entre 1 y 5 estrellas.');
  }
}

async function getAuthenticatedUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throwSupabaseError('No se pudo validar la sesión', error);
  if (!data.user) throw new Error('Debes iniciar sesión para calificar un lugar.');
  return data.user;
}

export async function listarCalificacionesLugar(
  lugar: LugarCalificable,
): Promise<CalificacionLugarRow[]> {
  const lugarKey = buildPlaceKey(lugar);
  const { data, error } = await supabase
    .from('calificaciones_lugares')
    .select('*')
    .eq('lugar_key', lugarKey)
    .order('fecha_creacion', { ascending: false });

  if (error) {
    throwSupabaseError('No se pudieron cargar las calificaciones del lugar', error);
  }

  return data ?? [];
}

export async function guardarCalificacionLugar(
  lugar: LugarCalificable,
  input: CalificacionLugarInput,
): Promise<void> {
  const user = await getAuthenticatedUser();
  const lugarKey = buildPlaceKey(lugar);
  validateRating(input.calificacion);

  const comentario = input.comentario.trim();
  if (comentario.length > 1000) {
    throw new Error('El comentario no puede superar los 1000 caracteres.');
  }

  const metadata = user.user_metadata;
  const nombreUsuario =
    (typeof metadata.nombre_usuario === 'string' && metadata.nombre_usuario.trim()) ||
    `Usuario ${user.id.slice(0, 8)}`;

  const calificacion: CalificacionLugarInsert = {
    lugar_key: lugarKey,
    lugar_nombre: assertNonEmpty(lugar.name, 'El nombre del lugar'),
    lugar_tipo: lugar.type.trim() || 'Lugar deportivo',
    latitud: lugar.latitude,
    longitud: lugar.longitude,
    usuario_id: user.id,
    nombre_usuario: nombreUsuario.slice(0, 80),
    calificacion: input.calificacion,
    comentario: comentario || null,
  };

  const { error } = await supabase
    .from('calificaciones_lugares')
    .upsert(calificacion, { onConflict: 'lugar_key,usuario_id' });

  if (error) {
    throwSupabaseError('No se pudo guardar la calificación', error);
  }
}
