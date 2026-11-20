import { describe, expect, it, vi } from 'vitest';

vi.mock('../../services/eventosService', () => ({
  actualizarEvento: vi.fn(),
  cancelarAsistencia: vi.fn(),
  confirmarAsistencia: vi.fn(),
  crearEvento: vi.fn(),
  eliminarEvento: vi.fn(),
  listarEventosProximos: vi.fn(),
  listarInscripcionesUsuario: vi.fn(),
}));

vi.mock('../../services/trainingSpotsService', () => ({
  listarTrainingSpots: vi.fn().mockResolvedValue([]),
}));

import {
  filterMeetupsByActivity,
  loadGlobalMeetupsData,
  resolveMeetupGoogleMapsUrl,
  resolveMeetupRouteOverlay,
  resolveMeetupTargetPlace,
  sortMeetupsChronologically,
} from '../useGlobalMeetups';

describe('useGlobalMeetups helpers', () => {
  const geoJsonEvent = {
    id: 'evt-2',
    trainingSpotId: 'spot-envigado',
    organizadorId: 'user-1',
    titulo: 'Entreno de barras vespertino',
    descripcion: 'Rutina básica',
    fechaHoraInicio: '2026-11-15T18:00:00.000Z',
    fechaHoraFin: null,
    fechaCreacion: '2026-11-13T10:00:00.000Z',
    lugarNombre: 'Parque Polideportivo Sur',
    lugarDescripcion: 'Zona de calistenia',
    lugarTipo: 'fitness_station',
    ciudad: 'Envigado',
    geom: { type: 'Point', coordinates: [-75.5912345, 6.1684321] },
    asistentesConfirmados: 7,
  };

  const wkbEvent = {
    id: 'evt-1',
    trainingSpotId: 'spot-medellin',
    organizadorId: 'user-2',
    titulo: 'Calistenia madrugadora',
    descripcion: null,
    fechaHoraInicio: '2026-11-14T06:30:00.000Z',
    fechaHoraFin: null,
    fechaCreacion: '2026-11-13T09:00:00.000Z',
    lugarNombre: 'Ciudad del Río',
    lugarDescripcion: null,
    lugarTipo: 'fitness_station',
    ciudad: 'Medellín',
    // 0x4018E50000000000 in IEEE-754 little-endian equals 6.2236328125 (~6.223633)
    geom: '0101000020E6100000CDCCCCCCCCE452C00000000000E51840',
    asistentesConfirmados: 4,
  };

  it('sorts meetups chronologically ascending by start date', () => {
    const sorted = sortMeetupsChronologically([geoJsonEvent, wkbEvent]);
    expect(sorted.map((item) => item.id)).toEqual(['evt-1', 'evt-2']);
  });

  it('loads global upcoming events chronologically and skips batch registrations when signed out', async () => {
    const fetchEvents = vi.fn().mockResolvedValue([geoJsonEvent, wkbEvent]);
    const fetchRegistrations = vi.fn();

    const result = await loadGlobalMeetupsData({
      user: null,
      fetchEvents,
      fetchRegistrations,
    });

    expect(fetchEvents).toHaveBeenCalledTimes(1);
    expect(fetchRegistrations).not.toHaveBeenCalled();
    expect(result.events.map((item) => item.id)).toEqual(['evt-1', 'evt-2']);
    expect(result.registeredIds.size).toBe(0);
  });

  it('fetches batch user registrations when an authenticated user is present', async () => {
    const fetchEvents = vi.fn().mockResolvedValue([geoJsonEvent, wkbEvent]);
    const fetchRegistrations = vi.fn().mockResolvedValue(['evt-2']);

    const result = await loadGlobalMeetupsData({
      user: { id: 'user-99' },
      fetchEvents,
      fetchRegistrations,
    });

    expect(fetchRegistrations).toHaveBeenCalledWith(['evt-1', 'evt-2']);
    expect(result.registeredIds.has('evt-2')).toBe(true);
    expect(result.registeredIds.has('evt-1')).toBe(false);
  });

  it('resolves destination place from GeoJSON or EWKB event.geom in EPSG:4326 and handles invalid geom safely', () => {
    const fromGeoJson = resolveMeetupTargetPlace(geoJsonEvent);
    expect(fromGeoJson).toEqual({
      id: 'spot-envigado',
      trainingSpotId: 'spot-envigado',
      name: 'Parque Polideportivo Sur',
      type: 'fitness_station',
      equipmentType: 'gimnasio al aire libre',
      description: 'Zona de calistenia',
      city: 'Envigado',
      coordinates: [-75.591234, 6.168432],
      longitude: -75.591234,
      latitude: 6.168432,
      openingHours: '',
    });

    const fromEwkb = resolveMeetupTargetPlace(wkbEvent);
    expect(fromEwkb?.trainingSpotId).toBe('spot-medellin');
    expect(fromEwkb?.longitude).toBeCloseTo(-75.575, 5);
    expect(fromEwkb?.latitude).toBeCloseTo(6.223633, 5);

    expect(resolveMeetupTargetPlace({ ...geoJsonEvent, geom: null })).toBeNull();
  });

  const cyclingMeetup = {
    id: 'evt-bike-1',
    trainingSpotId: null,
    organizadorId: 'user-3',
    titulo: 'Rodada Valle de Aburrá',
    descripcion: 'Por la ciclorruta de la 70',
    fechaHoraInicio: '2026-11-20T19:00:00.000Z',
    fechaHoraFin: null,
    fechaCreacion: '2026-11-16T12:00:00.000Z',
    lugarNombre: 'Estadio',
    lugarDescripcion: null,
    lugarTipo: 'ciclismo',
    ciudad: null,
    geom: { type: 'Point', coordinates: [-75.5901, 6.2568] },
    asistentesConfirmados: 3,
    tipoActividad: 'ciclismo',
    perfilRuta: 'bike',
    origenNombre: 'Estadio',
    destinoNombre: 'Ciudad del Río',
    origenGeom: { type: 'Point', coordinates: [-75.5901, 6.2568] },
    destinoGeom: { type: 'Point', coordinates: [-75.5745, 6.2248] },
    rutaGeom: {
      type: 'LineString',
      coordinates: [
        [-75.5901, 6.2568],
        [-75.581, 6.24],
        [-75.5745, 6.2248],
      ],
    },
    distanciaMetros: 4300,
    duracionSegundos: 780,
  };

  it('filters meetups by activity type including all, entrenamiento, running, and ciclismo', () => {
    const runningMeetup = { ...cyclingMeetup, id: 'evt-run-1', tipoActividad: 'running', perfilRuta: 'foot' };
    const list = [geoJsonEvent, cyclingMeetup, runningMeetup];

    expect(filterMeetupsByActivity(list, 'todas')).toHaveLength(3);
    expect(filterMeetupsByActivity(list, 'entrenamiento').map((e) => e.id)).toEqual(['evt-2']);
    expect(filterMeetupsByActivity(list, 'ciclismo').map((e) => e.id)).toEqual(['evt-bike-1']);
    expect(filterMeetupsByActivity(list, 'running').map((e) => e.id)).toEqual(['evt-run-1']);
  });

  it('resolves route overlay state and Google Maps deep link for running/cycling meetups', () => {
    const overlay = resolveMeetupRouteOverlay(cyclingMeetup);
    expect(overlay).toEqual({
      meetupId: 'evt-bike-1',
      profile: 'bike',
      label: 'Ciclismo',
      coordinates: [
        [-75.5901, 6.2568],
        [-75.581, 6.24],
        [-75.5745, 6.2248],
      ],
      distanceMeters: 4300,
      durationSeconds: 780,
      steps: [],
      showEndpoints: true,
      originCoordinates: [-75.5901, 6.2568],
      destinationCoordinates: [-75.5745, 6.2248],
    });

    const mapsUrl = resolveMeetupGoogleMapsUrl(cyclingMeetup);
    const parsed = new URL(mapsUrl);
    expect(parsed.searchParams.get('api')).toBe('1');
    expect(parsed.searchParams.get('origin')).toBe('6.256800,-75.590100');
    expect(parsed.searchParams.get('destination')).toBe('6.224800,-75.574500');
    expect(parsed.searchParams.get('travelmode')).toBe('bicycling');
  });
});
