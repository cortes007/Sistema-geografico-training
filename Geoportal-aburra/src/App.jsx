import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { MapProvider } from './context/MapContext';
import MapContainer from './components/map/MapContainer';
import LayerPanel from './components/sidebar/LayerPanel';
import CRSPanel from './components/sidebar/CRSPanel';

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
        </main>
      </div>
    </MapProvider>
  );
}
