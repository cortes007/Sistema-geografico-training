import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getWalkingRoute } from '../routingService';

describe('routingService - getWalkingRoute', () => {
  const origin = { latitude: 6.251, longitude: -75.567 };
  const destination = { latitude: 6.255, longitude: -75.570 };

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('retorna las coordenadas, distanceMeters y durationSeconds en una respuesta exitosa', async () => {
    const mockCoordinates = [
      [-75.567, 6.251],
      [-75.568, 6.252],
      [-75.570, 6.255],
    ];
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        coordinates: mockCoordinates,
        distanceMeters: 642,
        durationSeconds: 515.6,
      }),
    });

    const result = await getWalkingRoute(origin, destination);

    expect(fetch).toHaveBeenCalledTimes(1);
    const [calledUrl, calledInit] = fetch.mock.calls[0];
    expect(calledUrl.pathname).toBe('/api/routes/foot');
    expect(calledInit.method).toBe('POST');
    expect(calledInit.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(calledInit.body)).toEqual({
      origin,
      destination,
      profile: 'foot',
    });

    expect(result).toEqual({
      coordinates: mockCoordinates,
      distanceMeters: 642,
      durationSeconds: 515.6,
    });
  });

  it('lanza un error descriptivo cuando la conexión de red falla (fetch rechaza)', async () => {
    fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(getWalkingRoute(origin, destination)).rejects.toThrow(
      'No se pudo conectar con el servicio de rutas. Verifica tu conexión a internet o que el servidor backend esté en ejecución.'
    );
  });

  it('muestra el mensaje de error provisto por el backend cuando la respuesta no es ok', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Las coordenadas de origen y destino no son válidas.' }),
    });

    await expect(getWalkingRoute(origin, destination)).rejects.toThrow(
      'Las coordenadas de origen y destino no son válidas.'
    );
  });

  it('muestra mensaje de indisponibilidad temporal ante códigos 502, 503 o 504 sin cuerpo estructurado', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => {
        throw new Error('Not JSON');
      },
    });

    await expect(getWalkingRoute(origin, destination)).rejects.toThrow(
      'El servicio de rutas no está disponible temporalmente. Inténtalo de nuevo más tarde.'
    );
  });

  it('lanza un error si la respuesta del backend no es un JSON válido', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError('Unexpected token');
      },
    });

    await expect(getWalkingRoute(origin, destination)).rejects.toThrow(
      'El servicio de rutas devolvió una respuesta inválida.'
    );
  });

  it('lanza un error si la geometría devuelta está vacía o tiene menos de dos puntos', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        coordinates: [[-75.567, 6.251]],
        distanceMeters: 0,
        durationSeconds: 0,
      }),
    });

    await expect(getWalkingRoute(origin, destination)).rejects.toThrow(
      'No se encontró una ruta peatonal para este lugar.'
    );
  });

  it('lanza un error si distanceMeters o durationSeconds son valores inválidos o negativos', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        coordinates: [[-75.567, 6.251], [-75.570, 6.255]],
        distanceMeters: -10,
        durationSeconds: 100,
      }),
    });

    await expect(getWalkingRoute(origin, destination)).rejects.toThrow(
      'No se encontró una ruta peatonal para este lugar.'
    );
  });
});
