import { useContext } from 'react';
import { MapContext } from './mapContext';

export function useMapContext() {
  const context = useContext(MapContext);
  if (!context) throw new Error('useMapContext debe usarse dentro de <MapProvider>');
  return context;
}
