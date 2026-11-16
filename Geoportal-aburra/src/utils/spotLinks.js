/**
 * Valida una URL externa aceptando únicamente esquemas http: o https:.
 */
export function sanitizeExternalUrl(rawUrl) {
  if (rawUrl === null || rawUrl === undefined) return null;

  const trimmed = String(rawUrl).trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Normaliza un handle o ruta de Instagram hacia una URL https:// segura.
 */
export function normalizeInstagramUrl(rawValue) {
  if (rawValue === null || rawValue === undefined) return null;

  const trimmed = String(rawValue).trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('@')) {
    const handle = trimmed.slice(1).trim();
    if (!handle || /\s/.test(handle) || handle.includes(':')) {
      return null;
    }
    return sanitizeExternalUrl(`https://www.instagram.com/${handle}`);
  }

  if (/^(www\.)?instagram\.com\//i.test(trimmed)) {
    return sanitizeExternalUrl(`https://${trimmed}`);
  }

  return sanitizeExternalUrl(trimmed);
}

/**
 * Resuelve y sanitiza los enlaces disponibles de un lugar priorizando Supabase sobre OSM.
 */
export function resolveSpotLinks({ osmLinks = null, dbRecord = null } = {}) {
  const dbWebsite = sanitizeExternalUrl(dbRecord?.website_url ?? null);
  const osmWebsite = sanitizeExternalUrl(osmLinks?.websiteUrl ?? osmLinks?.website ?? null);
  const websiteUrl = dbWebsite || osmWebsite || null;

  const dbInstagram = normalizeInstagramUrl(dbRecord?.instagram_url ?? null);
  const osmInstagram = normalizeInstagramUrl(osmLinks?.instagramUrl ?? osmLinks?.instagram ?? null);
  const instagramUrl = dbInstagram || osmInstagram || null;

  const hasLinks = Boolean(websiteUrl || instagramUrl);
  let fuente = null;
  if (hasLinks) {
    fuente = (dbWebsite || dbInstagram) ? (dbRecord?.fuente || 'comunidad') : 'osm';
  }

  return {
    websiteUrl,
    instagramUrl,
    fuente,
    hasLinks,
  };
}
