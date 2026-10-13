import { supabase } from '../lib/supabaseClient';
import { throwSupabaseError } from './serviceUtils';

export type PlaceRatingAggregate = {
  trainingSpotId: string;
  averageRating: number;
  ratingCount: number;
  rankingRating: number;
};

export async function listarCalificacionesAgregadasLugares(): Promise<PlaceRatingAggregate[]> {
  const { data, error } = await supabase.rpc('listar_calificaciones_agregadas_lugares');
  if (error) throwSupabaseError('No se pudieron consultar los promedios de calificación', error);

  return (data ?? []).map((place) => ({
    trainingSpotId: place.training_spot_id,
    averageRating: place.average_rating,
    ratingCount: place.rating_count,
    rankingRating: place.ranking_rating,
  }));
}
