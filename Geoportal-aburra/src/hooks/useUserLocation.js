import { useCallback, useState } from 'react';
import { useMapContext } from '../context/useMapContext';

function getGeolocationError(error) {
  if (error.code === 1) {
    return 'Ubicación bloqueada. Permite el acceso a la ubicación para este sitio en los ajustes del navegador y del dispositivo.';
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
    if (!window.isSecureContext) {
      setUserLocation(null);
      clearRoute();
      setStatus('error');
      setError('La ubicación requiere una conexión segura (HTTPS). Abre el geoportal con HTTPS e inténtalo de nuevo.');
      return Promise.resolve(false);
    }

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
        { enableHighAccuracy: false, maximumAge: 60_000, timeout: 30_000 }
      );
    });
  }, [clearRoute, setUserLocation]);

  return { status, error, requestLocation };
}
