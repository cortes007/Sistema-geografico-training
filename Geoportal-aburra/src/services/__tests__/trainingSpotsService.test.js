import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockSupabase } = vi.hoisted(() => ({
  mockSupabase: {
    from: vi.fn(),
  },
}));

vi.mock('../../lib/supabaseClient', () => ({
  supabase: mockSupabase,
}));

import {
  clearTrainingSpotsCache,
  listarTrainingSpots,
} from '../trainingSpotsService';

describe('trainingSpotsService (global catalog & in-memory cache)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearTrainingSpotsCache();
  });

  it('fetches training_spots, normalizes coordinates/equipmentType, and filters invalid geometries', async () => {
    const orderMock = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'spot-1',
          name: 'Parque Calistenia Envigado',
          leisure: 'fitness_station',
          description: 'Barras y paralelas',
          city: 'Envigado',
          geom: { type: 'Point', coordinates: [-75.5812, 6.1714] },
        },
        {
          id: 'spot-2',
          name: null,
          leisure: 'fitness_centre',
          description: null,
          city: null,
          geom: null,
        },
      ],
      error: null,
    });
    const selectMock = vi.fn(() => ({ order: orderMock }));
    mockSupabase.from.mockReturnValue({ select: selectMock });

    const spots = await listarTrainingSpots();

    expect(mockSupabase.from).toHaveBeenCalledWith('training_spots');
    expect(selectMock).toHaveBeenCalledWith('id, name, leisure, description, city, geom');
    expect(orderMock).toHaveBeenCalledWith('name', { ascending: true });
    expect(spots).toEqual([
      {
        trainingSpotId: 'spot-1',
        name: 'Parque Calistenia Envigado',
        type: 'fitness_station',
        equipmentType: 'gimnasio al aire libre',
        description: 'Barras y paralelas',
        city: 'Envigado',
        longitude: -75.5812,
        latitude: 6.1714,
        openingHours: '',
      },
    ]);
  });

  it('caches the spot catalog in memory across subsequent calls', async () => {
    const orderMock = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'spot-10',
          name: 'Gym Bello',
          leisure: 'fitness_centre',
          description: null,
          city: 'Bello',
          geom: { type: 'Point', coordinates: [-75.55, 6.33] },
        },
      ],
      error: null,
    });
    const selectMock = vi.fn(() => ({ order: orderMock }));
    mockSupabase.from.mockReturnValue({ select: selectMock });

    const first = await listarTrainingSpots();
    const second = await listarTrainingSpots();

    expect(mockSupabase.from).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);
  });

  it('throws a contextual error when Supabase fails and does not cache the failure', async () => {
    const orderMock = vi
      .fn()
      .mockResolvedValueOnce({
        data: null,
        error: { message: 'permission denied', code: '42501' },
      })
      .mockResolvedValueOnce({
        data: [
          {
            id: 'spot-20',
            name: 'Centro Deportivo Sabaneta',
            leisure: 'sports_centre',
            description: null,
            city: 'Sabaneta',
            geom: { type: 'Point', coordinates: [-75.61, 6.15] },
          },
        ],
        error: null,
      });
    const selectMock = vi.fn(() => ({ order: orderMock }));
    mockSupabase.from.mockReturnValue({ select: selectMock });

    await expect(listarTrainingSpots()).rejects.toThrow(
      'No se pudieron cargar los lugares deportivos [42501]: permission denied'
    );

    const retryResult = await listarTrainingSpots();
    expect(retryResult).toHaveLength(1);
    expect(mockSupabase.from).toHaveBeenCalledTimes(2);
  });
});
