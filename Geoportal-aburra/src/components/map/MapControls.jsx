import { useEffect, useRef, useState } from 'react';
import { Compass, Layers, Minus, Plus } from 'lucide-react';
import { useMapContext } from '../../context/MapContext';

export default function MapControls() {
  const { map } = useMapContext();
  const compassRef = useRef(null);
  const draggingCompassRef = useRef(false);
  const dragStartAngleRef = useRef(0);
  const startRotationRef = useRef(0);
  const [rotation, setRotation] = useState(0);
  const [isSatellite, setIsSatellite] = useState(false);

  useEffect(() => {
    if (!map) return undefined;

    const view = map.getView();
    const handleRotationChange = () => setRotation(view.getRotation());
    view.on('change:rotation', handleRotationChange);
    handleRotationChange();

    return () => view.un('change:rotation', handleRotationChange);
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

  const resetNorth = (event) => {
    event?.stopPropagation();
    map.getView().animate({ rotation: 0, duration: 250 });
  };

  const getPointerAngle = (event) => {
    const rect = compassRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return Math.atan2(
      event.clientY - (rect.top + rect.height / 2),
      event.clientX - (rect.left + rect.width / 2)
    );
  };

  const startCompassDrag = (event) => {
    draggingCompassRef.current = false;
    dragStartAngleRef.current = getPointerAngle(event);
    startRotationRef.current = map.getView().getRotation();
    compassRef.current?.setPointerCapture(event.pointerId);
  };

  const dragCompass = (event) => {
    if (!compassRef.current?.hasPointerCapture(event.pointerId)) return;

    const angleDelta = getPointerAngle(event) - dragStartAngleRef.current;
    if (Math.abs(angleDelta) > 0.03) draggingCompassRef.current = true;
    map.getView().setRotation(startRotationRef.current + angleDelta);
  };

  const endCompassDrag = (event) => {
    if (compassRef.current?.hasPointerCapture(event.pointerId)) {
      compassRef.current.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <div className="absolute right-4 top-4 z-20 flex flex-col overflow-hidden rounded-2xl bg-white/95 shadow-lg backdrop-blur">
      <button
        type="button"
        onClick={toggleBaseLayer}
        title={isSatellite ? 'Mostrar calles' : 'Mostrar satélite'}
        className="flex h-11 w-11 items-center justify-center text-gray-700 hover:bg-gray-100"
      >
        <Layers className="h-5 w-5" />
      </button>
      <button
        type="button"
        ref={compassRef}
        onPointerDown={startCompassDrag}
        onPointerMove={dragCompass}
        onPointerUp={endCompassDrag}
        onClick={(event) => {
          if (!draggingCompassRef.current) resetNorth(event);
        }}
        title="Orientar mapa al norte"
        aria-label="Orientar mapa al norte"
        className="flex h-11 w-11 touch-none items-center justify-center border-t border-gray-200 text-gray-700 hover:bg-gray-100"
      >
        <Compass className="h-5 w-5 transition-transform" style={{ transform: `rotate(${rotation}rad)` }} />
      </button>
      <button type="button" onClick={() => zoom(1)} title="Acercar" className="flex h-11 w-11 items-center justify-center border-t border-gray-200 text-gray-700 hover:bg-gray-100">
        <Plus className="h-5 w-5" />
      </button>
      <button type="button" onClick={() => zoom(-1)} title="Alejar" className="flex h-11 w-11 items-center justify-center border-t border-gray-200 text-gray-700 hover:bg-gray-100">
        <Minus className="h-5 w-5" />
      </button>
    </div>
  );
}