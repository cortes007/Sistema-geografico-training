/**
 * Configuración de las 6 Zonas Deportivas principales del Valle de Aburrá.
 * Referencia explícita por ID de OpenStreetMap (`osmIds`), sin radios ni geometría calculada.
 */

/** Zoom mínimo desde el cual son visibles los contornos de las zonas deportivas. */
export const ZONA_MIN_ZOOM = 11;

/** Zoom máximo hasta el cual son visibles las zonas deportivas (se ocultan en zoom muy alto para no estorbar). */
export const ZONA_MAX_ZOOM = 16.5;

/** Zoom intermedio desde el cual se muestra la etiqueta con el nombre de la zona deportiva. */
export const ZONA_LABEL_MIN_ZOOM = 12.5;

/** Resolución base Web Mercator (EPSG:3857) en zoom 0 para cálculo de zoom desde resolución. */
export const ZONA_INITIAL_RESOLUTION = 156543.03392804097;

/** Ruta principal del GeoJSON de zonas deportivas y ruta de respaldo. */
export const ZONAS_DEPORTIVAS_GEOJSON_URL = '/data/zonas_deportiva.geojson';
export const PARQUES_ABURRA_FALLBACK_URL = '/data/parques_aburra.geojson';

/**
 * Las 6 zonas deportivas principales del Valle de Aburrá.
 * - `id`: identificador interno de la zona.
 * - `nombre`: etiqueta mostrada en el mapa.
 * - `osmIds`: lista de IDs de OpenStreetMap (`relation/...` o `way/...`).
 */
export const ZONAS_DEPORTIVAS = [
  {
    id: 'atanasio-girardot',
    nombre: 'Unidad Deportiva Atanasio Girardot',
    osmIds: ['relation/7680489'],
  },
  {
    id: 'belen',
    nombre: 'Unidad Deportiva de Belén',
    osmIds: ['way/151946379'],
  },
  {
    id: 'polideportivo-itagui',
    nombre: 'Polideportivo Itagüí',
    osmIds: ['way/129724124'],
  },
  {
    id: 'ditaires',
    nombre: 'Complejo Deportivo Ditaires',
    osmIds: ['way/553803506'],
  },
  {
    id: 'indesa-zona-norte',
    nombre: 'Unidad Deportiva Zona Norte, INDESA',
    osmIds: ['way/133915317'],
  },
  {
    id: 'indesa-zona-sur',
    nombre: 'Unidad Deportiva Zona Sur, INDESA',
    osmIds: ['way/355655581'],
  },
  {
    id: 'polideportivo-sur-envigado',
    nombre: 'Polideportivo Sur de Envigado',
    osmIds: ['way/343743385'],
  },
  {
    id: 'la-tablaza',
    nombre: 'Unidad Deportiva La Tablaza',
    osmIds: [],
  },
];
