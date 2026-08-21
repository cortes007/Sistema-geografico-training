import proj4 from 'proj4';
import { register } from 'ol/proj/proj4';

export const registerProjections = () => {
  // EPSG:3116 - MAGNA-SIRGAS / Colombia Bogota zone (Histórico/Antioquia)
  proj4.defs(
    'EPSG:3116',
    '+proj=tmerc +lat_0=4.596200416666666 +lon_0=-74.07750791666666 +k=1 +x_0=1000000 +y_0=1000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs'
  );

  // EPSG:9377 - MAGNA-SIRGAS / Origen Nacional (Nuevo estándar oficial)
  proj4.defs(
    'EPSG:9377',
    '+proj=tmerc +lat_0=4 +lon_0=-73 +k=0.9992 +x_0=5000000 +y_0=2000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs'
  );

  // EPSG:4326 (WGS 84) y EPSG:3857 (Web Mercator) ya vienen por defecto en proj4 y OpenLayers, 
  // pero las registramos explícitamente por consistencia
  proj4.defs('EPSG:4326', '+proj=longlat +datum=WGS84 +no_defs');
  proj4.defs('EPSG:3857', '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext +no_defs');

  // Registrar las definiciones de proj4 en OpenLayers
  register(proj4);
};

export const CRS_OPTIONS = [
  { value: 'EPSG:4326', label: 'WGS 84 (Grados Decimales)' },
  { value: 'EPSG:3857', label: 'Web Mercator' },
  { value: 'EPSG:3116', label: 'MAGNA-SIRGAS Bogotá (EPSG:3116)' },
  { value: 'EPSG:9377', label: 'Origen Nacional (EPSG:9377)' },
];
