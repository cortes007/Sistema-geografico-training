import { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, ExternalLink, PanelLeftClose, PanelLeftOpen, ArrowLeft } from 'lucide-react';
import { useMapContext } from './context/MapContext';
import { MapProvider } from './context/MapContext';
import MapContainer from './components/map/MapContainer';
import LayerPanel from './components/sidebar/LayerPanel';
import CRSPanel from './components/sidebar/CRSPanel';
import AuthPanel from './components/auth/AuthPanel';
import { getPlacePhoto } from './utils/gis/getPlacePhoto';
import MeetupsPanel from './components/meetups/MeetupsPanel';
import PlaceRatingsPanel from './components/map/PlaceRatingsPanel';

function PlaceDetailsCard({ onBack, onRequestAuth }) {
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
            <h2 className="truncate text-base font-bold text-[var(--color-text-primary)]">{selectedPlace.name}</h2>
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

        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-accent-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:bg-[var(--color-accent-secondary)] hover:shadow-xl"
        >
          <Navigation className="h-4 w-4" />
          Abrir en Google Maps
          <ExternalLink className="h-4 w-4" />
        </a>
        <PlaceRatingsPanel
          place={{
            name: selectedPlace.name,
            type: selectedPlace.type,
            latitude: selectedPlace.latitude,
            longitude: selectedPlace.longitude,
          }}
          onRequestAuth={onRequestAuth}
        />
        <MeetupsPanel spotId={String(selectedPlace.feature.getId())} />
      </div>
    </div>
  );
}

function GeoportalContent() {
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [authMode, setAuthMode] = useState(null);
  const { selectedPlace, clearSelectedPlace } = useMapContext();
  const selectedDetailsRef = useRef(null);

  useEffect(() => {
    if (!selectedPlace) return;

    selectedDetailsRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }, [selectedPlace]);

  return (
    <>
      <div className="relative h-dvh w-full overflow-hidden">
        <main className="relative h-full min-h-0 min-w-0">
          <MapContainer />
        </main>
        <AuthPanel mode={authMode} setMode={setAuthMode} isSidebarOpen={isPanelOpen} />
        <aside
          id="geoportal-sidebar"
          className={`absolute left-4 top-4 z-40 flex max-h-[calc(100%-2rem)] w-[min(20rem,calc(100vw-2rem))] flex-col overflow-y-auto rounded-2xl border border-[var(--color-bg-elevated)] bg-[var(--color-bg-secondary)]/95 p-3 text-[13px] shadow-2xl backdrop-blur-sm transition-transform duration-200 ${isPanelOpen ? 'translate-x-0' : '-translate-x-[calc(100%+1rem)]'}`}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <h1 className="text-base font-semibold text-[var(--color-text-primary)]">Geoportal Deportivo Valle de Aburrá</h1>
              <p className="text-xs text-[var(--color-text-secondary)]">Lugares de entrenamiento, gimnasios y centros deportivos</p>
            </div>
            <button type="button" onClick={() => setIsPanelOpen(false)} aria-label="Colapsar panel" className="rounded p-1 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)]">
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 shrink-0">
            <CRSPanel />
          </div>
          {selectedPlace ? (
            <div ref={selectedDetailsRef} className="mt-3 shrink-0 scroll-mt-3">
              <PlaceDetailsCard onBack={clearSelectedPlace} onRequestAuth={() => setAuthMode('login')} />
            </div>
          ) : (
            <div className="mt-3 shrink-0">
              <LayerPanel />
            </div>
          )}
        </aside>
        {!isPanelOpen && (
          <button type="button" onClick={() => setIsPanelOpen(true)} aria-label="Expandir panel" className="absolute left-4 top-4 z-40 rounded-xl border border-[var(--color-bg-elevated)] bg-[var(--color-bg-secondary)] p-3 text-[var(--color-text-primary)] shadow-lg backdrop-blur-sm transition-all duration-200 hover:bg-[var(--color-bg-elevated)]">
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
