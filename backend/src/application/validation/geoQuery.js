export function parseGeoQuery(longitud, latitud, radioEnMetros) {
    if (!Number.isFinite(longitud) || longitud < -180 || longitud > 180) {
        throw new Error('longitud debe estar entre -180 y 180 (EPSG:4326).');
    }
    if (!Number.isFinite(latitud) || latitud < -90 || latitud > 90) {
        throw new Error('latitud debe estar entre -90 y 90 (EPSG:4326).');
    }
    if (!Number.isFinite(radioEnMetros) || radioEnMetros <= 0) {
        throw new Error('radioEnMetros debe ser un número mayor que 0.');
    }
    return { longitud, latitud, radioEnMetros };
}
