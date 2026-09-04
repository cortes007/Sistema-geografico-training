import { useEffect, useRef, useState } from 'react';
import { Layers, Minus, Plus } from 'lucide-react';
import Rotate from 'ol/control/Rotate';
import Zoom from 'ol/control/Zoom';
import { useMapContext } from '../../context/MapContext';

export default function MapControls() {
  const { map } = useMapContext();
  const rotateTargetRef = useRef(null);
  const [isSatellite, setIsSatellite] = useState(false);

  useEffect(() => {
    if (!map || !rotateTargetRef.current) return undefined;
    map.getControls().getArray()
      .filter((control) => control instanceof Zoom || control instanceof Rotate)
      .forEach((control) => map.removeControl(control));
    const rotate = new Rotate({ target: rotateTargetRef.current });
    map.addControl(rotate);
    return () => map.removeControl(rotate);
  }, [map]);

  const toggleBaseLayer = () => {
    const layers = map.getLayers().getArray();
    const streets = layers.find((layer) => layer.get('baseLayer') === 'streets');
    const satellite = layers.find((layer) => layer.get('baseLayer') === 'satellite');
    if (!streets || !satellite) return;
    const nextSatellite = !isSatellite;
    satellite.setVisible(nextSatellite);
    streets.setVisible(!nextSatellite);
    setIsSatellite(nextSatellite);
  };

  const zoom = (delta) => {
    const view = map.getView();
    view.animate({ zoom: view.getZoom() + delta, duration: 200 });
  };

  return (
    <div className="absolute right-4 top-4 z-20 flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
      <button
        type="button"
        onClick={toggleBaseLayer}
        title={isSatellite ? 'Mostrar calles' : 'Mostrar satélite'}
        className="flex h-11 w-11 items-center justify-center text-gray-700 hover:bg-gray-100"
      >
        <Layers className="h-5 w-5" />
      </button>
      <div ref={rotateTargetRef} className="ol-rotate-control border-t border-gray-200 [&>button]:flex [&>button]:h-11 [&>button]:w-11 [&>button]:items-center [&>button]:justify-center [&>button]:border-0 [&>button]:bg-white [&>button]:text-gray-700" />
      <button type="button" onClick={() => zoom(1)} title="Acercar" className="flex h-11 w-11 items-center justify-center border-t border-gray-200 text-gray-700 hover:bg-gray-100">
        <Plus className="h-5 w-5" />
      </button>
      <button type="button" onClick={() => zoom(-1)} title="Alejar" className="flex h-11 w-11 items-center justify-center border-t border-gray-200 text-gray-700 hover:bg-gray-100">
        <Minus className="h-5 w-5" />
      </button>
    </div>
  );
}