const CONFIGURED_ROUTING_URL = import.meta.env.VITE_ROUTE_API_URL || '';
const SUPPORTED_PROFILES = new Set(['foot', 'bike']);

  function resolveRouteUrl(profile, baseOrigin) {
    if (!CONFIGURED_ROUTING_URL) {
      return new URL(`/api/routes/${profile}`, baseOrigin);
    }

    const configured = new URL(CONFIGURED_ROUTING_URL, baseOrigin);
    const normalizedPath = configured.pathname.replace(/\/+$/, '');
    if (normalizedPath.endsWith('/foot') || normalizedPath.endsWith('/bike')) {
      configured.pathname = normalizedPath.replace(/\/(foot|bike)$/, `/${profile}`);
    } else if (normalizedPath.endsWith('/api/routes')) {
      configured.pathname = `${normalizedPath}/${profile}`;
    }
    return configured;
  }

  function isValidStep(step) {
    if (!step || typeof step !== 'object') return false;
    if (typeof step.instruction !== 'string' || !step.instruction.trim()) return false;
    if (!Number.isFinite(step.distanceMeters) || step.distanceMeters < 0) return false;
    if (!Number.isFinite(step.durationSeconds) || step.durationSeconds < 0) return false;
    if (step.location !== null && step.location !== undefined) {
      if (
        !Array.isArray(step.location)
        || step.location.length < 2
        || !Number.isFinite(step.location[0])
        || step.location[0] < -180
        || step.location[0] > 180
        || !Number.isFinite(step.location[1])
        || step.location[1] < -90
        || step.location[1] > 90
      ) {
        return false;
      }
    }
    return true;
  }

  /**
   * Calcula una ruta en EPSG:4326 para el perfil indicado ('foot' | 'bike')
   * usando el endpoint de mismo origen para proteger la ubicación del usuario.
   */
  export async function getRoute(origin, destination, { profile = 'foot' } = {}) {
    if (!SUPPORTED_PROFILES.has(profile)) {
      throw new Error('El perfil de ruta debe ser peatonal (foot) o bicicleta (bike).');
    }

    const baseOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    const routeUrl = resolveRouteUrl(profile, baseOrigin);
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
          profile,
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
      throw new Error(
        profile === 'bike'
          ? 'No se encontró una ruta en bicicleta para este lugar.'
          : 'No se encontró una ruta peatonal para este lugar.'
      );
    }

    const steps = Array.isArray(result.steps) ? result.steps.filter(isValidStep) : [];

    return {
      coordinates,
      distanceMeters: result.distanceMeters,
      durationSeconds: result.durationSeconds,
      profile,
      steps,
    };
  }

  export async function getWalkingRoute(origin, destination) {
    return getRoute(origin, destination, { profile: 'foot' });
  }
