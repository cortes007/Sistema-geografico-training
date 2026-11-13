import { useCallback } from 'react';
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

export function normalizeManualCoordinates(coordinates) {
  if (!coordinates || typeof coordinates !== 'object') return null;

  const { latitude, longitude } = coordinates;
  if (
    !Number.isFinite(latitude)
    || !Number.isFinite(longitude)
    || latitude < -90
    || latitude > 90
    || longitude < -180
    || longitude > 180
  ) {
    return null;
  }

  return {
    latitude: Number(latitude.toFixed(6)),
    longitude: Number(longitude.toFixed(6)),
  };
}

export function applyManualLocation(coordinates, actions) {
  const normalized = normalizeManualCoordinates(coordinates);
  if (!normalized) {
    actions.setLocationError('Las coordenadas seleccionadas en el mapa no son válidas.');
    return false;
  }

  actions.clearRoute();
  actions.setUserLocation(normalized);
  actions.setLocationSource('manual');
  actions.setLocationStatus('ready');
  actions.setLocationError('');
  actions.setIsPickingLocation(false);
  return true;
}

export function useUserLocation() {
  const {
    setUserLocation,
    locationStatus,
    setLocationStatus,
    locationError,
    setLocationError,
    locationSource,
    setLocationSource,
    isPickingLocation,
    setIsPickingLocation,
    clearRoute,
  } = useMapContext();

  const requestLocation = useCallback(() => {
    setIsPickingLocation(false);

    if (!window.isSecureContext) {
      setUserLocation(null);
      setLocationSource(null);
      clearRoute();
      setLocationStatus('error');
      setLocationError('La ubicación requiere una conexión segura (HTTPS). Abre el geoportal con HTTPS e inténtalo de nuevo.');
      return Promise.resolve(false);
    }

    if (!navigator.geolocation) {
      setUserLocation(null);
      setLocationSource(null);
      clearRoute();
      setLocationStatus('error');
      setLocationError('Este navegador no permite consultar la ubicación.');
      return Promise.resolve(false);
    }

    setUserLocation(null);
    setLocationSource(null);
    clearRoute();
    setLocationStatus('loading');
    setLocationError('');

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          setUserLocation({
            latitude: coords.latitude,
            longitude: coords.longitude,
          });
          setLocationSource('gps');
          setLocationStatus('ready');
          resolve(true);
        },
        (reason) => {
          setLocationSource(null);
          setLocationStatus('error');
          setLocationError(getGeolocationError(reason));
          resolve(false);
        },
        { enableHighAccuracy: false, maximumAge: 60_000, timeout: 30_000 }
      );
    });
  }, [
    clearRoute,
    setIsPickingLocation,
    setLocationError,
    setLocationSource,
    setLocationStatus,
    setUserLocation,
  ]);

  const startPickingLocation = useCallback(() => {
    setLocationError('');
    setIsPickingLocation(true);
  }, [setIsPickingLocation, setLocationError]);

  const cancelPickingLocation = useCallback(() => {
    setIsPickingLocation(false);
  }, [setIsPickingLocation]);

  const setManualLocation = useCallback(
    (coordinates) =>
      applyManualLocation(coordinates, {
        clearRoute,
        setUserLocation,
        setLocationSource,
        setLocationStatus,
        setLocationError,
        setIsPickingLocation,
      }),
    [
      clearRoute,
      setIsPickingLocation,
      setLocationError,
      setLocationSource,
      setLocationStatus,
      setUserLocation,
    ]
  );

  const clearLocation = useCallback(() => {
    setUserLocation(null);
    setLocationSource(null);
    clearRoute();
    setLocationStatus('idle');
    setLocationError('');
    setIsPickingLocation(false);
  }, [
    clearRoute,
    setIsPickingLocation,
    setLocationError,
    setLocationSource,
    setLocationStatus,
    setUserLocation,
  ]);

  return {
    status: locationStatus,
    error: locationError,
    locationSource,
    isPickingLocation,
    requestLocation,
    startPickingLocation,
    cancelPickingLocation,
    setManualLocation,
    clearLocation,
  };
}
