import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('../../services/spotInsightsService', () => ({
  obtenerEnlacesSpot: vi.fn(),
  guardarEnlacesSpot: vi.fn(),
  listarResumenComponentesSpot: vi.fn(),
}));

import { loadSpotInsightsBundle } from '../useSpotInsights';
import SpotLinksBar from '../../components/map/SpotLinksBar';

describe('useSpotInsights & UI panels', () => {
  it('loads links and component summary resiliently via Promise.allSettled', async () => {
    const result = await loadSpotInsightsBundle({
      trainingSpotId: 'spot-1',
      osmLinks: { website: 'https://osm.example.com', instagram: '@osm_gym' },
      fetchLinks: vi.fn().mockResolvedValue({
        website_url: 'https://oficial.example.com',
        instagram_url: null,
        fuente: 'oficial',
      }),
      fetchComponents: vi.fn().mockRejectedValue(new Error('RPC no disponible')),
    });

    expect(result.links).toEqual({
      websiteUrl: 'https://oficial.example.com/',
      instagramUrl: 'https://www.instagram.com/osm_gym',
      fuente: 'oficial',
      hasLinks: true,
    });
    expect(result.componentRows).toEqual([]);
    expect(result.warnings).toContain('RPC no disponible');
  });

  it('renders safe external links with rel="noopener noreferrer" in SpotLinksBar', () => {
    const html = renderToStaticMarkup(
      createElement(SpotLinksBar, {
        trainingSpotId: 'spot-1',
        links: {
          websiteUrl: 'https://gym.example.com/',
          instagramUrl: 'https://www.instagram.com/gym_med/',
          fuente: 'comunidad',
          hasLinks: true,
        },
        user: { id: 'user-1' },
        onSaveLinks: vi.fn(),
        onRequestAuth: vi.fn(),
      })
    );

    expect(html).toContain('https://gym.example.com/');
    expect(html).toContain('https://www.instagram.com/gym_med/');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('Comunidad');
    expect(html).toContain('Editar enlace');
  });
});
