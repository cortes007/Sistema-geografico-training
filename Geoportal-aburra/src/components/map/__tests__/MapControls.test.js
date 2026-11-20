import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import MapControls from '../MapControls';

vi.mock('../../../context/useMapContext', () => ({
  useMapContext: () => ({
    map: null,
    isSidebarOpen: false,
    isSatellite: false,
    toggleBaseLayer: vi.fn(),
  }),
}));

describe('MapControls', () => {
  it('mantiene dimensiones de escritorio y usa tamaño y espaciado compactos en móvil', () => {
    const html = renderToStaticMarkup(
      createElement(MapControls, {
        locationStatus: 'idle',
        isPickingLocation: false,
        onRequestLocation: vi.fn(),
        onStartPickingLocation: vi.fn(),
        onCancelPickingLocation: vi.fn(),
      }),
    );

    expect(html).toContain('h-11 w-11');
    expect(html).toContain('max-md:h-9 max-md:w-9');
    expect(html).toContain('max-md:gap-2');
    expect(html).toContain('aria-label="Mostrar satélite"');
    expect(html).toContain('aria-label="Ubicación actual"');
    expect(html).toContain('aria-label="Elegir ubicación en el mapa"');
  });
});
