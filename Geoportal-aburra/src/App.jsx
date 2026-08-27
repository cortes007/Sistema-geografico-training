import { MapProvider } from './context/MapContext';
import MapContainer from './components/map/MapContainer';
import LayerPanel from './components/sidebar/LayerPanel';
import CRSPanel from './components/sidebar/CRSPanel';

export default function App() {
  return (
    <MapProvider>
      <div className="flex h-screen w-screen overflow-hidden">
        <aside className="flex w-80 flex-shrink-0 flex-col gap-4 overflow-y-auto border-r border-gray-200 bg-white p-4">
          <div>
            <h1 className="text-base font-semibold text-gray-800">Geoportal Deportivo Valle de Aburrá</h1>
            <p className="text-xs text-gray-500">Parques de calistenia, gimnasios y centros deportivos</p>
          </div>
          <CRSPanel />
          <LayerPanel />
        </aside>
        <main className="relative h-full flex-1 min-h-0">
          <MapContainer />
        </main>
      </div>
    </MapProvider>
  );
}
