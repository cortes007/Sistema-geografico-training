import { useCallback, useRef, useState } from 'react';
import { useMapContext } from '../context/useMapContext';
import { getWalkingRoute } from '../services/routingService';

export function useDirections() {
  const { userLocation, setRoute, clearRoute } = useMapContext();
  const requestId = useRef(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getDirections = useCallback(async (destination) => {
    if (!userLocation) {
      setError('Consulta primero tu ubicación actual para calcular la ruta.');
      return false;
    }

    setLoading(true);
    setError('');
    const currentRequest = ++requestId.current;
    try {
      const result = await getWalkingRoute(userLocation, destination);
      if (requestId.current !== currentRequest) return false;
      setRoute({
        ...result,
        destinationKey: destination.trainingSpotId
          || `${destination.longitude},${destination.latitude}`,
        destinationCoordinates: [destination.longitude, destination.latitude],
      });
      return true;
    } catch (reason) {
      if (requestId.current !== currentRequest) return false;
      setError(reason.message || 'No se pudo calcular la ruta.');
      clearRoute();
      return false;
    } finally {
      if (requestId.current === currentRequest) setLoading(false);
    }
  }, [clearRoute, setRoute, userLocation]);

  const clearDirections = useCallback(() => {
    requestId.current += 1;
    clearRoute();
    setError('');
    setLoading(false);
  }, [clearRoute]);

  return { getDirections, clearDirections, loading, error };
}
