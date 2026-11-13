import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SPOT_FILTERS,
  hasActiveSmartFilters,
  matchesSpotFilters,
  normalizeSearchText,
} from './spotFilters';

const baseSpot = {
  trainingSpotId: 'spot-1',
  name: 'Parque Calistenia Envigado',
  city: 'Envigado',
  equipmentType: 'gimnasio al aire libre',
  openingHours: '',
};

const closedGymSpot = {
  trainingSpotId: 'spot-2',
  name: 'Gimnasio Atlético Medellín',
  city: 'Medellín',
  equipmentType: 'gimnasio',
  openingHours: 'Mo-Fr 06:00-21:00',
};

const filterIndex = {
  ratingsBySpot: new Map([
    ['spot-1', { averageRating: 4.6, ratingCount: 12 }],
    ['spot-2', { averageRating: 3.4, ratingCount: 3 }],
  ]),
  upcomingSpotIds: new Set(['spot-1']),
};

describe('spotFilters', () => {
  it('normalizes search text by stripping accents and collapsing whitespace', () => {
    expect(normalizeSearchText('  Medellín  Norte ')).toBe('medellin norte');
    expect(normalizeSearchText('ITAGÜÍ')).toBe('itagui');
  });

  it('matches query text across name or municipality ignoring accents', () => {
    expect(
      matchesSpotFilters(closedGymSpot, { ...DEFAULT_SPOT_FILTERS, query: 'medellin' }, filterIndex)
    ).toBe(true);
    expect(
      matchesSpotFilters(closedGymSpot, { ...DEFAULT_SPOT_FILTERS, query: 'atletico' }, filterIndex)
    ).toBe(true);
    expect(
      matchesSpotFilters(closedGymSpot, { ...DEFAULT_SPOT_FILTERS, query: 'sabaneta' }, filterIndex)
    ).toBe(false);
  });

  it('filters by exact normalized municipality, minimum rating, upcoming meetups, and open now', () => {
    const fridayMorning = new Date(2026, 10, 13, 10, 0);
    const filters = {
      ...DEFAULT_SPOT_FILTERS,
      municipality: 'Envigado',
      minRating: 4,
      onlyWithMeetups: true,
      onlyOpenNow: true,
    };

    expect(matchesSpotFilters(baseSpot, filters, filterIndex, { now: fridayMorning })).toBe(true);
    expect(matchesSpotFilters(closedGymSpot, filters, filterIndex, { now: fridayMorning })).toBe(false);
  });

  it('respects activeEquipmentTypes alongside smart filters', () => {
    const activeTypes = {
      gimnasio: false,
      'gimnasio al aire libre': true,
      'centro deportivo': true,
    };

    expect(
      matchesSpotFilters(closedGymSpot, DEFAULT_SPOT_FILTERS, filterIndex, {
        activeEquipmentTypes: activeTypes,
      })
    ).toBe(false);
  });

  it('detects whether any smart filter is active', () => {
    expect(hasActiveSmartFilters(DEFAULT_SPOT_FILTERS)).toBe(false);
    expect(hasActiveSmartFilters({ ...DEFAULT_SPOT_FILTERS, minRating: 4 })).toBe(true);
    expect(hasActiveSmartFilters({ ...DEFAULT_SPOT_FILTERS, onlyOpenNow: true })).toBe(true);
  });
});
