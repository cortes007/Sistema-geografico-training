const ROUTING_URL = import.meta.env.VITE_ROUTE_API_URL || '/api/routes/foot';

export async function getWalkingRoute(origin, destination) {
  const baseOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
  const routeUrl = new URL(ROUTING_URL, baseOrigin);
  if (typeof window !== 'undefined' && routeUrl.origin !== window.location.origin) {
    throw new Error('El servicio de rutas debe estar en el mismo origen para proteger tu ubicación.');
  }

  let response;
  try {
    response = await fetch(routeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin: { latitude: origin.latitude, longitude: origin.longitude },
        destination: { latitude: destination.latitude, longitude: destination.longitude },
        profile: 'foot',
      }),
    });
  } catch {
    throw new Error(
      'No se pudo conectar con el servicio de rutas. Verifica tu conexión a internet o que el servidor backend esté en ejecución.'
    );
  }

  if (!response.ok) {
    const result = await response.json().catch(() => null);
    if (result?.error) {
      throw new Error(result.error);
    }
    if (response.status === 502 || response.status === 503 || response.status === 504) {
      throw new Error('El servicio de rutas no está disponible temporalmente. Inténtalo de nuevo más tarde.');
    }
    throw new Error(`El servicio de rutas respondió con un error (${response.status}).`);
  }

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error('El servicio de rutas devolvió una respuesta inválida.');
  }

  const coordinates = result?.coordinates;
  if (
    !Array.isArray(coordinates)
    || coordinates.length < 2
    || !coordinates.every((coordinate) => (
      Array.isArray(coordinate)
      && Number.isFinite(coordinate[0])
      && coordinate[0] >= -180
      && coordinate[0] <= 180
      && Number.isFinite(coordinate[1])
      && coordinate[1] >= -90
      && coordinate[1] <= 90
    ))
    || !Number.isFinite(result.distanceMeters)
    || result.distanceMeters < 0
    || !Number.isFinite(result.durationSeconds)
    || result.durationSeconds < 0
  ) {
    throw new Error('No se encontró una ruta peatonal para este lugar.');
  }

  return {
    coordinates,
    distanceMeters: result.distanceMeters,
    durationSeconds: result.durationSeconds,
  };
}
