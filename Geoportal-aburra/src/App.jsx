import { useEffect, useState } from 'react';
import { MapPin, Navigation, ExternalLink, PanelLeftClose, PanelLeftOpen, ArrowLeft } from 'lucide-react';
import { useMapContext } from './context/MapContext';
import { MapProvider } from './context/MapContext';
import MapContainer from './components/map/MapContainer';
import LayerPanel from './components/sidebar/LayerPanel';
import CRSPanel from './components/sidebar/CRSPanel';
import { fetchPlaceImage } from './utils/placeDetails';

function PlaceDetailsCard({ onBack }) {
  const { selectedPlace } = useMapContext();
  const [imageUrl, setImageUrl] = useState('');
  const [loadingImage, setLoadingImage] = useState(false);

  useEffect(() => {
    if (!selectedPlace) {
      return;
    }

    let cancelled = false;

    const loadImage = async () => {
      setLoadingImage(true);

      try {
        const result = await fetchPlaceImage(selectedPlace);
        if (!cancelled) setImageUrl(result);
      } finally {
        if (!cancelled) setLoadingImage(false);
      }
    };

    loadImage();

    return () => {
      cancelled = true;
    };
  }, [selectedPlace]);

  if (!selectedPlace) return null;

  const googleMapsUrl = `https://www.google.com/maps?q=${selectedPlace.latitude},${selectedPlace.longitude}&z=18`;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <button
        type="button"
        onClick={onBack}
        aria-label="Cerrar detalle del lugar"
        className="absolute right-3 top-3 z-10 rounded-full bg-white/90 p-1.5 text-slate-600 shadow-sm hover:bg-white"
      >
        <ArrowLeft className="h-4 w-4" />
      </button>

      {loadingImage ? (
        <div className="flex h-52 items-center justify-center bg-slate-100 text-sm text-slate-500">
          Cargando imagen…
        </div>
      ) : (
        <img
          src={imageUrl || 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="1000" height="600" viewBox="0 0 1000 600">
              <rect width="1000" height="600" fill="#e2e8f0"/>
              <circle cx="500" cy="240" r="140" fill="#2563eb" opacity="0.18"/>
              <path d="M250 390 C 330 330, 420 330, 500 410 S 670 470, 750 390 L 750 470 L 250 470 Z" fill="#1d4ed8" opacity="0.82"/>
              <text x="500" y="200" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="700" fill="#0f172a">${selectedPlace.name}</text>
              <text x="500" y="420" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="26" fill="#334155">Sin imagen disponible</text>
            </svg>
          `)}
          alt={selectedPlace.name}
          className="h-52 w-full object-cover"
        />
      )}

      <div className="space-y-4 p-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">
          <MapPin className="h-3.5 w-3.5" />
          {selectedPlace.type}
        </div>

        <div>
          <h2 className="text-xl font-semibold text-slate-800">{selectedPlace.name}</h2>
          <p className="mt-1 text-sm text-slate-500">Ubicación seleccionada en el mapa</p>
        </div>

        <div className="grid gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-slate-700">Latitud</span>
            <span>{selectedPlace.latitude}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-slate-700">Longitud</span>
            <span>{selectedPlace.longitude}</span>
          </div>
        </div>

        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          <Navigation className="h-4 w-4" />
          Abrir en Google Maps
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}

function GeoportalContent() {
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const { selectedPlace, clearSelectedPlace } = useMapContext();

  return (
    <>
      <div className="relative h-dvh w-full overflow-hidden">
        <main className="relative h-full min-h-0 min-w-0">
          <MapContainer />
        </main>
        <aside
          id="geoportal-sidebar"
          className={`absolute left-4 top-4 z-20 flex max-h-[calc(100%-2rem)] w-[min(20rem,calc(100vw-2rem))] flex-col overflow-y-auto rounded-xl border border-gray-200 bg-white p-3 text-[13px] shadow-xl transition-transform duration-200 ${isPanelOpen ? 'translate-x-0' : '-translate-x-[calc(100%+1rem)]'}`}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <h1 className="text-base font-semibold text-gray-800">Geoportal Deportivo Valle de Aburrá</h1>
              <p className="text-xs text-gray-500">Parques de calistenia, gimnasios y centros deportivos</p>
            </div>
            <button type="button" onClick={() => setIsPanelOpen(false)} aria-label="Colapsar panel" className="rounded p-1 text-gray-600 hover:bg-gray-100">
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 shrink-0">
            <CRSPanel />
          </div>
          {selectedPlace ? (
            <div className="mt-3 shrink-0">
              <PlaceDetailsCard onBack={clearSelectedPlace} />
            </div>
          ) : (
            <div className="mt-3 shrink-0">
              <LayerPanel />
            </div>
          )}
        </aside>
        {!isPanelOpen && (
          <button type="button" onClick={() => setIsPanelOpen(true)} aria-label="Expandir panel" className="absolute left-4 top-4 z-20 rounded-xl border border-gray-200 bg-white p-3 text-gray-700 shadow-xl hover:bg-gray-100">
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
