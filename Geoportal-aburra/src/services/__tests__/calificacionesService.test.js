import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockSupabase } = vi.hoisted(() => ({
  mockSupabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}));

vi.mock('../../lib/supabaseClient', () => ({
  supabase: mockSupabase,
}));

import {
  guardarCalificacionLugar,
  listarComponentesCalificacionUsuario,
} from '../calificacionesService';

describe('calificacionesService component quality support', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('saves rating and upserts optional component quality scores when trainingSpotId is present', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1', user_metadata: { nombre_usuario: 'Pablo' } } },
      error: null,
    });

    const singleMock = vi.fn().mockResolvedValue({ data: { id: 'cal-99' }, error: null });
    const selectMock = vi.fn(() => ({ single: singleMock }));
    const upsertMainMock = vi.fn(() => ({ select: selectMock }));
    const upsertComponentsMock = vi.fn().mockResolvedValue({ error: null });

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'calificaciones_lugares') {
        return { upsert: upsertMainMock };
      }
      if (table === 'calificaciones_componentes') {
        return { upsert: upsertComponentsMock };
      }
      throw new Error(`Unexpected table: ${table}`);
    });

    await guardarCalificacionLugar(
      {
        name: 'Parque Calistenia Sur',
        type: 'fitness_station',
        latitude: 6.17,
        longitude: -75.59,
        trainingSpotId: 'spot-sur',
      },
      {
        calificacion: 5,
        comentario: 'Excelentes barras',
        componentes: {
          estado_barras: 5,
          superficie_suelo: 4,
          iluminacion_seguridad: 0,
        },
      }
    );

    expect(upsertMainMock).toHaveBeenCalledTimes(1);
    expect(upsertComponentsMock).toHaveBeenCalledWith(
      [
        {
          calificacion_id: 'cal-99',
          training_spot_id: 'spot-sur',
          componente: 'estado_barras',
          puntaje: 5,
        },
        {
          calificacion_id: 'cal-99',
          training_spot_id: 'spot-sur',
          componente: 'superficie_suelo',
          puntaje: 4,
        },
      ],
      { onConflict: 'calificacion_id,componente' }
    );
  });

  it('fetches existing component scores for a given calificacionId as a key-value map', async () => {
    const eqMock = vi.fn().mockResolvedValue({
      data: [
        { componente: 'estado_barras', puntaje: 5 },
        { componente: 'superficie_suelo', puntaje: 3 },
      ],
      error: null,
    });
    const selectMock = vi.fn(() => ({ eq: eqMock }));
    mockSupabase.from.mockReturnValue({ select: selectMock });

    const map = await listarComponentesCalificacionUsuario('cal-99');

    expect(mockSupabase.from).toHaveBeenCalledWith('calificaciones_componentes');
    expect(eqMock).toHaveBeenCalledWith('calificacion_id', 'cal-99');
    expect(map).toEqual({
      estado_barras: 5,
      superficie_suelo: 3,
    });
  });
});
