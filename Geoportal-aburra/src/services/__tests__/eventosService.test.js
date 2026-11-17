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
    expect(created.tipoActividad).toBe('entrenamiento');
  });

  it('creates a cycling route meetup without trainingSpotId using EWKT geometries and maps all route fields', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });

    const singleMock = vi.fn().mockResolvedValue({
      data: { id: 'evt-bike-1' },
      error: null,
    });
    const selectMock = vi.fn(() => ({ single: singleMock }));
    const insertMock = vi.fn(() => ({ select: selectMock }));
    mockSupabase.from.mockReturnValue({ insert: insertMock });

    const futureStart = new Date(Date.now() + 86_400_000).toISOString();
    mockSupabase.rpc.mockResolvedValue({
      data: [
        {
          id: 'evt-bike-1',
          training_spot_id: null,
          organizador_id: 'user-1',
          titulo: 'Rodada Ciclorruta Río',
          descripcion: 'Ritmo suave',
          fecha_hora_inicio: futureStart,
          fecha_hora_fin: null,
          fecha_creacion: new Date().toISOString(),
          lugar_nombre: 'Estadio',
          lugar_descripcion: null,
          lugar_tipo: 'ciclismo',
          ciudad: null,
          geom: { type: 'Point', coordinates: [-75.59, 6.256] },
          asistentes_confirmados: 0,
          tipo_actividad: 'ciclismo',
          perfil_ruta: 'bike',
          origen_nombre: 'Estadio',
          destino_nombre: 'Ciudad del Río',
          origen_geom: { type: 'Point', coordinates: [-75.59, 6.256] },
          destino_geom: { type: 'Point', coordinates: [-75.574, 6.224] },
          ruta_geom: {
            type: 'LineString',
            coordinates: [[-75.59, 6.256], [-75.574, 6.224]],
          },
          distancia_metros: 4200,
          duracion_segundos: 780,
        },
      ],
      error: null,
    });

    const created = await crearEvento({
      tipoActividad: 'ciclismo',
      titulo: 'Rodada Ciclorruta Río',
      descripcion: 'Ritmo suave',
      fechaHoraInicio: futureStart,
      origenNombre: 'Estadio',
      destinoNombre: 'Ciudad del Río',
      origen: { latitude: 6.256, longitude: -75.59 },
      destino: { latitude: 6.224, longitude: -75.574 },
      rutaCoordenadas: [[-75.59, 6.256], [-75.574, 6.224]],
      distanciaMetros: 4200,
      duracionSegundos: 780,
    });

    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
      training_spot_id: null,
      tipo_actividad: 'ciclismo',
      perfil_ruta: 'bike',
      origen_geom: 'SRID=4326;POINT(-75.59 6.256)',
      destino_geom: 'SRID=4326;POINT(-75.574 6.224)',
      ruta_geom: 'SRID=4326;LINESTRING(-75.59 6.256, -75.574 6.224)',
      distancia_metros: 4200,
      duracion_segundos: 780,
    }));
    expect(mockSupabase.rpc).toHaveBeenCalledWith('listar_eventos_proximos', {
      training_spot_id_param: null,
    });
    expect(created.tipoActividad).toBe('ciclismo');
    expect(created.perfilRuta).toBe('bike');
    expect(created.destinoNombre).toBe('Ciudad del Río');
  });

  it('rejects creating a running meetup without valid origin, destination, or route geometry', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });

    const futureStart = new Date(Date.now() + 86_400_000).toISOString();
    await expect(crearEvento({
      tipoActividad: 'running',
      titulo: 'Trote matutino',
      fechaHoraInicio: futureStart,
    })).rejects.toThrow(/origen/i);
  });
});
