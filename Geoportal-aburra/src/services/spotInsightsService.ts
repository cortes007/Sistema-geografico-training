import { supabase } from '../lib/supabaseClient';
import type {
  ResumenComponenteRow,
  SpotEnlaceRow,
  UUID,
} from '../types/database';
import { normalizeInstagramUrl, sanitizeExternalUrl } from '../utils/spotLinks';
import { assertNonEmpty, throwSupabaseError } from './serviceUtils';

export type GuardarEnlacesSpotInput = {
  trainingSpotId: string;
  websiteUrl?: string | null;
  instagramUrl?: string | null;
};

async function getAuthenticatedUserId(): Promise<UUID> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throwSupabaseError('No se pudo validar la sesión', error);
  if (!data.user) {
    throw new Error('Debes iniciar sesión para realizar esta acción.');
  }
  return data.user.id;
}

export async function obtenerEnlacesSpot(
  trainingSpotId: string,
): Promise<SpotEnlaceRow | null> {
  const spotId = assertNonEmpty(trainingSpotId, 'El lugar');
  const { data, error } = await supabase
    .from('spot_enlaces')
    .select(
      'id, training_spot_id, website_url, instagram_url, fuente, actualizado_por, fecha_actualizacion',
    )
    .eq('training_spot_id', spotId)
    .maybeSingle();

  if (error) {
    throwSupabaseError('No se pudieron consultar los enlaces del lugar', error);
  }

  return data ?? null;
}

export async function guardarEnlacesSpot(
  input: GuardarEnlacesSpotInput,
): Promise<void> {
  const userId = await getAuthenticatedUserId();
  const spotId = assertNonEmpty(input.trainingSpotId, 'El lugar');
  const websiteUrl = sanitizeExternalUrl(input.websiteUrl);
  const instagramUrl = normalizeInstagramUrl(input.instagramUrl);

  if (!websiteUrl && !instagramUrl) {
    throw new Error('Ingresa al menos un enlace válido (http:// o https://).');
  }

  const { error } = await supabase.from('spot_enlaces').upsert(
    {
      training_spot_id: spotId,
      website_url: websiteUrl,
      instagram_url: instagramUrl,
      fuente: 'comunidad',
      actualizado_por: userId,
    },
    { onConflict: 'training_spot_id' },
  );

  if (error) {
    throwSupabaseError('No se pudieron guardar los enlaces del lugar', error);
  }
}

export async function listarResumenComponentesSpot(
  trainingSpotId: string,
): Promise<ResumenComponenteRow[]> {
  const spotId = assertNonEmpty(trainingSpotId, 'El lugar');
  const { data, error } = await supabase.rpc('listar_resumen_componentes_spot', {
    training_spot_id_param: spotId,
  });

  if (error) {
    throwSupabaseError('No se pudo consultar la calidad de componentes', error);
  }

  return data ?? [];
}
