function normalizeText(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim().replace(/\s+/g, ' ');
}

function getPropertyValue(properties, candidates) {
  for (const key of candidates) {
    const value = properties[key];
    if (value !== null && value !== undefined && normalizeText(value) !== '') {
      return normalizeText(value);
    }
  }

  return '';
}

export function extractPlaceData(feature) {
  const properties = feature?.getProperties?.() ?? {};
  const geometry = feature?.getGeometry?.();
  const coords = geometry?.getCoordinates?.() ?? [null, null];

  const name =
    getPropertyValue(properties, ['name', 'nombre', 'title', 'titulo', 'place_name', 'park_name']) ||
    getPropertyValue(properties, ['tipo', 'type', 'category']) ||
    'Lugar deportivo';

  const type =
    getPropertyValue(properties, ['tipo', 'type', 'category', 'amenity']) ||
    'Lugar deportivo';

  return {
    id: properties.id || `${name}-${coords.join('-')}`,
    name,
    type,
    coordinates: Array.isArray(coords) && coords.length >= 2 ? [coords[0], coords[1]] : [null, null],
    longitude: Array.isArray(coords) && coords.length >= 2 ? coords[0] : null,
    latitude: Array.isArray(coords) && coords.length >= 2 ? coords[1] : null,
  };
}

export function buildPlaceImageSearches(place) {
  const type = normalizeText(place?.type || '').toLowerCase();
  const imageMap = {
    gimnasio: ['gym', 'fitness'],
    'gimnasio al aire libre': ['outdoor fitness', 'calisthenics'],
    'centro deportivo': ['sports center', 'training'],
    'parque de calistenia': ['calisthenics', 'outdoor fitness'],
    deporte: ['fitness', 'sports'],
  };

  const fallback = imageMap[type] || imageMap.deporte || ['fitness'];
  return fallback.slice();
}

export function buildPlaceImageQuery(place) {
  const type = normalizeText(place?.type || '').toLowerCase();
  if (type) return type;

  const name = normalizeText(place?.name || '');
  return name || 'fitness';
}

export function buildFallbackPlaceImage(place) {
  const label = normalizeText(place?.name || place?.type || 'Lugar deportivo');
  const safeLabel = label.length > 42 ? `${label.slice(0, 39)}…` : label;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="900" height="600" viewBox="0 0 900 600">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#dbeafe"/>
          <stop offset="100%" stop-color="#e2e8f0"/>
        </linearGradient>
      </defs>
      <rect width="900" height="600" fill="url(#bg)"/>
      <circle cx="450" cy="230" r="120" fill="#1d4ed8" opacity="0.18"/>
      <path d="M225 390 C 310 310, 400 318, 450 390 S 610 470, 675 390 L 675 438 L 225 438 Z" fill="#2563eb" opacity="0.82"/>
      <path d="M255 355 L 318 305 L 385 350 L 450 285 L 520 355 L 590 314 L 645 355 L 645 438 L 255 438 Z" fill="#1e3a8a" opacity="0.28"/>
      <text x="450" y="170" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="36" font-weight="700" fill="#0f172a">${safeLabel}</text>
      <text x="450" y="520" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="28" fill="#334155">Geoportal Valle de Aburrá</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

async function searchWikimediaCommons(query) {
  try {
    const encoded = encodeURIComponent(query);
    const response = await fetch(
      `https://commons.wikimedia.org/w/api.php?action=query&list=allimages&aisfrom=${encoded}&aisprefix=${encoded}&aislimit=10&format=json&origin=*`,
      { headers: { 'Accept': 'application/json' } }
    );
    if (!response.ok) return null;
    const data = await response.json();
    const images = data?.query?.allimages || [];
    if (images.length > 0) {
      const thumbUrl = images[0]?.url;
      if (thumbUrl) return thumbUrl;
    }
  } catch (error) {
    console.warn('Wikimedia Commons search failed:', error);
  }
  return null;
}

async function searchWikimediaByName(name) {
  const queries = [
    name,
    `${name} gym`,
    `${name} fitness`,
    `${name} sports`,
  ].filter(q => q && normalizeText(q) !== '');

  for (const query of queries) {
    const url = await searchWikimediaCommons(query);
    if (url) return url;
  }
  return null;
}

export async function fetchPlaceImage(place) {
  if (!place) return buildFallbackPlaceImage(place);

  const name = normalizeText(place.name || '');
  if (name) {
    const wikimediaUrl = await searchWikimediaByName(name);
    if (wikimediaUrl) return wikimediaUrl;
  }

  return buildFallbackPlaceImage(place);
}
