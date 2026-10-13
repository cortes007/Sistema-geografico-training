import { useEffect } from 'react';
import { useMapContext } from '../context/MapContext';
import { useLayerLoader } from './useLayerLoader';

export function useInitialTrainingSpots() {
  const { map, trainingSpotsError, setTrainingSpotsError } = useMapContext();
  const { loadTrainingSpots } = useLayerLoader();

  useEffect(() => {
    if (!map || map.get('initialGeoJSONLoadStarted')) return;

    map.set('initialGeoJSONLoadStarted', true);
    Promise.resolve()
      .then(loadTrainingSpots)
      .then(() => setTrainingSpotsError(''))
      .catch((reason) => {
        map.set('initialGeoJSONLoadStarted', false);
        setTrainingSpotsError(reason.message || 'No se pudo cargar la capa inicial de lugares.');
      });
  }, [loadTrainingSpots, map, setTrainingSpotsError]);

  return trainingSpotsError;
}
