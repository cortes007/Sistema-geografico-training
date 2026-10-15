import { useCallback, useState } from 'react';
import { useMapContext } from '../context/useMapContext';

function getGeolocationError(error) {
  if (error.code === 1) {
    return 'No se concedió permiso para consultar la ubicación.';
  }
  if (error.code === 2) {
    return 'El dispositivo no pudo determinar la ubicación.';
  }
  if (error.code === 3) {
    return 'La consulta de ubicación tardó demasiado. Inténtalo de nuevo.';
  }
  return 'No se pudo consultar la ubicación.';
}

export function useUserLocation() {
  const { setUserLocation, clearRoute } = useMapContext();
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setUserLocation(null);
      clearRoute();
      setStatus('error');
      setError('Este navegador no permite consultar la ubicación.');
      return Promise.resolve(false);
    }

    setUserLocation(null);
    clearRoute();
    setStatus('loading');
    setError('');

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          setUserLocation({
            latitude: coords.latitude,
            longitude: coords.longitude,
          });
          setStatus('ready');
          resolve(true);
        },
        (reason) => {
          setStatus('error');
          setError(getGeolocationError(reason));
          resolve(false);
        },
        { enableHighAccuracy: true, maximumAge: 30_000, timeout: 15_000 }
      );
    });
  }, [clearRoute, setUserLocation]);

  return { status, error, requestLocation };
}
