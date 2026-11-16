import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockSupabase } = vi.hoisted(() => ({
  mockSupabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

vi.mock('../../lib/supabaseClient', () => ({
  supabase: mockSupabase,
}));

import {
  guardarEnlacesSpot,
  listarResumenComponentesSpot,
  obtenerEnlacesSpot,
} from '../spotInsightsService';

describe('spotInsightsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches spot links from public.spot_enlaces using maybeSingle', async () => {
    const row = {
      id: 'link-1',
      training_spot_id: 'spot-1',
      website_url: 'https://gym.co',
      instagram_url: 'https://www.instagram.com/gymco',
      fuente: 'comunidad',
      actualizado_por: 'user-1',
      fecha_actualizacion: '2026-11-16T00:00:00.000Z',
    };
    const maybeSingleMock = vi.fn().mockResolvedValue({ data: row, error: null });
    const eqMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
    const selectMock = vi.fn(() => ({ eq: eqMock }));
    mockSupabase.from.mockReturnValue({ select: selectMock });

    const result = await obtenerEnlacesSpot('spot-1');

    expect(mockSupabase.from).toHaveBeenCalledWith('spot_enlaces');
    expect(selectMock).toHaveBeenCalledWith(
      'id, training_spot_id, website_url, instagram_url, fuente, actualizado_por, fecha_actualizacion'
    );
    expect(eqMock).toHaveBeenCalledWith('training_spot_id', 'spot-1');
    expect(result).toEqual(row);
  });

  it('validates session and sanitizes links before upserting into public.spot_enlaces', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-77' } },
      error: null,
    });
    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    mockSupabase.from.mockReturnValue({ upsert: upsertMock });

    await expect(
      guardarEnlacesSpot({
        trainingSpotId: 'spot-1',
        websiteUrl: 'javascript:alert(1)',
        instagramUrl: '',
      })
    ).rejects.toThrow(/al menos un enlace válido/i);

    await guardarEnlacesSpot({
      trainingSpotId: 'spot-1',
      websiteUrl: 'https://gimnasio.co',
      instagramUrl: '@gimnasio_co',
    });

    expect(mockSupabase.from).toHaveBeenCalledWith('spot_enlaces');
    expect(upsertMock).toHaveBeenCalledWith(
      {
        training_spot_id: 'spot-1',
        website_url: 'https://gimnasio.co/',
        instagram_url: 'https://www.instagram.com/gimnasio_co',
        fuente: 'comunidad',
        actualizado_por: 'user-77',
      },
      { onConflict: 'training_spot_id' }
    );
  });

  it('calls component summary RPC with trimmed training_spot_id', async () => {
    const componentsData = [{ componente: 'estado_barras', promedio: 4.5, cantidad: 3 }];
    mockSupabase.rpc.mockResolvedValueOnce({ data: componentsData, error: null });

    const components = await listarResumenComponentesSpot(' spot-2 ');

    expect(mockSupabase.rpc).toHaveBeenCalledWith('listar_resumen_componentes_spot', {
      training_spot_id_param: 'spot-2',
    });
    expect(components).toEqual(componentsData);
  });
});
