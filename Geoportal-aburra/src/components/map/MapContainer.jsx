import { useEffect, useRef, useState } from 'react';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import { useOpenMap } from '../../hooks/useOpenMap';
import { useClickMarker } from '../../hooks/useClickMarker';
import { useLocationOverlay } from '../../hooks/useLocationOverlay';
import { useRouteOverlay } from '../../hooks/useRouteOverlay';
import { useInitialTrainingSpots } from '../../hooks/useInitialTrainingSpots';
import { useZonasDeportivasLayer } from '../../hooks/useZonasDeportivasLayer';
import MapControls from './MapControls';
import { useMapContext } from '../../context/useMapContext';

export default function MapContainer({
  isSidebarOpen,
  locationStatus,
  locationError,
  isPickingLocation,
  onRequestLocation,
  onStartPickingLocation,
  onCancelPickingLocation,
}) {
  const targetRef = useRef(null);
  const { map, pickingPointTarget, setPickingPointTarget } = useMapContext();
  const [toast, setToast] = useState('');
  const isPickingAnyPoint = isPickingLocation || Boolean(pickingPointTarget);
  useOpenMap(targetRef);
  useClickMarker();
  useLocationOverlay();
  useRouteOverlay();
  const trainingSpotsError = useInitialTrainingSpots();
  useZonasDeportivasLayer();

  useEffect(() => {
    if (!map || map.get('baseLayersReady')) return;

    const streetsLayer = map.getLayers().item(0);
    if (!streetsLayer) return undefined;
    streetsLayer.set('baseLayer', 'streets');

    const satelliteLayer = new TileLayer({
      source: new XYZ({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attributions: 'Esri, Maxar, Earthstar Geographics, and the GIS User Community',
      }),
      visible: false,
    });
    satelliteLayer.set('baseLayer', 'satellite');

    const handleTileError = () => {
      satelliteLayer.setVisible(false);
      streetsLayer.setVisible(true);
      map.getLayers().getArray()
        .filter((layer) => layer.get('locationRadiusLayer') || layer.get('routeLayer'))
        .forEach((layer) => {
          layer.getSource().getFeatures().forEach((feature) => feature.changed());
          layer.changed();
        });
      setToast('Vista satelital no disponible, volviendo a calles');
      window.setTimeout(() => setToast(''), 3500);
    };

    satelliteLayer.getSource().on('tileloaderror', handleTileError);
    map.getLayers().insertAt(1, satelliteLayer);
    map.set('baseLayersReady', true);

    return () => {
      satelliteLayer.getSource().un('tileloaderror', handleTileError);
      map.removeLayer(satelliteLayer);
    };
  }, [map]);

  useEffect(() => {
    if (!isPickingAnyPoint) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (isPickingLocation) onCancelPickingLocation?.();
        if (pickingPointTarget) setPickingPointTarget(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPickingAnyPoint, isPickingLocation, onCancelPickingLocation, pickingPointTarget, setPickingPointTarget]);

  const pickingPrompt = pickingPointTarget === 'meetup-origin'
    ? 'Haz clic en el mapa para fijar el origen de la quedada.'
    : pickingPointTarget === 'meetup-destination'
      ? 'Haz clic en el mapa para fijar el destino de la quedada.'
      : 'Haz clic en cualquier punto del mapa para fijar tu ubicación.';

  const cancelActivePicking = () => {
    if (pickingPointTarget) setPickingPointTarget(null);
    if (isPickingLocation) onCancelPickingLocation?.();
  };

  return (
    <div className="relative h-full w-full">
      <div
        ref={targetRef}
        className={`h-full w-full ${isPickingAnyPoint ? 'cursor-crosshair' : ''}`}
      />
      {map && (
        <MapControls
          isSidebarOpen={isSidebarOpen}
          locationStatus={locationStatus}
          isPickingLocation={isPickingLocation}
          onRequestLocation={onRequestLocation}
          onStartPickingLocation={onStartPickingLocation}
          onCancelPickingLocation={onCancelPickingLocation}
        />
      )}
      {isPickingAnyPoint && (
        <div
          role="status"
          aria-live="polite"
          className="absolute bottom-6 left-1/2 z-30 flex w-[min(92vw,420px)] -translate-x-1/2 items-center justify-between gap-3 rounded-2xl border border-[var(--color-accent)] bg-[var(--color-bg-secondary)]/95 px-4 py-2.5 text-xs text-[var(--color-text-primary)] shadow-2xl backdrop-blur-sm max-md:bottom-[calc(var(--sheet-h)+12px)]"
        >
          <span>{pickingPrompt}</span>
          <button
            type="button"
            onClick={cancelActivePicking}
            className="min-h-11 shrink-0 rounded-xl bg-[var(--color-bg-elevated)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-primary)] transition-colors motion-reduce:transition-none hover:bg-[var(--color-accent)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-primary)]"
          >
            Cancelar
          </button>
        </div>
      )}
      {locationError && (
        <div role="alert" className="absolute left-3 right-3 top-16 z-30 rounded-xl border border-[var(--color-bg-elevated)] bg-[var(--color-bg-secondary)]/95 px-3 py-2 text-xs text-[var(--color-text-primary)] shadow-lg backdrop-blur-sm md:hidden">
          {locationError}
        </div>
      )}
      {(toast || trainingSpotsError) && (
        <div role={trainingSpotsError ? 'alert' : 'status'} aria-live={trainingSpotsError ? 'assertive' : 'polite'} className="absolute bottom-5 left-1/2 z-30 -translate-x-1/2 rounded-xl border border-[var(--color-bg-elevated)] bg-[var(--color-bg-secondary)] px-4 py-2 text-sm text-[var(--color-text-primary)] shadow-lg backdrop-blur-sm">
          {toast || trainingSpotsError}
        </div>
      )}
    </div>
  );
}
