import { describe, expect, it } from 'vitest';
import {
  normalizeInstagramUrl,
  resolveSpotLinks,
  sanitizeExternalUrl,
} from './spotLinks.js';

describe('spotLinks utils', () => {
  it('sanitizes external URLs accepting only http and https schemes', () => {
    expect(sanitizeExternalUrl('https://example.com/gym')).toBe('https://example.com/gym');
    expect(sanitizeExternalUrl('  http://gimnasio.co/planes  ')).toBe('http://gimnasio.co/planes');

    expect(sanitizeExternalUrl('javascript:alert(1)')).toBeNull();
    expect(sanitizeExternalUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
    expect(sanitizeExternalUrl('vbscript:msgbox("x")')).toBeNull();
    expect(sanitizeExternalUrl('ftp://example.com')).toBeNull();
    expect(sanitizeExternalUrl('')).toBeNull();
    expect(sanitizeExternalUrl(null)).toBeNull();
    expect(sanitizeExternalUrl('not a valid url')).toBeNull();
  });

  it('normalizes valid Instagram handles and paths while blocking dangerous schemes', () => {
    expect(normalizeInstagramUrl('@calistenia_med')).toBe('https://www.instagram.com/calistenia_med');
    expect(normalizeInstagramUrl('instagram.com/gym_sur')).toBe('https://instagram.com/gym_sur');
    expect(normalizeInstagramUrl('https://www.instagram.com/box_aburra/')).toBe('https://www.instagram.com/box_aburra/');
    expect(normalizeInstagramUrl('javascript:alert(1)')).toBeNull();
    expect(normalizeInstagramUrl('')).toBeNull();
  });

  it('prioritizes database links over OSM links and strips unsafe schemes', () => {
    const merged = resolveSpotLinks({
      osmLinks: {
        websiteUrl: 'https://osm.example.com',
        instagramUrl: '@osm_handle',
      },
      dbRecord: {
        website_url: 'https://oficial.example.com',
        instagram_url: null,
        fuente: 'oficial',
      },
    });

    expect(merged).toEqual({
      websiteUrl: 'https://oficial.example.com/',
      instagramUrl: 'https://www.instagram.com/osm_handle',
      fuente: 'oficial',
      hasLinks: true,
    });

    const unsafeBoth = resolveSpotLinks({
      osmLinks: {
        websiteUrl: 'javascript:alert(1)',
        instagramUrl: 'data:text/plain,evil',
      },
      dbRecord: null,
    });

    expect(unsafeBoth).toEqual({
      websiteUrl: null,
      instagramUrl: null,
      fuente: null,
      hasLinks: false,
    });
  });
});
