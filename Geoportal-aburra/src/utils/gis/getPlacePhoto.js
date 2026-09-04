import { toLonLat } from 'ol/proj';

const photoCache = new Map(); // featureId -> resultado (o null)
const photoRequests = new Map(); // featureId -> promesa en curso
const EXTERNAL_REQUEST_TIMEOUT_MS = 3500;
const MAPILLARY_TIMEOUT_MS = 3500;

export async function getPlacePhoto(feature) {
  const props = feature.getProperties();
  const id = feature.getId() ?? props.id ?? feature;
  if (photoCache.has(id)) return photoCache.get(id);
  if (photoRequests.has(id)) return photoRequests.get(id);

  const request = (async () => {
    let result = null;

    // 1. Wikimedia Commons / URL directa explícita en OSM.
    if (props.wikimedia_commons) {
      result = await fetchCommonsFileInfo(props.wikimedia_commons, { exact: true });
    } else if (typeof props.image === 'string' && props.image.startsWith('http')) {
      result = { url: props.image, thumbUrl: props.image, credit: null, license: null, exact: true };
    }

    // 2. Wikidata explícito.
    if (!result && props.wikidata) {
      result = await searchWikidataPhoto(props.wikidata);
    }

    // 3. Mapillary estricto: solo acepta imágenes verdaderamente cercanas.
    if (!result) {
      const lat = Number(props.latitud ?? props.lat ?? props.latitude);
      const lon = Number(props.longitud ?? props.lon ?? props.longitude);

      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        result = await getMapillaryPhoto(lat, lon);
      } else {
        const geometry = feature.getGeometry();
        if (geometry && geometry.getType() === 'Point') {
          const [lonFromGeometry, latFromGeometry] = feature.__lonLat || toLonLat(geometry.getCoordinates());
          result = await getMapillaryPhoto(latFromGeometry, lonFromGeometry);
        }
      }
    }

    // 4. Placeholder temático si todas las opciones fallan.
    if (!result) {
      result = getSmartPlaceholder(props);
    }

    photoCache.set(id, result);
    return result;
  })();

  photoRequests.set(id, request);
  try {
    return await request;
  } finally {
    photoRequests.delete(id);
  }
}

async function fetchJsonWithTimeout(url, timeoutMs = EXTERNAL_REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    if (error.name !== 'AbortError') console.error('Error cargando foto:', error);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function searchWikidataPhoto(identifier) {
  const entityId = String(identifier).replace(/^https?:\/\/www\.wikidata\.org\/entity\//, '');
  if (!/^Q\d+$/i.test(entityId)) return null;

  const url =
    `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${entityId}` +
    '&props=claims&format=json&origin=*';
  const response = await fetchJsonWithTimeout(url);
  const imageTitle = response?.entities?.[entityId]?.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
  if (!imageTitle) return null;

  return fetchCommonsFileInfo(`File:${imageTitle}`, { exact: true });
}

async function fetchCommonsFileInfo(title, { exact }) {
  const infoUrl =
    `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}` +
    `&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=400&format=json&origin=*`;

  const res = await fetchJsonWithTimeout(infoUrl);
  const pages = res?.query?.pages;
  const page = pages ? Object.values(pages)[0] : null;
  const info = page?.imageinfo?.[0];
  if (!info) return null;

  return {
    url: info.url,
    thumbUrl: info.thumburl || info.url,
    credit: stripHtml(info.extmetadata?.Artist?.value) || 'Wikimedia Commons',
    license: info.extmetadata?.LicenseShortName?.value || null,
    exact, // true = foto vinculada directo al lugar, false = "cercana"
  };
}

function stripHtml(html) {
  if (!html) return null;
  return html.replace(/<[^>]*>/g, '').trim();
}

async function getMapillaryPhoto(lat, lon) {
  const CLIENT_TOKEN = import.meta.env.VITE_MAPILLARY_CLIENT_TOKEN;
  if (!CLIENT_TOKEN) return null;

  const delta = 0.0005;
  const bbox = `${lon - delta},${lat - delta},${lon + delta},${lat + delta}`;
  const url =
    `https://graph.mapillary.com/images?fields=id,thumb_1024_url,geometry&bbox=${bbox}` +
    `&limit=5&access_token=${CLIENT_TOKEN}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), MAPILLARY_TIMEOUT_MS);
    let response;
    try {
      response = await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }
    if (!response.ok) return null;

    const data = await response.json();
    if (!Array.isArray(data?.data) || data.data.length === 0) return null;

    let closestImage = null;
    let minDistance = Infinity;

    for (const image of data.data) {
      const coordinates = image.geometry?.coordinates;
      if (!Array.isArray(coordinates) || coordinates.length < 2) continue;

      const [imageLon, imageLat] = coordinates;
      const distance = Math.hypot(imageLat - lat, imageLon - lon);
      if (distance < 0.0005 && distance < minDistance) {
        minDistance = distance;
        closestImage = image;
      }
    }

    if (!closestImage?.thumb_1024_url) return null;

    const thumbUrl = new URL(closestImage.thumb_1024_url);
    thumbUrl.searchParams.set('access_token', CLIENT_TOKEN);

    return {
      url: thumbUrl.toString(),
      thumbUrl: thumbUrl.toString(),
      credit: 'Mapillary',
      license: 'CC BY-SA',
      exact: false,
    };
  } catch (error) {
    if (error.name === 'AbortError') return null;
    console.error('Error cargando imagen de Mapillary:', error);
    return null;
  }
}

function getSmartPlaceholder(props) {
  const tipo = String(props.sport || props.leisure || props.amenity || '').toLowerCase();
  let categoria = 'deporte_default';

  if (
    tipo.includes('fitness') ||
    tipo.includes('calisthenics') ||
    tipo.includes('gym') ||
    tipo.includes('gimnasio')
  ) {
    categoria = 'gimnasio_aire_libre';
  } else if (
    tipo.includes('soccer') ||
    tipo.includes('football') ||
    tipo.includes('cancha') ||
    tipo.includes('pitch')
  ) {
    categoria = 'cancha_futbol';
  } else if (tipo.includes('park') || tipo.includes('parque') || tipo.includes('recreation')) {
    categoria = 'parque_urbano';
  } else if (tipo.includes('basketball') || tipo.includes('tenis') || tipo.includes('court')) {
    categoria = 'cancha_multiple';
  }

  const url = `/assets/placeholders/${categoria}.svg`;

  return {
    url,
    thumbUrl: url,
    credit: 'Geoportal Deportivo Aburrá',
    license: 'Registro Institucional',
    exact: false,
    isPlaceholder: true,
  };
}