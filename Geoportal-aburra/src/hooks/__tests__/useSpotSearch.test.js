import { describe, expect, it, vi } from 'vitest';

vi.mock('../../services/trainingSpotsService', () => ({
  listarTrainingSpots: vi.fn(),
}));
vi.mock('../../services/nearbyPlacesService', () => ({
  listarCalificacionesAgregadasLugares: vi.fn(),
}));
vi.mock('../../services/eventosService', () => ({
  listarEventosProximos: vi.fn(),
}));

import {
  buildSelectedPlaceFromSpot,
  buildSpotFilterIndex,
  filterAndSortCatalogSpots,
} from '../useSpotSearch';

describe('useSpotSearch pure helpers', () => {
  const spots = [
    {
      trainingSpotId: 'spot-1',
      name: 'Parque Calistenia Ciudad del Río',
      type: 'fitness_station',
      equipmentType: 'gimnasio al aire libre',
      description: 'Barras y paralelas',
      city: 'Medellín',
      longitude: -75.575,
      latitude: 6.224,
      openingHours: '',
    },
    {
      trainingSpotId: 'spot-2',
      name: 'Gimnasio Élite Sur',
      type: 'fitness_centre',
      equipmentType: 'gimnasio',
      description: 'Pesas',
      city: 'Envigado',
      longitude: -75.59,
      latitude: 6.17,
      openingHours: 'Mo-Su 06:00-22:00',
    },
    {
      trainingSpotId: 'spot-3',
      name: 'Centro Deportivo Sin Horario',
      type: 'sports_centre',
      equipmentType: 'centro deportivo',
      description: '',
      city: 'Medellín',
      longitude: -75.58,
      latitude: 6.25,
      openingHours: '',
    },
  ];

  const ratingAggregates = [
    { trainingSpotId: 'spot-1', averageRating: 4.5, ratingCount: 12, rankingRating: 4.4 },
    { trainingSpotId: 'spot-2', averageRating: 4.9, ratingCount: 25, rankingRating: 4.8 },
    { trainingSpotId: 'spot-3', averageRating: 3.2, ratingCount: 3, rankingRating: 3.1 },
  ];

  const upcomingEvents = [
    { id: 'evt-1', trainingSpotId: 'spot-1' },
    { id: 'evt-2', trainingSpotId: 'spot-3' },
  ];

  const activeEquipmentTypes = {
    gimnasio: true,
    'gimnasio al aire libre': true,
    'centro deportivo': true,
  };

  it('builds a unified spotFilterIndex from spots, rating aggregates, and upcoming events', () => {
    const index = buildSpotFilterIndex({ spots, ratingAggregates, upcomingEvents });

    expect(index.ratingsBySpot.get('spot-2')?.averageRating).toBe(4.9);
    expect(index.upcomingSpotIds.has('spot-1')).toBe(true);
    expect(index.upcomingSpotIds.has('spot-2')).toBe(false);
    expect(index.spotsById.get('spot-1')?.city).toBe('Medellín');
  });

  it('returns an empty list when no search query or smart filters are active', () => {
    const index = buildSpotFilterIndex({ spots, ratingAggregates, upcomingEvents });
    const results = filterAndSortCatalogSpots({
      spots,
      spotFilters: {
        query: '',
        municipality: '',
        minRating: 0,
        onlyWithMeetups: false,
        onlyOpenNow: false,
      },
      spotFilterIndex: index,
      activeEquipmentTypes,
    });

    expect(results).toEqual([]);
  });

  it('filters across Valle de Aburrá by normalized query, municipality, rating, meetups, open-now (24/7 outdoor parks), and active equipment types', () => {
    const index = buildSpotFilterIndex({ spots, ratingAggregates, upcomingEvents });
    const midday = new Date(2026, 10, 13, 12, 0, 0);

    // Search ignoring accents and case ("ciudad del rio")
    const byQuery = filterAndSortCatalogSpots({
      spots,
      spotFilters: {
        query: 'ciudad del rio',
        municipality: '',
        minRating: 0,
        onlyWithMeetups: false,
        onlyOpenNow: false,
      },
      spotFilterIndex: index,
      activeEquipmentTypes,
      now: midday,
    });
    expect(byQuery.map((item) => item.trainingSpotId)).toEqual(['spot-1']);

    // Conjunction: municipality Medellín + open now -> spot-1 (outdoor park 24/7) passes, spot-3 (indoor without hours) excluded
    const openInMedellin = filterAndSortCatalogSpots({
      spots,
      spotFilters: {
        query: '',
        municipality: 'Medellín',
        minRating: 0,
        onlyWithMeetups: false,
        onlyOpenNow: true,
      },
      spotFilterIndex: index,
      activeEquipmentTypes,
      now: midday,
    });
    expect(openInMedellin.map((item) => item.trainingSpotId)).toEqual(['spot-1']);

    // Respect activeEquipmentTypes: disabling 'gimnasio' hides spot-2 even if minRating=4.0 matches
    const ratedSpots = filterAndSortCatalogSpots({
      spots,
      spotFilters: {
        query: '',
        municipality: '',
        minRating: 4.0,
        onlyWithMeetups: false,
        onlyOpenNow: false,
      },
      spotFilterIndex: index,
      activeEquipmentTypes: { ...activeEquipmentTypes, gimnasio: false },
      now: midday,
    });
    expect(ratedSpots.map((item) => item.trainingSpotId)).toEqual(['spot-1']);
  });

  it('sorts matching spots by ranking rating descending and maps selected place payload', () => {
    const index = buildSpotFilterIndex({ spots, ratingAggregates, upcomingEvents });
    const rated = filterAndSortCatalogSpots({
      spots,
      spotFilters: {
        query: '',
        municipality: '',
        minRating: 3.0,
        onlyWithMeetups: false,
        onlyOpenNow: false,
      },
      spotFilterIndex: index,
      activeEquipmentTypes,
    });

    expect(rated.map((item) => item.trainingSpotId)).toEqual(['spot-2', 'spot-1', 'spot-3']);
    expect(buildSelectedPlaceFromSpot(spots[0])).toEqual({
      id: 'spot-1',
      trainingSpotId: 'spot-1',
      name: 'Parque Calistenia Ciudad del Río',
      type: 'fitness_station',
      description: 'Barras y paralelas',
      city: 'Medellín',
      coordinates: [-75.575, 6.224],
      longitude: -75.575,
      latitude: 6.224,
      openingHours: '',
    });
  });
});
