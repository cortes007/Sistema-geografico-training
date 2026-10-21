import { useCallback, useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, ExternalLink, PanelLeftClose, PanelLeftOpen, ArrowLeft, Route, LoaderCircle } from 'lucide-react';
import { useMapContext } from './context/useMapContext';
import { MapProvider } from './context/MapContext.jsx';
import MapContainer from './components/map/MapContainer';
import PlacesFilterPanel from './components/sidebar/PlacesFilterPanel';
import EquipmentTypeFilters from './components/sidebar/EquipmentTypeFilters';
import AuthPanel from './components/auth/AuthPanel';
import { getPlacePhoto } from './utils/gis/getPlacePhoto';
import MeetupsPanel from './components/meetups/MeetupsPanel';
import PlaceRatingsPanel from './components/map/PlaceRatingsPanel';
import { useUserLocation } from './hooks/useUserLocation';
import { useDirections } from './hooks/useDirections';

function PlaceDetailsCard({
  onBack,
  onRequestAuth,
  onGetDirections,
  directionsLoading,
  directionsError,
  route,
}) {
  const { selectedPlace } = useMapContext();
  const [{ loading, photo }, setPhotoState] = useState({
    loading: Boolean(selectedPlace),
    photo: null,
  });

  useEffect(() => {
    let cancelled = false;

    const loadPhoto = async () => {
      await Promise.resolve();
      if (cancelled) return;

      setPhotoState({ loading: true, photo: null });

      try {
        const result = await getPlacePhoto(selectedPlace.feature);
        if (!cancelled) setPhotoState({ loading: false, photo: result });
      } catch {
        if (!cancelled) setPhotoState({ loading: false, photo: null });
      }
    };

    if (selectedPlace) loadPhoto();

    return () => {
      cancelled = true;
    };
  }, [selectedPlace]);

  if (!selectedPlace) return null;

  const googleMapsUrl = `https://www.google.com/maps?q=${selectedPlace.latitude},${selectedPlace.longitude}&z=18`;

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--color-bg-elevated)] bg-gradient-to-br from-[var(--color-bg-secondary)] to-[var(--color-bg-primary)] shadow-2xl">
      <button
        type="button"
        onClick={onBack}
        aria-label="Cerrar detalle del lugar"
        className="absolute right-3 top-3 z-10 rounded-full bg-[var(--color-bg-secondary)]/90 p-1.5 text-[var(--color-text-secondary)] shadow-sm backdrop-blur-sm transition-colors hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" />
      </button>

      {loading ? (
        <div className="h-52 animate-pulse bg-[var(--color-bg-secondary)]" aria-label="Cargando foto" />
      ) : photo ? (
        <div>
          {!photo.exact && (
            <p className="px-3 pt-2 text-xs text-[var(--color-text-secondary)]">Foto cercana a esta ubicación</p>
          )}
          <img
            src={photo.thumbUrl || photo.url}
            alt={selectedPlace.name}
            onError={() => setPhotoState({ loading: false, photo: null })}
            loading="eager"
            fetchPriority="high"
            decoding="async"
            className="h-52 w-full object-cover"
          />
          <p className="px-3 py-1 text-[11px] text-[var(--color-text-secondary)]">
            Foto: {photo.credit || 'Fuente no especificada'}
            {photo.license && ` · ${photo.license}`}
          </p>
        </div>
      ) : (
        <div className="flex h-52 flex-col items-center justify-center gap-2 bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-bg-elevated)] shadow-sm">
            <MapPin className="h-6 w-6" />
          </div>
          <span className="text-sm">Sin fotos disponibles</span>
        </div>
      )}

      <div className="space-y-3 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-primary)] text-white shadow-lg">
            <MapPin className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-[var(--color-brand-light)]">{selectedPlace.name}</h2>
            <p className="text-xs text-[var(--color-text-secondary)]">{selectedPlace.type} · Lugar deportivo</p>
          </div>
        </div>

        {selectedPlace.openingHours && (
          <div className="rounded-xl bg-[var(--color-bg-secondary)] p-3 text-xs text-[var(--color-text-secondary)]">
            <p className="mb-1 font-semibold text-[var(--color-text-primary)]">Horario</p>
            <p>{selectedPlace.openingHours}</p>
          </div>
        )}

        <div className="flex items-center justify-between text-[11px] text-[var(--color-text-secondary)]">
          <span>Fuente: <strong className="text-[var(--color-text-primary)]">OpenStreetMap</strong></span>
          <span>{selectedPlace.latitude}, {selectedPlace.longitude}</span>
        </div>

        <button
          type="button"
          onClick={onGetDirections}
          disabled={directionsLoading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-colors hover:brightness-110 disabled:cursor-wait disabled:opacity-60 max-md:min-h-11"
        >
          {directionsLoading
            ? <LoaderCircle className="h-4 w-4 animate-spin" />
            : <Route className="h-4 w-4" />}
          {directionsLoading
            ? 'Calculando ruta...'
            : route ? 'Quitar ruta' : 'Cómo llegar'}
        </button>
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-[1.5px] border-[var(--color-brand)] bg-transparent px-4 py-2.5 text-sm font-semibold text-[var(--color-brand-light)] transition-colors hover:bg-[var(--color-brand)]/10 max-md:min-h-11"
        >
          <Navigation className="h-4 w-4" />
          Abrir en Google Maps
          <ExternalLink className="h-4 w-4" />
        </a>
        {route && (
          <p role="status" className="text-xs text-[var(--color-text-secondary)]">
            Ruta peatonal: {(route.distanceMeters / 1000).toFixed(1)} km · {Math.ceil(route.durationSeconds / 60)} min aprox.
          </p>
        )}
        {route && (
          <p className="text-[10px] text-[var(--color-text-secondary)]">
            Ruta peatonal calculada por el servicio del geoportal.
          </p>
        )}
        {directionsError && (
          <p role="alert" className="text-xs text-[var(--color-accent-danger)]">{directionsError}</p>
        )}
        <PlaceRatingsPanel
          place={{
            name: selectedPlace.name,
            type: selectedPlace.type,
            latitude: selectedPlace.latitude,
            longitude: selectedPlace.longitude,
            trainingSpotId: selectedPlace.trainingSpotId,
          }}
          onRequestAuth={onRequestAuth}
        />
        <MeetupsPanel
          spotId={String(
            selectedPlace.trainingSpotId
              ?? selectedPlace.feature.get('id')
              ?? selectedPlace.feature.getId()
              ?? ''
          )}
        />
      </div>
    </div>
  );
}

function GeoportalContent() {
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [authMode, setAuthMode] = useState(null);
  const { selectedPlace, clearSelectedPlace, userLocation, route } = useMapContext();
  const { status: locationStatus, error: locationError, requestLocation } = useUserLocation();
  const { getDirections, clearDirections, loading: directionsLoading, error: directionsError } = useDirections();
  const pendingDirectionsRef = useRef(null);
  const selectedDetailsRef = useRef(null);
  const selectedPlaceKey = selectedPlace
    ? selectedPlace.trainingSpotId || `${selectedPlace.longitude},${selectedPlace.latitude}`
    : null;
  const lastSelectedPlaceKey = useRef(selectedPlaceKey);

  const handleGetDirections = useCallback(async () => {
    if (!selectedPlace) return;

    const destinationKey = selectedPlace.trainingSpotId
      || `${selectedPlace.longitude},${selectedPlace.latitude}`;
    if (route?.destinationKey === destinationKey) {
      clearDirections();
      return;
    }

    if (!userLocation) {
      pendingDirectionsRef.current = selectedPlace;
      const locationFound = await requestLocation();
      if (!locationFound) pendingDirectionsRef.current = null;
      return;
    }

    await getDirections(selectedPlace);
  }, [clearDirections, getDirections, requestLocation, route, selectedPlace, userLocation]);

  useEffect(() => {
    if (!selectedPlace) return;

    selectedDetailsRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }, [selectedPlace]);

  useEffect(() => {
    const destination = pendingDirectionsRef.current;
    if (!userLocation || !destination) return;

    pendingDirectionsRef.current = null;
    const destinationKey = destination.trainingSpotId
      || `${destination.longitude},${destination.latitude}`;
    if (destinationKey !== selectedPlaceKey) return;

    getDirections(destination);
  }, [getDirections, selectedPlaceKey, userLocation]);

  useEffect(() => {
    if (lastSelectedPlaceKey.current === selectedPlaceKey) return;
    lastSelectedPlaceKey.current = selectedPlaceKey;
    clearDirections();
  }, [clearDirections, selectedPlaceKey]);

  return (
    <>
      <div
        className="relative h-dvh w-full overflow-hidden"
        data-geoportal-layout
        data-panel-open={isPanelOpen}
        data-selected-place={Boolean(selectedPlace)}
        data-selected-sheet-height-vh="60"
        style={{
          '--sheet-h': selectedPlace
            ? '60dvh'
            : isPanelOpen
              ? 'calc(148px + env(safe-area-inset-bottom))'
              : '88dvh',
        }}
      >
        <main className="relative h-full min-h-0 min-w-0">
          <MapContainer
            isSidebarOpen={isPanelOpen}
            locationStatus={locationStatus}
            locationError={locationError}
            onRequestLocation={requestLocation}
          />
        </main>
        <AuthPanel mode={authMode} setMode={setAuthMode} />
        <div
          role="group"
          aria-label="Filtros por categoría"
          className={`pointer-events-none fixed left-3 right-16 top-3 z-30 flex justify-start overflow-x-auto overflow-y-hidden whitespace-nowrap pb-1 transition-[left] duration-200 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:absolute md:flex md:justify-center md:overflow-x-auto md:pb-1 ${isPanelOpen ? 'md:left-[calc(var(--sidebar-width)+2.75rem)]' : 'md:left-4'} md:right-4 md:top-20 min-[1280px]:md:right-[19rem] min-[1280px]:md:top-4`}
        >
          <EquipmentTypeFilters className="flex md:flex" />
        </div>
        <aside
          id="geoportal-sidebar"
          className={`absolute left-4 top-4 z-40 flex max-h-[calc(100dvh-16px-16px-64px-12px)] w-[min(var(--sidebar-width),calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-[var(--color-bg-elevated)] bg-[var(--color-brand-dark)]/95 p-4 text-[13px] shadow-[var(--shadow-panel)] backdrop-blur-sm transition-transform duration-200 ${isPanelOpen ? 'translate-x-0' : '-translate-x-[calc(100%+1rem)]'} max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:left-auto max-md:top-auto max-md:z-40 max-md:h-[var(--sheet-h)] max-md:max-h-none max-md:w-full max-md:translate-x-0 max-md:rounded-t-[20px] max-md:rounded-b-none max-md:border-x-0 max-md:border-b-0 max-md:p-0 max-md:pb-[env(safe-area-inset-bottom)] max-md:shadow-[0_-12px_32px_rgba(0,0,0,0.28)] max-md:transition-[height] max-md:duration-[250ms] max-md:ease-out`}
        >
          <div className={`flex shrink-0 items-start justify-between gap-3 max-md:gap-0 max-md:px-5 ${selectedPlace || !isPanelOpen ? 'max-md:py-0' : 'max-md:pt-3 max-md:pb-4'} md:flex-row`}>
            <button
              type="button"
              onClick={() => setIsPanelOpen((open) => !open)}
              aria-label="Alternar altura del panel"
              className={`flex w-full flex-col items-stretch text-left max-md:min-h-11 md:pointer-events-none md:cursor-default ${selectedPlace || !isPanelOpen ? 'max-md:gap-0 max-md:py-0' : 'max-md:gap-3'}`}
            >
              <span className={`hidden h-1 w-9 self-center rounded-full bg-gray-400 max-md:block ${selectedPlace || !isPanelOpen ? 'max-md:mt-2' : ''}`} />
              <span className={`truncate text-base font-semibold text-[var(--color-brand-light)] ${selectedPlace || !isPanelOpen ? 'max-md:py-2' : ''}`}>
                Geoportal Deportivo Valle de Aburrá
              </span>
              <span className={`truncate text-sm text-[var(--color-text-secondary)] md:block md:text-xs ${selectedPlace || !isPanelOpen ? 'max-md:hidden' : 'max-md:block'}`}>
                Lugares de entrenamiento, gimnasios y centros deportivos
              </span>
            </button>
            <button type="button" onClick={() => setIsPanelOpen(false)} aria-label="Colapsar panel" className="hidden rounded p-1 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)] md:block">
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </div>
          <div className={`mt-4 min-h-0 flex-1 overflow-y-auto pr-1 max-md:mt-0 max-md:px-4 max-md:pb-[calc(env(safe-area-inset-bottom)+1rem)] ${selectedPlace || !isPanelOpen ? 'max-md:block' : 'max-md:hidden'} md:pb-0`}>
            <PlacesFilterPanel
              locationStatus={locationStatus}
              locationError={locationError}
            />
            {selectedPlace ? (
              <div ref={selectedDetailsRef} className="mt-3 shrink-0 scroll-mt-3">
                <PlaceDetailsCard
                  onBack={clearSelectedPlace}
                  onRequestAuth={() => setAuthMode('login')}
                  onGetDirections={handleGetDirections}
                  directionsLoading={directionsLoading}
                  directionsError={directionsError}
                  route={route?.destinationKey === selectedPlaceKey ? route : null}
                />
              </div>
            ) : null}
          </div>
        </aside>
        {!isPanelOpen && (
          <button type="button" onClick={() => setIsPanelOpen(true)} aria-label="Expandir panel" className="absolute left-4 top-4 z-40 rounded-xl border border-[var(--color-bg-elevated)] bg-[var(--color-bg-secondary)] p-3 text-[var(--color-text-primary)] shadow-lg backdrop-blur-sm transition-all duration-200 hover:bg-[var(--color-bg-elevated)] max-md:hidden">
            <PanelLeftOpen className="h-5 w-5" />
          </button>
        )}
      </div>
    </>
  );
}

export default function App() {
  return (
    <MapProvider>
      <GeoportalContent />
    </MapProvider>
  );
}
