import { useRef } from 'react';
import { useOpenMap } from '../../hooks/useOpenMap';
import { useCoordinateCapture } from '../../hooks/useCoordinateCapture';
import { useClickMarker } from '../../hooks/useClickMarker';

export default function MapContainer() {
  const targetRef = useRef(null);
  useOpenMap(targetRef);
  useCoordinateCapture();
  useClickMarker();

  return <div ref={targetRef} className="h-full w-full" />;
}
