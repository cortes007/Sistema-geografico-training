export interface SpotFiltersState {
  query: string;
  municipality: string;
  minRating: number;
  onlyWithMeetups: boolean;
  onlyOpenNow: boolean;
}

export const DEFAULT_SPOT_FILTERS: SpotFiltersState;

export function normalizeSearchText(value: unknown): string;

export function inferMunicipalityFromLonLat(
  longitude: number | null | undefined,
  latitude: number | null | undefined
): string;

export function resolveSpotMunicipality(spot: {
  city?: string | null;
  name?: string | null;
  description?: string | null;
  longitude?: number | null;
  latitude?: number | null;
} | null | undefined): string;

export function hasActiveSmartFilters(filters?: Partial<SpotFiltersState>): boolean;

export function matchesSpotFilters(
  spot: unknown,
  filters?: Partial<SpotFiltersState>,
  index?: unknown,
  options?: { activeEquipmentTypes?: Record<string, boolean> | null; now?: Date }
): boolean;
