import proj4 from 'proj4';
import { register } from 'ol/proj/proj4';
import { CRS_DEFS } from './crsDefinitions';

/**
 * Registra todas las definiciones conocidas en proj4 y sincroniza
 * ese registro con OpenLayers. Debe importarse una sola vez,
 * antes de crear el mapa (ver main.jsx).
 */
export function registerProjections() {
  Object.entries(CRS_DEFS).forEach(([code, def]) => {
    proj4.defs(code, def);
  });
  register(proj4);
}

/**
 * Registra dinámicamente un CRS leído desde un archivo .prj bajo un
 * código temporal (ej: LAYER_CRS_0) y vuelve a sincronizar con OL.
 * Devuelve el código con el que quedó registrado.
 */
export function registerDynamicCrs(code, proj4Def) {
  proj4.defs(code, proj4Def);
  register(proj4);
  return code;
}

registerProjections();
