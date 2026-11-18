import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { toLonLat } from 'ol/proj';
import { getArea } from 'ol/sphere';
import {
  ZONA_INITIAL_RESOLUTION,
  ZONA_LABEL_MIN_ZOOM,
  ZONA_MAX_ZOOM,
  ZONA_MIN_ZOOM,
  ZONAS_DEPORTIVAS,
} from '../../../config/zonasDeportivas';
import { THEME_COLORS } from '../../../constants/themeColors';
import {
  buildZonasDeportivasFeatures,
  getZonaDeportivaStyle,
} from '../zonasDeportivasUtils';

function getResolutionForZoom(zoom) {
  return ZONA_INITIAL_RESOLUTION / 2 ** zoom;
}

describe('zonasDeportivasUtils (Polígonos reales de OpenStreetMap)', () => {
  it('dibuja un Polygon tal cual, un MultiPolygon tal cual, usa el fallback y omite/reporta un id inexistente o vacío', () => {
    const primaryGeojson = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          id: 'relation/7680489',
          properties: {
            '@id': 'relation/7680489',
            name: 'Nombre OSM Ignorado',
          },
          geometry: {
            type: 'MultiPolygon',
            coordinates: [
              [
                [
                  [-75.592, 6.254],
                  [-75.591, 6.254],
                  [-75.591, 6.255],
                  [-75.592, 6.255],
                  [-75.592, 6.254],
                ],
              ],
              [
                [
                  [-75.59, 6.256],
                  [-75.588, 6.256],
                  [-75.588, 6.258],
                  [-75.59, 6.258],
                  [-75.59, 6.256],
                ],
              ],
            ],
          },
        },
        {
          type: 'Feature',
          id: 'way/151946379',
          properties: {
            '@id': 'way/151946379',
            name: 'Unidad Deportiva Belén',
          },
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [-75.5898, 6.236],
                [-75.5873, 6.236],
                [-75.5873, 6.2325],
                [-75.5898, 6.2325],
                [-75.5898, 6.236],
              ],
            ],
          },
        },
      ],
    };

    const fallbackGeojson = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          id: 'way/129724124',
          properties: {
            '@id': 'way/129724124',
            name: 'Polideportivo Itagüí',
          },
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [-75.6048, 6.1703],
                [-75.6056, 6.1698],
                [-75.6052, 6.1692],
                [-75.6044, 6.1698],
                [-75.6048, 6.1703],
              ],
            ],
          },
        },
      ],
    };

    const testConfig = [
      {
        id: 'atanasio',
        nombre: 'Unidad Deportiva Atanasio Girardot',
        osmIds: ['relation/7680489'],
      },
      {
        id: 'belen',
        nombre: 'Unidad Deportiva de Belén',
        osmIds: ['way/151946379'],
      },
      {
        id: 'itagui',
        nombre: 'Polideportivo Itagüí',
        osmIds: ['way/129724124'],
      },
      {
        id: 'inexistente',
        nombre: 'Zona Inexistente',
        osmIds: ['way/999999999'],
      },
      {
        id: 'pendiente',
        nombre: 'Zona Pendiente',
        osmIds: [],
      },
    ];

    const { features, drawnZones, missingZones } = buildZonasDeportivasFeatures({
      primaryGeojson,
      fallbackGeojson,
      zonasConfig: testConfig,
    });

    expect(features).toHaveLength(3);
    expect(drawnZones).toHaveLength(3);
    expect(missingZones).toHaveLength(2);

    const atanasioFeature = features.find((f) => f.get('zonaId') === 'atanasio');
    expect(atanasioFeature.getGeometry().getType()).toBe('MultiPolygon');
    expect(atanasioFeature.getGeometry().getPolygons()).toHaveLength(2);
    expect(atanasioFeature.get('zonaNombre')).toBe('Unidad Deportiva Atanasio Girardot');

    const belenFeature = features.find((f) => f.get('zonaId') === 'belen');
    expect(belenFeature.getGeometry().getType()).toBe('Polygon');
    expect(belenFeature.getGeometry().getCoordinates()[0]).toHaveLength(5);

    const itaguiDrawn = drawnZones.find((z) => z.id === 'itagui');
    expect(itaguiDrawn.sources).toEqual(['fallback']);

    const missingById = missingZones.find((z) => z.id === 'inexistente');
    expect(missingById.reason).toBe('id_no_encontrado_en_geojson');
    expect(missingById.missingOsmIds).toEqual(['way/999999999']);

    const missingEmpty = missingZones.find((z) => z.id === 'pendiente');
    expect(missingEmpty.reason).toBe('sin_osm_id_configurado');
  });

  it('carga los archivos reales public/data/zonas_deportiva.geojson y parques_aburra.geojson con las 6 zonas de config', () => {
    const primaryUrl = new URL('../../../../public/data/zonas_deportiva.geojson', import.meta.url);
    const fallbackUrl = new URL('../../../../public/data/parques_aburra.geojson', import.meta.url);

    const primaryGeojson = JSON.parse(readFileSync(primaryUrl, 'utf8'));
    const fallbackGeojson = JSON.parse(readFileSync(fallbackUrl, 'utf8'));

    const { features, drawnZones, missingZones } = buildZonasDeportivasFeatures({
      primaryGeojson,
      fallbackGeojson,
      zonasConfig: ZONAS_DEPORTIVAS,
    });

    expect(ZONAS_DEPORTIVAS).toHaveLength(8);
    expect(features).toHaveLength(7);
    expect(drawnZones.map((z) => z.nombre)).toEqual([
      'Unidad Deportiva Atanasio Girardot',
      'Unidad Deportiva de Belén',
      'Polideportivo Itagüí',
      'Complejo Deportivo Ditaires',
      'Unidad Deportiva Zona Norte, INDESA',
      'Unidad Deportiva Zona Sur, INDESA',
      'Polideportivo Sur de Envigado',
    ]);
    expect(missingZones.map((z) => z.nombre)).toEqual([
      'Unidad Deportiva La Tablaza',
    ]);

    features.forEach((feature) => {
      const areaM2 = getArea(feature.getGeometry(), { projection: 'EPSG:3857' });
      const [lon, lat] = toLonLat(feature.get('labelPoint').getCoordinates(), 'EPSG:3857');
      expect(areaM2).toBeGreaterThan(1000);
      expect(lat).toBeGreaterThan(6.1);
      expect(lon).toBeLessThan(-75.5);
    });
  });

  it('aplica trazo morado sólido de 2px sin línea punteada y muestra etiqueta con el nombre de config desde ZONA_LABEL_MIN_ZOOM', () => {
    const { features } = buildZonasDeportivasFeatures({
      primaryGeojson: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            id: 'way/151946379',
            properties: { '@id': 'way/151946379', name: 'Nombre OSM' },
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [-75.5898, 6.236],
                  [-75.5873, 6.236],
                  [-75.5873, 6.2325],
                  [-75.5898, 6.2325],
                  [-75.5898, 6.236],
                ],
              ],
            },
          },
        ],
      },
      zonasConfig: [
        {
          id: 'belen',
          nombre: 'Unidad Deportiva de Belén',
          osmIds: ['way/151946379'],
        },
      ],
    });

    const zonaFeature = features[0];

    const styleLowZoom = getZonaDeportivaStyle(
      zonaFeature,
      getResolutionForZoom(ZONA_MIN_ZOOM + 0.5)
    );
    expect(Array.isArray(styleLowZoom)).toBe(false);
    expect(styleLowZoom.getStroke().getColor()).toBe(THEME_COLORS.accent);
    expect(styleLowZoom.getStroke().getWidth()).toBe(2);
    expect(styleLowZoom.getStroke().getLineDash()).toBeNull();

    const styleWithLabel = getZonaDeportivaStyle(
      zonaFeature,
      getResolutionForZoom(ZONA_LABEL_MIN_ZOOM + 0.5)
    );
    expect(Array.isArray(styleWithLabel)).toBe(true);
    expect(styleWithLabel[1].getText().getText()).toBe('Unidad Deportiva de Belén');
    expect(styleWithLabel[1].getText().getFill().getColor()).toBe(THEME_COLORS.accent);
    expect(styleWithLabel[1].getText().getStroke().getColor()).toBe(THEME_COLORS.white);

    const hiddenAboveMaxZoom = getZonaDeportivaStyle(
      zonaFeature,
      getResolutionForZoom(ZONA_MAX_ZOOM + 0.5)
    );
    expect(hiddenAboveMaxZoom).toBeNull();
  });
});
