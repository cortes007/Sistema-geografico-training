import { useEffect } from 'react';
import { useMapContext } from '../context/useMapContext';
import { useLayerLoader } from './useLayerLoader';

export function useInitialTrainingSpots() {
  const { map, trainingSpotsError, setTrainingSpotsError } = useMapContext();
  const { loadTrainingSpots } = useLayerLoader();

  useEffect(() => {
    if (!map || map.get('initialTrainingSpotsLoadStarted')) return;

    map.set('initialTrainingSpotsLoadStarted', true);
    Promise.resolve()
      .then(loadTrainingSpots)
      .then(() => setTrainingSpotsError(''))
      .catch((reason) => {
        map.set('initialTrainingSpotsLoadStarted', false);
        setTrainingSpotsError(reason.message || 'No se pudo cargar la capa inicial de lugares.');
      });
  }, [loadTrainingSpots, map, setTrainingSpotsError]);

  return trainingSpotsError;
}
