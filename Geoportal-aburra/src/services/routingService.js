const ROUTING_URL = import.meta.env.VITE_ROUTE_API_URL || '/api/routes/foot';

export async function getWalkingRoute(origin, destination) {
  const routeUrl = new URL(ROUTING_URL, window.location.origin);
  if (routeUrl.origin !== window.location.origin) {
    throw new Error('El servicio de rutas debe estar en el mismo origen para proteger tu ubicación.');
  }

  const response = await fetch(routeUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      origin: { latitude: origin.latitude, longitude: origin.longitude },
      destination: { latitude: destination.latitude, longitude: destination.longitude },
      profile: 'foot',
    }),
  });
  if (!response.ok) {
    const result = await response.json().catch(() => null);
    throw new Error(
      result?.error || `El servicio de rutas respondió con un error (${response.status}).`
    );
  }

  const result = await response.json();
  const coordinates = result.coordinates;
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
