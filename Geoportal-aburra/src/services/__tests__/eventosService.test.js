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
  crearEvento,
  listarInscripcionesUsuario,
} from '../eventosService';

describe('eventosService batch attendance & spot-scoped creation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns [] immediately without querying Supabase when eventoIds is empty', async () => {
    const result = await listarInscripcionesUsuario([]);

    expect(result).toEqual([]);
    expect(mockSupabase.auth.getUser).not.toHaveBeenCalled();
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it('fetches user attendance for multiple events in a single .in() query with deduplicated IDs', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });

    const eqMock = vi.fn().mockResolvedValue({
      data: [{ evento_id: 'evt-1' }, { evento_id: 'evt-3' }],
      error: null,
    });
    const inMock = vi.fn(() => ({ eq: eqMock }));
    const selectMock = vi.fn(() => ({ in: inMock }));
    mockSupabase.from.mockReturnValue({ select: selectMock });

    const registeredIds = await listarInscripcionesUsuario([
      'evt-1',
      'evt-2',
      'evt-1',
      'evt-3',
    ]);

    expect(mockSupabase.from).toHaveBeenCalledTimes(1);
    expect(mockSupabase.from).toHaveBeenCalledWith('asistencias_evento');
    expect(selectMock).toHaveBeenCalledWith('evento_id');
    expect(inMock).toHaveBeenCalledWith('evento_id', ['evt-1', 'evt-2', 'evt-3']);
    expect(eqMock).toHaveBeenCalledWith('usuario_id', 'user-1');
    expect(registeredIds).toEqual(['evt-1', 'evt-3']);
  });

  it('scopes the post-insert lookup in crearEvento to trainingSpotId instead of fetching all events', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });

    const singleMock = vi.fn().mockResolvedValue({
      data: { id: 'evt-new' },
      error: null,
    });
    const selectMock = vi.fn(() => ({ single: singleMock }));
    const insertMock = vi.fn(() => ({ select: selectMock }));
    mockSupabase.from.mockReturnValue({ insert: insertMock });

    const futureStart = new Date(Date.now() + 86_400_000).toISOString();
    mockSupabase.rpc.mockResolvedValue({
      data: [
        {
          id: 'evt-new',
          training_spot_id: 'spot-123',
          organizador_id: 'user-1',
          titulo: 'Entreno de dominadas',
          descripcion: null,
          fecha_hora_inicio: futureStart,
          fecha_hora_fin: null,
          fecha_creacion: new Date().toISOString(),
          lugar_nombre: 'Parque El Poblado',
          lugar_descripcion: null,
          lugar_tipo: 'parque de calistenia',
          ciudad: 'Medellín',
          geom: null,
          asistentes_confirmados: 1,
        },
      ],
      error: null,
    });

    const created = await crearEvento({
      trainingSpotId: 'spot-123',
      titulo: 'Entreno de dominadas',
      fechaHoraInicio: futureStart,
    });

    expect(mockSupabase.rpc).toHaveBeenCalledTimes(1);
    expect(mockSupabase.rpc).toHaveBeenCalledWith('listar_eventos_proximos', {
      training_spot_id_param: 'spot-123',
    });
    expect(created.id).toBe('evt-new');
    expect(created.trainingSpotId).toBe('spot-123');
  });
});
