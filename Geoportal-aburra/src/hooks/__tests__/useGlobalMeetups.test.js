import { describe, expect, it, vi } from 'vitest';

vi.mock('../../services/eventosService', () => ({
  listarEventosProximos: vi.fn(),
  listarInscripcionesUsuario: vi.fn(),
}));

import {
  loadGlobalMeetupsData,
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
});
