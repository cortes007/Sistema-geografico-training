import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const mockUseAuth = vi.fn();

vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('../../../context/useMapContext', () => ({
  useMapContext: () => ({
    refreshPlaceRatings: vi.fn(),
  }),
}));

vi.mock('../../../services/calificacionesService', () => ({
  guardarCalificacionLugar: vi.fn(),
  listarCalificacionesLugar: vi.fn().mockResolvedValue([]),
  listarComponentesCalificacionUsuario: vi.fn().mockResolvedValue({}),
}));

vi.mock('../../../services/spotInsightsService', () => ({
  listarResumenComponentesSpot: vi.fn().mockResolvedValue([]),
}));

import PlaceRatingsPanel from '../PlaceRatingsPanel';

describe('PlaceRatingsPanel optional component ratings dropdown', () => {
  const samplePlace = {
    name: 'Parque Calistenia Poblado',
    type: 'fitness_station',
    equipmentType: 'gimnasio al aire libre',
    latitude: 6.21,
    longitude: -75.57,
    trainingSpotId: 'spot-1',
  };

  it('collapses optional component ratings by default when rating a place', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'user-1' } });

    const html = renderToStaticMarkup(
      createElement(PlaceRatingsPanel, {
        place: samplePlace,
        onRequestAuth: vi.fn(),
      })
    );

    expect(html).toContain('Calidad de instalaciones (opcional)');
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('Estado de barras y estructura');
    expect(html).not.toContain('Superficie y suelo');
    expect(html).not.toContain('Iluminación y seguridad');
  });

  it('renders optional component criteria only when the dropdown is expanded', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'user-1' } });

    const html = renderToStaticMarkup(
      createElement(PlaceRatingsPanel, {
        place: samplePlace,
        onRequestAuth: vi.fn(),
        defaultShowOptionalRatings: true,
      })
    );

    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('Estado de barras y estructura');
    expect(html).toContain('Superficie y suelo');
    expect(html).toContain('Iluminación y seguridad');
  });
});
