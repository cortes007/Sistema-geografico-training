export function parseSpotGeometryToLonLat(
  rawGeom: unknown,
): { longitude: number; latitude: number } | null;

export function parseLineGeometryToLonLat(
  rawGeom: unknown,
): Array<[number, number]> | null;
