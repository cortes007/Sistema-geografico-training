import { useMemo, useState, useCallback } from 'react';
import { createEmpty, extend, isEmpty } from 'ol/extent';
import { EQUIPMENT_TYPES } from '../constants/equipmentTypes';
import { getAnimationDuration } from '../utils/gis/mapCentering';
import { MapContext } from './mapContext';

export function MapProvider({ children }) {
  const [map, setMap] = useState(null);
  const [layers, setLayers] = useState([]); // { id, name, olLayer, sourceCRS, sourceCode, rawGeojson, visible }
  const [activeCRS, setActiveCRS] = useState('EPSG:4326');
  const [capturedCoord, setCapturedCoord] = useState(null); // [x, y] en EPSG:3857
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [userLocation, setUserLocation] = useState(null); // { latitude, longitude } en EPSG:4326
  const [route, setRoute] = useState(null); // GeoJSON coordinates en EPSG:4326
  const [ratingsVersion, setRatingsVersion] = useState(0);
  const [trainingSpotsError, setTrainingSpotsError] = useState('');
  const [activeEquipmentTypes, setActiveEquipmentTypes] = useState(() =>
    Object.values(EQUIPMENT_TYPES).reduce((types, type) => ({ ...types, [type]: true }), {})
  );

  const addLayer = useCallback((layer) => {
    setLayers((prev) => {
      if (layer.layerKey && prev.some((item) => item.layerKey === layer.layerKey)) {
        if (map) map.removeLayer(layer.olLayer);
        return prev;
      }

      return [...prev, layer];
    });
  }, [map]);

  const removeLayer = useCallback((id) => {
    const target = layers.find((layer) => layer.id === id);
    if (!target) return;

    if (map) map.removeLayer(target.olLayer);
    const remainingLayers = layers.filter((layer) => layer.id !== id);
    setLayers(remainingLayers);

    const source = target.olLayer.getSource();
    const selectedFeatureBelongsToLayer = source?.hasFeature?.(selectedPlace?.feature)
      || (target.name === 'training_spots' && Boolean(selectedPlace?.trainingSpotId));
    if (selectedPlace?.feature && selectedFeatureBelongsToLayer) {
      setSelectedPlace(null);
    }

    if (!map || remainingLayers.length === 0) return;

    const remainingExtent = createEmpty();
    remainingLayers.forEach(({ olLayer }) => {
      const extent = olLayer.getSource()?.getExtent?.();
      if (extent && extent.every(Number.isFinite)) extend(remainingExtent, extent);
    });

    if (!isEmpty(remainingExtent)) {
      map.getView().fit(remainingExtent, {
        padding: [40, 40, 40, 40],
        maxZoom: 17,
        duration: getAnimationDuration(400),
      });
    }
  }, [layers, map, selectedPlace]);

  const toggleLayerVisibility = useCallback((id) => {
    setLayers((prev) =>
      prev.map((l) => {
        if (l.id === id) {
          const nextVisible = !l.visible;
          l.olLayer.setVisible(nextVisible);
          return { ...l, visible: nextVisible };
        }
        return l;
      })
    );
  }, []);

  const toggleEquipmentType = useCallback((type) => {
    setActiveEquipmentTypes((prev) => ({ ...prev, [type]: !prev[type] }));
  }, []);

  const clearSelectedPlace = useCallback(() => {
    setSelectedPlace(null);
  }, []);

  const clearRoute = useCallback(() => {
    setRoute(null);
  }, []);

  const refreshPlaceRatings = useCallback(() => {
    setRatingsVersion((version) => version + 1);
  }, []);

  const value = useMemo(
    () => ({
      map,
      setMap,
      layers,
      addLayer,
      removeLayer,
      toggleLayerVisibility,
      activeCRS,
      setActiveCRS,
      capturedCoord,
      setCapturedCoord,
      selectedPlace,
      setSelectedPlace,
      clearSelectedPlace,
      userLocation,
      setUserLocation,
      route,
      setRoute,
      clearRoute,
      ratingsVersion,
      refreshPlaceRatings,
      trainingSpotsError,
      setTrainingSpotsError,
      activeEquipmentTypes,
      toggleEquipmentType,
    }),
    [
      map,
      layers,
      addLayer,
      removeLayer,
      toggleLayerVisibility,
      activeCRS,
      capturedCoord,
      selectedPlace,
      clearSelectedPlace,
      userLocation,
      route,
      clearRoute,
      ratingsVersion,
      refreshPlaceRatings,
      trainingSpotsError,
      activeEquipmentTypes,
      toggleEquipmentType,
    ]
  );

  return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
}
