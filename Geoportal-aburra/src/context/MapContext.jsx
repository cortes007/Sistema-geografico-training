import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { createEmpty, extend, isEmpty } from 'ol/extent';
import { EQUIPMENT_TYPES } from '../constants/equipmentTypes';
import { DEFAULT_SEARCH_RADIUS_METERS } from '../constants/location';
import { getAnimationDuration } from '../utils/gis/mapCentering';
import { DEFAULT_SPOT_FILTERS } from '../utils/spotFilters';
import { MapContext } from './mapContext';

export function MapProvider({ children }) {
  const [map, setMap] = useState(null);
  const [layers, setLayers] = useState([]); // { id, name, olLayer, sourceCRS, sourceCode, rawGeojson, visible }
  const [activeCRS, setActiveCRS] = useState('EPSG:4326');
  const [capturedCoord, setCapturedCoord] = useState(null); // [x, y] en EPSG:3857
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [userLocation, setUserLocation] = useState(null); // { latitude, longitude } en EPSG:4326
  const [locationStatus, setLocationStatus] = useState('idle'); // 'idle' | 'loading' | 'ready' | 'error'
  const [locationError, setLocationError] = useState('');
  const [locationSource, setLocationSource] = useState(null); // null | 'gps' | 'manual'
  const [isPickingLocation, setIsPickingLocation] = useState(false);
  const [searchRadiusMeters, setSearchRadiusMeters] = useState(DEFAULT_SEARCH_RADIUS_METERS);
  const [spotFilters, setSpotFilters] = useState(DEFAULT_SPOT_FILTERS);
  const [spotFilterIndex, setSpotFilterIndex] = useState(() => ({
    ratingsBySpot: new Map(),
    upcomingSpotIds: new Set(),
  }));
  const [route, setRoute] = useState(null); // GeoJSON coordinates en EPSG:4326
  const [ratingsVersion, setRatingsVersion] = useState(0);
  const [trainingSpotsError, setTrainingSpotsError] = useState('');
  const [activeEquipmentTypes, setActiveEquipmentTypes] = useState(() =>
    Object.values(EQUIPMENT_TYPES).reduce((types, type) => ({ ...types, [type]: true }), {})
  );

  const mapRef = useRef(map);
  const layersRef = useRef(layers);
  const selectedPlaceRef = useRef(selectedPlace);

  useEffect(() => {
    mapRef.current = map;
  }, [map]);

  useEffect(() => {
    layersRef.current = layers;
  }, [layers]);

  useEffect(() => {
    selectedPlaceRef.current = selectedPlace;
  }, [selectedPlace]);

  const addLayer = useCallback((layer) => {
    setLayers((prev) => {
      if (layer.layerKey && prev.some((item) => item.layerKey === layer.layerKey)) {
        if (mapRef.current) mapRef.current.removeLayer(layer.olLayer);
        return prev;
      }

      return [...prev, layer];
    });
  }, []);

  const removeLayer = useCallback((id) => {
    const currentLayers = layersRef.current;
    const currentMap = mapRef.current;
    const currentSelectedPlace = selectedPlaceRef.current;

    const target = currentLayers.find((layer) => layer.id === id);
    if (!target) return;

    if (currentMap) currentMap.removeLayer(target.olLayer);
    const remainingLayers = currentLayers.filter((layer) => layer.id !== id);
    setLayers(remainingLayers);

    const source = target.olLayer.getSource();
    const selectedFeatureBelongsToLayer = source?.hasFeature?.(currentSelectedPlace?.feature)
      || (target.name === 'training_spots' && Boolean(currentSelectedPlace?.trainingSpotId));
    if (currentSelectedPlace?.feature && selectedFeatureBelongsToLayer) {
      setSelectedPlace(null);
    }

    if (!currentMap || remainingLayers.length === 0) return;

    const remainingExtent = createEmpty();
    remainingLayers.forEach(({ olLayer }) => {
      const extent = olLayer.getSource()?.getExtent?.();
      if (extent && extent.every(Number.isFinite)) extend(remainingExtent, extent);
    });

    if (!isEmpty(remainingExtent)) {
      currentMap.getView().fit(remainingExtent, {
        padding: [40, 40, 40, 40],
        maxZoom: 17,
        duration: getAnimationDuration(400),
      });
    }
  }, []);

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

  const resetSpotFilters = useCallback(() => {
    setSpotFilters(DEFAULT_SPOT_FILTERS);
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
      locationStatus,
      setLocationStatus,
      locationError,
      setLocationError,
      locationSource,
      setLocationSource,
      isPickingLocation,
      setIsPickingLocation,
      searchRadiusMeters,
      setSearchRadiusMeters,
      spotFilters,
      setSpotFilters,
      resetSpotFilters,
      spotFilterIndex,
      setSpotFilterIndex,
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
      locationStatus,
      locationError,
      locationSource,
      isPickingLocation,
      searchRadiusMeters,
      spotFilters,
      resetSpotFilters,
      spotFilterIndex,
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
