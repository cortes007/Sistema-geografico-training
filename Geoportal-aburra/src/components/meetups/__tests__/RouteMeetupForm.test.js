import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  resolveInitialRoutePreview,
  validateRouteMeetupDraft,
} from '../../../utils/routeMeetups';
import RouteMeetupForm from '../RouteMeetupForm';

describe('RouteMeetupForm & validation', () => {
  const validDraft = {
    tipoActividad: 'running',
    titulo: 'Trote por el Río',
    descripcion: 'Ritmo conversacional 5 km',
    fechaHoraInicio: new Date(Date.now() + 86_400_000).toISOString().slice(0, 16),
    fechaHoraFin: '',
    origenNombre: 'Parques del Río',
    destinoNombre: 'Ciudad del Río',
    origen: { latitude: 6.242, longitude: -75.578 },
    destino: { latitude: 6.224, longitude: -75.574 },
    routePreview: {
      coordinates: [[-75.578, 6.242], [-75.574, 6.224]],
      distanceMeters: 2100,
      durationSeconds: 900,
      profile: 'foot',
    },
  };

  it('rejects incomplete origin, destination, or missing previewed route', () => {
    expect(validateRouteMeetupDraft({ ...validDraft, titulo: '  ' })).toMatch(/título/i);
    expect(validateRouteMeetupDraft({ ...validDraft, origen: null })).toMatch(/origen/i);
    expect(validateRouteMeetupDraft({ ...validDraft, destino: null })).toMatch(/destino/i);
    expect(validateRouteMeetupDraft({ ...validDraft, routePreview: null })).toMatch(/ruta/i);
    expect(validateRouteMeetupDraft(validDraft)).toBe('');
  });

  it('extracts initial route preview from an existing route meetup event', () => {
    const preview = resolveInitialRoutePreview({
      tipoActividad: 'ciclismo',
      perfilRuta: 'bike',
      rutaGeom: {
        type: 'LineString',
        coordinates: [[-75.59, 6.25], [-75.57, 6.22]],
      },
      distanciaMetros: 3800,
      duracionSegundos: 650,
    });

    expect(preview).toEqual({
      coordinates: [[-75.59, 6.25], [-75.57, 6.22]],
      distanceMeters: 3800,
      durationSeconds: 650,
      profile: 'bike',
    });
    expect(resolveInitialRoutePreview(null)).toBeNull();
  });

  it('renders Running and Ciclismo toggles, map pick controls, and spot catalog selectors', () => {
    const sampleSpots = [
      {
        trainingSpotId: 'spot-1',
        name: 'Parque El Poblado',
        city: 'Medellín',
        latitude: 6.21,
        longitude: -75.57,
      },
    ];
    const html = renderToStaticMarkup(
      createElement(RouteMeetupForm, {
        spots: sampleSpots,
        userLocation: { latitude: 6.24, longitude: -75.58 },
        originPoint: null,
        destinationPoint: null,
        routePickTarget: null,
        onOriginChange: vi.fn(),
        onDestinationChange: vi.fn(),
        onRequestPickPoint: vi.fn(),
        onPreviewRoute: vi.fn(),
        onSubmitMeetup: vi.fn(),
        onSaved: vi.fn(),
        onCancel: vi.fn(),
      })
    );

    expect(html).toContain('Running');
    expect(html).toContain('Ciclismo');
    expect(html).toContain('Elegir origen en el mapa');
    expect(html).toContain('Elegir destino en el mapa');
    expect(html).toContain('Usar mi ubicación');
    expect(html).toContain('Parque El Poblado · Medellín');
    expect(html).toContain('Publicar quedada');
  });
});
