import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const mockUseGlobalMeetups = vi.fn();

vi.mock('../../../hooks/useGlobalMeetups', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useGlobalMeetups: () => mockUseGlobalMeetups(),
  };
});

import GlobalMeetupsPanel from '../GlobalMeetupsPanel';

const runningMeetup = {
  id: 'evt-run-1',
  trainingSpotId: null,
  organizadorId: 'user-1',
  titulo: 'Trote Parques del Río',
  descripcion: 'Ritmo suave 5K',
  fechaHoraInicio: '2026-11-20T06:30:00.000Z',
  fechaHoraFin: null,
  fechaCreacion: '2026-11-16T10:00:00.000Z',
  lugarNombre: 'Parques del Río',
  lugarDescripcion: null,
  lugarTipo: 'running',
  ciudad: null,
  geom: { type: 'Point', coordinates: [-75.578, 6.242] },
  asistentesConfirmados: 2,
  tipoActividad: 'running',
  perfilRuta: 'foot',
  origenNombre: 'Parques del Río',
  destinoNombre: 'Ciudad del Río',
  origenGeom: { type: 'Point', coordinates: [-75.578, 6.242] },
  destinoGeom: { type: 'Point', coordinates: [-75.574, 6.224] },
  rutaGeom: {
    type: 'LineString',
    coordinates: [[-75.578, 6.242], [-75.574, 6.224]],
  },
  distanciaMetros: 2100,
  duracionSegundos: 900,
};

function createHookState(overrides = {}) {
  return {
    user: { id: 'user-1' },
    userLocation: null,
    spots: [],
    events: [runningMeetup],
    registeredIds: new Set(),
    activityFilter: 'todas',
    setActivityFilter: vi.fn(),
    activeRouteMeetupId: null,
    activeRoute: null,
    highlightedStepIndex: null,
    stepsLoadingId: null,
    loading: false,
    error: '',
    actionError: '',
    reload: vi.fn(),
    selectMeetupSpot: vi.fn(),
    loadMeetupSteps: vi.fn(),
    previewDraftRoute: vi.fn(),
    focusMeetupStep: vi.fn(),
    toggleAttendance: vi.fn(),
    deleteMeetup: vi.fn(),
    saveRouteMeetup: vi.fn(),
    prepareEditMeetup: vi.fn(),
    routePickTarget: null,
    draftOriginPoint: null,
    draftDestinationPoint: null,
    requestMapPoint: vi.fn(),
    setDraftOrigin: vi.fn(),
    setDraftDestination: vi.fn(),
    resetDraftPoints: vi.fn(),
    clearRoutePreview: vi.fn(),
    stopViewingRoute: vi.fn(),
    ...overrides,
  };
}

describe('GlobalMeetupsPanel', () => {
  it('always renders the create route button even when 1+ running/cycling meetups exist and removes redundant Ver pasos button', () => {
    mockUseGlobalMeetups.mockReturnValue(createHookState());

    const html = renderToStaticMarkup(
      createElement(GlobalMeetupsPanel, { onRequestAuth: vi.fn() })
    );

    expect(html).toContain('Crear ruta');
    expect(html).toContain('Ver ruta');
    expect(html).not.toContain('Ver pasos');
  });

  it('keeps the create route button visible when signed out so users can authenticate to create one', () => {
    mockUseGlobalMeetups.mockReturnValue(createHookState({ user: null }));

    const html = renderToStaticMarkup(
      createElement(GlobalMeetupsPanel, { onRequestAuth: vi.fn() })
    );

    expect(html).toContain('Crear ruta');
    expect(html).toContain('Ver ruta');
    expect(html).not.toContain('Ver pasos');
  });

  it('shows "Dejar de ver ruta" button on the active route meetup card instead of "Ver ruta"', () => {
    mockUseGlobalMeetups.mockReturnValue(
      createHookState({
        activeRouteMeetupId: runningMeetup.id,
        activeRoute: {
          meetupId: runningMeetup.id,
          profile: 'foot',
          coordinates: runningMeetup.rutaGeom.coordinates,
          distanceMeters: 2100,
          durationSeconds: 900,
          steps: [],
        },
      })
    );

    const html = renderToStaticMarkup(
      createElement(GlobalMeetupsPanel, { onRequestAuth: vi.fn() })
    );

    expect(html).toContain('Dejar de ver ruta');
    expect(html).not.toContain('>Ver ruta<');
  });
});
