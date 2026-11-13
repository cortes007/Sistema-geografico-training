import { supabase } from '../lib/supabaseClient';
import type { TrainingSpotRow } from '../types/database';
import { getEquipmentTypeFromProperties } from '../constants/equipmentTypes';
import { parseSpotGeometryToLonLat } from '../utils/gis/spotGeometryParser';
import { throwSupabaseError } from './serviceUtils';

export interface TrainingSpotItem {
  trainingSpotId: string;
  name: string;
  type: string;
  equipmentType: string | null;
  description: string;
  city: string;
  longitude: number;
  latitude: number;
  openingHours: string;
}

let cachedSpots: TrainingSpotItem[] | null = null;
let inFlightRequest: Promise<TrainingSpotItem[]> | null = null;

function mapTrainingSpot(row: TrainingSpotRow): TrainingSpotItem | null {
  const coordinates = parseSpotGeometryToLonLat(row.geom);
  if (!coordinates) return null;

  const leisure = row.leisure?.trim() || '';
  const name = row.name?.trim() || 'Lugar deportivo';
  const equipmentType = getEquipmentTypeFromProperties({
    name,
    leisure,
    description: row.description,
  });

  return {
    trainingSpotId: String(row.id),
    name,
    type: leisure || 'Lugar deportivo',
    equipmentType,
    description: row.description?.trim() || '',
    city: row.city?.trim() || '',
    longitude: Number(coordinates.longitude.toFixed(6)),
    latitude: Number(coordinates.latitude.toFixed(6)),
    openingHours: '',
  };
}

export function clearTrainingSpotsCache(): void {
  cachedSpots = null;
  inFlightRequest = null;
}

export async function listarTrainingSpots(): Promise<TrainingSpotItem[]> {
  if (cachedSpots) return cachedSpots;
  if (inFlightRequest) return inFlightRequest;

  inFlightRequest = (async () => {
    const { data, error } = await supabase
      .from('training_spots')
      .select('id, name, leisure, description, city, geom')
      .order('name', { ascending: true });

    if (error) {
      throwSupabaseError('No se pudieron cargar los lugares deportivos', error);
    }

    const spots = (data ?? [])
      .map(mapTrainingSpot)
      .filter((spot): spot is TrainingSpotItem => spot !== null);

    cachedSpots = spots;
    return spots;
  })();

  try {
    return await inFlightRequest;
  } finally {
    inFlightRequest = null;
  }
}
