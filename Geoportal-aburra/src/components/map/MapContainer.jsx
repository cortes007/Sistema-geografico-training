import { useRef } from 'react';
import { useOpenMap } from '../../hooks/useOpenMap';
import { useCoordinateCapture } from '../../hooks/useCoordinateCapture';

export default function MapContainer() {
  const targetRef = useRef(null);
  useOpenMap(targetRef);
  useCoordinateCapture();

  return <div ref={targetRef} className="h-full w-full" />;
}
