import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SPOT_FILTERS,
  hasActiveSmartFilters,
  matchesSpotFilters,
  normalizeSearchText,
  resolveSpotMunicipality,
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

  it('resuelve el municipio por variantes de city, nombre o coordenadas WGS84 cuando city viene vacío en OSM', () => {
    expect(resolveSpotMunicipality({ city: 'Sabaneta Antioquia' })).toBe('Sabaneta');
    expect(resolveSpotMunicipality({ city: 'El Poblado' })).toBe('Medellín');
    expect(
      resolveSpotMunicipality({
        city: '',
        name: 'El templo del Fútbol',
        longitude: -75.586119,
        latitude: 6.182795,
      })
    ).toBe('Envigado');
    expect(
      resolveSpotMunicipality({
        city: '',
        name: 'Placa deportiva Sector Miranda',
        longitude: -75.613429,
        latitude: 6.176779,
      })
    ).toBe('Itagüí');

    const spotWithoutCityInEnvigado = {
      trainingSpotId: 'spot-envigado-coords',
      name: 'Señor Gol',
      city: '',
      longitude: -75.587052,
      latitude: 6.181654,
      equipmentType: 'centro deportivo',
      openingHours: '24/7',
    };
    expect(
      matchesSpotFilters(spotWithoutCityInEnvigado, {
        ...DEFAULT_SPOT_FILTERS,
        municipality: 'Envigado',
      })
    ).toBe(true);
  });
});
