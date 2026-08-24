import proj4 from 'proj4';

function transformCoords(coords, transformer) {
  if (typeof coords[0] === 'number') {
    return transformer.forward(coords);
  }
  return coords.map((c) => transformCoords(c, transformer));
}

/**
 * Reproyecta un GeoJSON (Feature o FeatureCollection) de un CRS a otro.
 * No muta el original. Ambos códigos deben estar previamente registrados
 * en proj4 (ver registerProjections / prjParser).
 */
export function reprojectGeoJSON(geojson, fromCode, toCode) {
  if (fromCode === toCode) return geojson;

  const transformer = proj4(fromCode, toCode);
  const cloned = JSON.parse(JSON.stringify(geojson));
  const features = cloned.type === 'FeatureCollection' ? cloned.features : [cloned];

  features.forEach((feature) => {
    if (feature.geometry?.coordinates) {
      feature.geometry.coordinates = transformCoords(feature.geometry.coordinates, transformer);
    }
  });

  // Se documenta el nuevo CRS en el propio archivo exportado
  cloned.crs = { type: 'name', properties: { name: `urn:ogc:def:crs:${toCode.replace(':', '::')}` } };

  return cloned;
}

/** Dispara la descarga de un objeto GeoJSON como archivo .geojson */
export function downloadGeoJSON(geojson, filename) {
  const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/geo+json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.geojson') ? filename : `${filename}.geojson`;
  a.click();
  URL.revokeObjectURL(url);
}
