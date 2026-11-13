import { useCallback, useEffect } from 'react';
import Feature from 'ol/Feature';
import MVT from 'ol/format/MVT';
import VectorTileLayer from 'ol/layer/VectorTile';
import VectorTileSource from 'ol/source/VectorTile';
import { useMapContext } from '../context/useMapContext';
import {
  getFeatureStyle,
  prepareTrainingSpotFeature,
} from '../utils/gis/layerStyles';

export const TRAINING_SPOTS_TILE_URL =
  'https://agxaidzgnbgnzihefbdf.supabase.co/functions/v1/mvt-training-spots?z={z}&x={x}&y={y}';

export function loadTrainingSpotsTile(tile, url) {
  tile.setLoader(async (extent, _resolution, projection) => {
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    try {
      const response = await fetch(url, {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`La tesela MVT respondió con HTTP ${response.status}.`);
      }

      const data = await response.arrayBuffer();
      const features =
        data.byteLength === 0
          ? []
          : tile.getFormat().readFeatures(data, {
              extent,
              featureProjection: projection,
            });

      for (let i = 0; i < features.length; i += 1) {
        prepareTrainingSpotFeature(features[i]);
      }

      tile.setFeatures(features);
    } catch (error) {
      console.error(
        'No se pudo cargar la tesela MVT de training_spots.',
        error
      );
      tile.onError();
    }
  });
}

export function useTrainingSpotsLayer() {
  const { map, addLayer, layers, activeEquipmentTypes } = useMapContext();

  useEffect(() => {
    layers.forEach(({ olLayer, name }) => {
      olLayer.setStyle((feature) =>
        getFeatureStyle(
          feature,
          activeEquipmentTypes,
          name === 'training_spots'
        )
      );
    });
  }, [layers, activeEquipmentTypes]);

  const loadTrainingSpots = useCallback(() => {
    if (!map) {
      throw new Error('El mapa aún no está listo.');
    }

    const format = new MVT({ featureClass: Feature });
    const source = new VectorTileSource({
      format,
      url: TRAINING_SPOTS_TILE_URL,
      tileSize: 256,
      minZoom: 0,
      maxZoom: 22,
      tileLoadFunction: loadTrainingSpotsTile,
    });
    const olLayer = new VectorTileLayer({
      source,
      style: (feature) => getFeatureStyle(feature, activeEquipmentTypes, true),
      minZoom: 0,
      maxZoom: 22,
      renderMode: 'vector',
      preload: 1,
    });
    olLayer.set('trainingSpotsLayer', true);
    map.addLayer(olLayer);

    addLayer({
      id: crypto.randomUUID(),
      layerKey: 'training_spots|mvt',
      name: 'training_spots',
      olLayer,
      sourceCode: 'EPSG:3857',
      sourceCRS: 'Vector Tiles MVT (EPSG:3857)',
      rawGeojson: null,
      visible: true,
    });
  }, [map, addLayer, activeEquipmentTypes]);

  return { loadTrainingSpots };
}
