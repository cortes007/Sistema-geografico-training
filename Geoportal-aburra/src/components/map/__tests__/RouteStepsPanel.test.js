import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import RouteStepsPanel from '../RouteStepsPanel';

describe('RouteStepsPanel', () => {
  const sampleRoute = {
    profile: 'bike',
    distanceMeters: 2450,
    durationSeconds: 540,
    steps: [
      {
        instruction: 'Inicia el recorrido por Ciclorruta 70',
        distanceMeters: 450,
        durationSeconds: 110,
        location: [-75.59, 6.25],
      },
      {
        instruction: 'Gira a la derecha por Circular 4',
        distanceMeters: 2000,
        durationSeconds: 430,
        location: [-75.58, 6.24],
      },
    ],
  };

  it('renders profile selector (A pie vs Bicicleta) with active state', () => {
    const html = renderToStaticMarkup(
      createElement(RouteStepsPanel, {
        routeProfile: 'bike',
        onSelectProfile: vi.fn(),
        route: null,
      })
    );

    expect(html).toContain('A pie');
    expect(html).toContain('Bicicleta');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('aria-pressed="false"');
  });

  it('renders route summary and collapses step-by-step instructions by default', () => {
    const html = renderToStaticMarkup(
      createElement(RouteStepsPanel, {
        routeProfile: 'bike',
        onSelectProfile: vi.fn(),
        route: sampleRoute,
      })
    );

    expect(html).toContain('Ruta en bicicleta');
    expect(html).toContain('2.5 km');
    expect(html).toContain('9 min aprox.');
    expect(html).toContain('Indicaciones paso a paso (2)');
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('Inicia el recorrido por Ciclorruta 70');
  });

  it('renders step-by-step instructions when expanded', () => {
    const html = renderToStaticMarkup(
      createElement(RouteStepsPanel, {
        routeProfile: 'bike',
        onSelectProfile: vi.fn(),
        route: sampleRoute,
        highlightedStepIndex: 1,
        defaultExpanded: true,
      })
    );

    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('Inicia el recorrido por Ciclorruta 70');
    expect(html).toContain('450 m');
    expect(html).toContain('Gira a la derecha por Circular 4');
    expect(html).toContain('2.0 km');
  });
});
