import { useEffect, useState } from 'react';
import { Menu, X, MapPin, X as CloseIcon, Navigation, ExternalLink } from 'lucide-react';
import { useMapContext } from './context/MapContext';
import { MapProvider } from './context/MapContext';
import MapContainer from './components/map/MapContainer';
import LayerPanel from './components/sidebar/LayerPanel';
import CRSPanel from './components/sidebar/CRSPanel';
import { fetchPlaceImage } from './utils/placeDetails';

function PlaceDetailsCard() {
  const { selectedPlace, clearSelectedPlace } = useMapContext();
  const [imageUrl, setImageUrl] = useState('');
  const [loadingImage, setLoadingImage] = useState(false);

  useEffect(() => {
    if (!selectedPlace) {
      setImageUrl('');
      setLoadingImage(false);
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

    setImageUrl('');
    loadImage();

    return () => {
      cancelled = true;
    };
  }, [selectedPlace]);

  if (!selectedPlace) return null;

  const googleMapsUrl = `https://www.google.com/maps?q=${selectedPlace.latitude},${selectedPlace.longitude}&z=18`;

  return (
    <div className="absolute bottom-4 right-4 z-20 w-[min(26rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
      <button
        type="button"
        onClick={clearSelectedPlace}
        aria-label="Cerrar detalle del lugar"
        className="absolute right-3 top-3 z-10 rounded-full bg-white/90 p-1.5 text-slate-600 shadow-sm hover:bg-white"
      >
        <CloseIcon className="h-4 w-4" />
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

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <MapProvider>
      <div className="relative flex h-dvh w-full overflow-hidden">
        <button
          type="button"
          onClick={() => setIsSidebarOpen((open) => !open)}
          aria-label={isSidebarOpen ? 'Cerrar panel lateral' : 'Abrir panel lateral'}
          aria-expanded={isSidebarOpen}
          aria-controls="geoportal-sidebar"
          className="fixed left-3 top-3 z-40 rounded-md bg-white p-2 text-gray-700 shadow-md hover:bg-gray-100 md:hidden"
        >
          {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        {isSidebarOpen && (
          <button
            type="button"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Cerrar panel lateral"
            className="fixed inset-0 z-20 bg-black/30 md:hidden"
          />
        )}

        <aside
          id="geoportal-sidebar"
          className={`fixed inset-y-0 left-0 z-30 flex w-[min(20rem,calc(100vw-3rem))] flex-col gap-4 overflow-y-auto border-r border-gray-200 bg-white p-4 transition-transform duration-200 ease-out md:static md:z-auto md:w-80 md:flex-shrink-0 md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        >
          <div>
            <h1 className="text-base font-semibold text-gray-800">Geoportal Deportivo Valle de Aburrá</h1>
            <p className="text-xs text-gray-500">Parques de calistenia, gimnasios y centros deportivos</p>
          </div>
          <CRSPanel />
          <LayerPanel />
        </aside>
        <main className="relative h-full min-h-0 min-w-0 flex-1">
          <MapContainer />
          <PlaceDetailsCard />
        </main>
      </div>
    </MapProvider>
  );
}
