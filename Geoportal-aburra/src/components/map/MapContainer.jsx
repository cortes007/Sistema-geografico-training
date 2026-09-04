import { useEffect, useRef, useState } from 'react';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import { useOpenMap } from '../../hooks/useOpenMap';
import { useCoordinateCapture } from '../../hooks/useCoordinateCapture';
import { useClickMarker } from '../../hooks/useClickMarker';
import MapControls from './MapControls';
import { useMapContext } from '../../context/MapContext';

export default function MapContainer() {
  const targetRef = useRef(null);
  const { map } = useMapContext();
  const [toast, setToast] = useState('');
  useOpenMap(targetRef);
  useCoordinateCapture();
  useClickMarker();

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

  return (
    <div className="relative h-full w-full">
      <div ref={targetRef} className="h-full w-full" />
      {map && <MapControls />}
      {toast && (
        <div className="absolute bottom-5 left-1/2 z-30 -translate-x-1/2 rounded-lg bg-white px-4 py-2 text-sm text-gray-700 shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
