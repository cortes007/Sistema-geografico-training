/**
 * Definiciones de proj4 para los sistemas de referencia espacial
 * usados en el geoportal. EPSG:4326 y EPSG:3857 ya vienen registrados
 * por defecto en OpenLayers/proj4, aquí solo se agregan los que faltan.
 */

export const CRS_DEFS = {
  'EPSG:32618':
    '+proj=utm +zone=18 +datum=WGS84 +units=m +no_defs +type=crs',

  // MAGNA-SIRGAS / Origen-Nacional (sistema plano nacional de Colombia)
  'EPSG:9377':
    '+proj=tmerc +lat_0=4 +lon_0=-73 +k=0.9992 +x_0=5000000 +y_0=2000000 ' +
    '+ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',

  // MAGNA-SIRGAS / Colombia Bogota zone
  'EPSG:3116':
    '+proj=tmerc +lat_0=4.596200416666666 +lon_0=-74.07750791666666 +k=1 ' +
    '+x_0=1000000 +y_0=1000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 ' +
    '+units=m +no_defs +type=crs',
};

/**
 * Metadatos usados por la UI (nombre visible, tipo de unidad, etc).
 */
export const CRS_OPTIONS = [
  { code: 'EPSG:4326', label: 'WGS 84 (geográficas)', unit: 'grados' },
  { code: 'EPSG:32618', label: 'UTM zona 18N (WGS84)', unit: 'metros' },
  { code: 'EPSG:9377', label: 'MAGNA-SIRGAS / Origen-Nacional', unit: 'metros' },
  { code: 'EPSG:3116', label: 'MAGNA-SIRGAS / Bogotá', unit: 'metros' },
];

export function getCrsLabel(code) {
  const found = CRS_OPTIONS.find((c) => c.code === code);
  return found ? found.label : code;
}
