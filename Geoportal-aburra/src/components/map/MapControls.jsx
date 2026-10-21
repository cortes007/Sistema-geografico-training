import { useEffect, useRef, useState } from 'react';
import { Compass, Layers, LocateFixed, LoaderCircle, Minus, Plus } from 'lucide-react';
import { useMapContext } from '../../context/useMapContext';

const buttonClassName = 'flex h-11 w-11 items-center justify-center rounded-full border border-[var(--color-bg-elevated)] bg-[var(--color-bg-secondary)]/95 text-[var(--color-text-secondary)] shadow-[var(--shadow-card)] backdrop-blur-sm transition-colors hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)] disabled:cursor-wait disabled:opacity-60';

export default function MapControls({ isSidebarOpen, locationStatus, onRequestLocation }) {
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
    map.getLayers().getArray()
      .filter((layer) => layer.get('locationRadiusLayer') || layer.get('routeLayer'))
      .forEach((layer) => {
        layer.getSource().getFeatures().forEach((feature) => feature.changed());
        layer.changed();
      });
  };

  const resetNorth = (event) => {
    event?.stopPropagation();
    map.getView().animate({ rotation: 0, duration: 250 });
  };

  const changeZoom = (delta) => {
    const view = map.getView();
    const currentZoom = view.getZoom();
    if (currentZoom === undefined) return;
    view.animate({ zoom: currentZoom + delta, duration: 200 });
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
    <>
      <div className="absolute bottom-4 left-4 z-20 max-md:bottom-[calc(var(--sheet-h)+12px)] max-md:left-3 max-md:transition-[bottom] max-md:duration-200" data-sidebar-open={isSidebarOpen}>
        <button
          type="button"
          onClick={toggleBaseLayer}
          title={isSatellite ? 'Mostrar calles' : 'Mostrar satélite'}
          aria-label={isSatellite ? 'Mostrar calles' : 'Mostrar satélite'}
          className="relative flex h-16 w-16 flex-col items-center justify-end overflow-hidden rounded-xl border-2 border-white bg-cover bg-center pb-1.5 text-white shadow-[var(--shadow-card)] transition-transform hover:scale-105 max-md:h-11 max-md:w-11"
          style={{
            backgroundImage: 'url(https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/6/18/30)',
          }}
        >
          <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-gradient-to-t from-black/80 to-black/20 px-1 py-1 text-[10px] font-semibold drop-shadow">
            <Layers className="h-3.5 w-3.5 max-md:h-5 max-md:w-5" />
            <span className="max-md:hidden">Capas</span>
          </span>
        </button>
      </div>
      <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-3 max-md:bottom-[calc(var(--sheet-h)+12px)] max-md:right-3 max-md:transition-[bottom] max-md:duration-200">
        <button
          type="button"
          onClick={onRequestLocation}
          disabled={locationStatus === 'loading'}
          title="Ubicación actual"
          aria-label={locationStatus === 'loading' ? 'Consultando ubicación' : 'Ubicación actual'}
          className={buttonClassName}
        >
          {locationStatus === 'loading'
            ? <LoaderCircle className="h-5 w-5 animate-spin" />
            : <LocateFixed className="h-5 w-5" />}
        </button>
        <button
          type="button"
          onClick={() => changeZoom(1)}
          title="Acercar mapa"
          aria-label="Acercar mapa"
          className={`${buttonClassName} max-md:hidden`}
        >
          <Plus className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => changeZoom(-1)}
          title="Alejar mapa"
          aria-label="Alejar mapa"
          className={`${buttonClassName} max-md:hidden`}
        >
          <Minus className="h-5 w-5" />
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
          className={`${buttonClassName} touch-none`}
        >
          <Compass className="h-5 w-5 transition-transform" style={{ transform: `rotate(${rotation}rad)` }} />
        </button>
      </div>
    </>
  );
}