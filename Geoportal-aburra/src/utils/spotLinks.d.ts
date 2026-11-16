export type SpotLinkSource = 'osm' | 'oficial' | 'comunidad';

export interface ResolvedSpotLinks {
  websiteUrl: string | null;
  instagramUrl: string | null;
  fuente: SpotLinkSource | null;
  hasLinks: boolean;
}

export function sanitizeExternalUrl(rawUrl: string | null | undefined): string | null;
export function normalizeInstagramUrl(rawValue: string | null | undefined): string | null;
export function resolveSpotLinks(params?: {
  osmLinks?: {
    websiteUrl?: string | null;
    website?: string | null;
    instagramUrl?: string | null;
    instagram?: string | null;
  } | null;
  dbRecord?: {
    website_url?: string | null;
    instagram_url?: string | null;
    fuente?: SpotLinkSource | null;
  } | null;
}): ResolvedSpotLinks;
