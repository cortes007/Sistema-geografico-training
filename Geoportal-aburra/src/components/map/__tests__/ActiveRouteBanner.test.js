import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ActiveRouteBanner from '../ActiveRouteBanner';

describe('ActiveRouteBanner', () => {
  const sampleRoute = {
    profile: 'bike',
    label: 'Ciclismo',
    coordinates: [
      [-75.5901, 6.2568],
      [-75.5745, 6.2248],
    ],
    distanceMeters: 4300,
    durationSeconds: 780,
    steps: [
      {
        instruction: 'Inicia el recorrido por Ciclorruta 70',
        distanceMeters: 4300,
        durationSeconds: 780,
        location: [-75.5901, 6.2568],
      },
    ],
  };

  it('renders nothing when route is null or has fewer than 2 coordinates', () => {
    expect(
      renderToStaticMarkup(
        createElement(ActiveRouteBanner, { route: null, onClearRoute: vi.fn() })
      )
    ).toBe('');

    expect(
      renderToStaticMarkup(
        createElement(ActiveRouteBanner, {
          route: { ...sampleRoute, coordinates: [[-75.5901, 6.2568]] },
          onClearRoute: vi.fn(),
        })
      )
    ).toBe('');
  });

  it('renders route summary and "Dejar de ver ruta" button when route is active', () => {
    const html = renderToStaticMarkup(
      createElement(ActiveRouteBanner, {
        route: sampleRoute,
        onClearRoute: vi.fn(),
      })
    );

    expect(html).toContain('Ciclismo');
    expect(html).toContain('4.3 km');
    expect(html).toContain('13 min');
    expect(html).toContain('Dejar de ver ruta');
    expect(html).not.toContain('Ver pasos');
  });

  it('renders fallback profile label when route.label is omitted and shows "Ver pasos" only when onOpenSteps and steps exist', () => {
    const htmlWithSteps = renderToStaticMarkup(
      createElement(ActiveRouteBanner, {
        route: { ...sampleRoute, label: undefined, profile: 'foot' },
        onClearRoute: vi.fn(),
        onOpenSteps: vi.fn(),
      })
    );

    expect(htmlWithSteps).toContain('Ruta peatonal');
    expect(htmlWithSteps).toContain('Ver pasos');
    expect(htmlWithSteps).toContain('Dejar de ver ruta');

    const htmlWithoutSteps = renderToStaticMarkup(
      createElement(ActiveRouteBanner, {
        route: { ...sampleRoute, label: undefined, profile: 'bike', steps: [] },
        onClearRoute: vi.fn(),
        onOpenSteps: vi.fn(),
      })
    );

    expect(htmlWithoutSteps).toContain('Ruta en bicicleta');
    expect(htmlWithoutSteps).not.toContain('Ver pasos');
  });
});
