import parseWKT from 'wkt-parser';
import { CRS_DEFS } from '../../config/crsDefinitions';

/**
 * Recibe el texto de un archivo .prj (WKT de ESRI) y devuelve un CRS
 * compatible con la app. Siempre prioriza EPSG conocido porque los CRS
 * oficiales de Colombia ya están registrados en CRS_DEFS.
 *
 * Envía: { code, name, epsg, wkt }
 *   - code: código de CRS válido para OpenLayers/proj4 (EPSG:3116, EPSG:9377, ...)
 *   - name: nombre humano detectado en el WKT
 *   - epsg: número EPSG cuando puede extraerse
 */
export function parsePrj(prjText) {
  if (!prjText || typeof prjText !== 'string') {
   return { code: 'EPSG:4326', name: 'WGS 84 (CRS no disponible)', epsg: null, wkt: '' };
  }

  const nameMatch = prjText.match(/(GEOGCS|PROJCS)\["([^"]+)"/);
  const name = nameMatch ? nameMatch[2].replace(/_/g, ' ') : 'CRS desconocido';

  const epsgMatch = prjText.match(/AUTHORITY\["EPSG","?(\d+)"?\]\]\s*$/) ||
   prjText.match(/EPSG[",:]+(\d+)/);
  const epsg = epsgMatch ? epsgMatch[1] : null;

  if (epsg) {
   const code = `EPSG:${epsg}`;
   if (CRS_DEFS[code]) {
     return { code, name, epsg, wkt: prjText };
   }
  }

  // Fallback seguro para WKT no estándar: si no se reconoce el EPSG,
  // asumimos WGS84 para no romper la carga del archivo.
  try {
   parseWKT(prjText);
  } catch (error) {
   return { code: 'EPSG:4326', name: `${name} (no se pudo interpretar, se asume WGS84)`, epsg: null, wkt: prjText };
  }

  return { code: 'EPSG:4326', name: `${name} (CRS no registrado, se asume WGS84)`, epsg: null, wkt: prjText };
}

/**
 * Interpreta el miembro opcional "crs" de un GeoJSON (obsoleto en el
 * estándar actual, pero común en exportaciones antiguas). Si no existe,
 * se asume EPSG:4326 (comportamiento por defecto del estándar GeoJSON).
 */
export function detectGeojsonCrs(geojson) {
  const name = geojson?.crs?.properties?.name;
  if (!name) return { code: 'EPSG:4326', name: 'WGS 84 (supuesto por estándar GeoJSON)' };

  const epsgMatch = name.match(/EPSG::?(\d+)/i);
  if (epsgMatch) return { code: `EPSG:${epsgMatch[1]}`, name: `EPSG:${epsgMatch[1]}` };

  if (/CRS84/i.test(name)) return { code: 'EPSG:4326', name: 'WGS 84 (CRS84)' };

  return { code: 'EPSG:4326', name: `${name} (no reconocido, se asume WGS84)` };
}
