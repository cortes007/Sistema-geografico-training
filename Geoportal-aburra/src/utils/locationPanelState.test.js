import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { getSidebarLocationControls } from './locationPanelState';

const mockUseMapContext = vi.fn();
const mockUseNearbyPlaces = vi.fn();

vi.mock('../context/useMapContext', () => ({
  useMapContext: () => mockUseMapContext(),
}));

vi.mock('../hooks/useNearbyPlaces', () => ({
  useNearbyPlaces: () => mockUseNearbyPlaces(),
}));

vi.mock('../components/sidebar/SpotSearchPanel', () => ({
  default: () => null,
}));

import PlacesFilterPanel from '../components/sidebar/PlacesFilterPanel';

describe('getSidebarLocationControls', () => {
  it('hides manual picker and radius selector when location is idle or loading', () => {
    expect(
      getSidebarLocationControls({ locationStatus: 'idle', locationError: '' })
    ).toEqual({
      showManualPicker: false,
      showRadiusControls: false,
      showNearbySection: false,
      showLocationError: false,
    });

    expect(
      getSidebarLocationControls({ locationStatus: 'loading', locationError: '' })
    ).toEqual({
      showManualPicker: false,
      showRadiusControls: false,
      showNearbySection: false,
      showLocationError: false,
    });
  });

  it('shows manual picker only when geolocation fails', () => {
    expect(
      getSidebarLocationControls({
        locationStatus: 'error',
        locationError: 'Ubicación bloqueada.',
      })
    ).toEqual({
      showManualPicker: true,
      showRadiusControls: false,
      showNearbySection: false,
      showLocationError: true,
    });

    expect(
      getSidebarLocationControls({
        locationStatus: 'error',
        locationError: '',
      })
    ).toEqual({
      showManualPicker: true,
      showRadiusControls: false,
      showNearbySection: false,
      showLocationError: false,
    });
  });

  it('shows radius selector and nearby section without manual picker when location is ready', () => {
    expect(
      getSidebarLocationControls({ locationStatus: 'ready', locationError: '' })
    ).toEqual({
      showManualPicker: false,
      showRadiusControls: true,
      showNearbySection: true,
      showLocationError: false,
    });
  });
});

describe('PlacesFilterPanel sidebar visibility', () => {
  it('does not render manual picker or radius selector while location is idle', () => {
    mockUseMapContext.mockReturnValue({
      searchRadiusMeters: 1000,
      setSearchRadiusMeters: vi.fn(),
    });
    mockUseNearbyPlaces.mockReturnValue({
      places: [],
      loading: false,
      error: '',
      selectPlace: vi.fn(),
    });

    const html = renderToStaticMarkup(
      createElement(PlacesFilterPanel, {
        locationStatus: 'idle',
        locationError: '',
        locationSource: null,
        isPickingLocation: false,
        onStartPickingLocation: vi.fn(),
        onCancelPickingLocation: vi.fn(),
        onClearLocation: vi.fn(),
      })
    );

    expect(html).not.toContain('Elegir mi punto en el mapa');
    expect(html).not.toContain('Radio de búsqueda');
  });

  it('renders manual picker button in sidebar only when location fails', () => {
    mockUseMapContext.mockReturnValue({
      searchRadiusMeters: 1000,
      setSearchRadiusMeters: vi.fn(),
    });
    mockUseNearbyPlaces.mockReturnValue({
      places: [],
      loading: false,
      error: '',
      selectPlace: vi.fn(),
    });

    const html = renderToStaticMarkup(
      createElement(PlacesFilterPanel, {
        locationStatus: 'error',
        locationError: 'Ubicación bloqueada.',
        locationSource: null,
        isPickingLocation: false,
        onStartPickingLocation: vi.fn(),
        onCancelPickingLocation: vi.fn(),
        onClearLocation: vi.fn(),
      })
    );

    expect(html).toContain('Elegir mi punto en el mapa');
    expect(html).toContain('Ubicación bloqueada.');
    expect(html).not.toContain('Radio de búsqueda');
  });

  it('renders radius controls and nearby heading when location is ready, hiding manual picker', () => {
    mockUseMapContext.mockReturnValue({
      searchRadiusMeters: 3000,
      setSearchRadiusMeters: vi.fn(),
    });
    mockUseNearbyPlaces.mockReturnValue({
      places: [],
      loading: false,
      error: '',
      selectPlace: vi.fn(),
    });

    const html = renderToStaticMarkup(
      createElement(PlacesFilterPanel, {
        locationStatus: 'ready',
        locationError: '',
        locationSource: 'gps',
        isPickingLocation: false,
        onStartPickingLocation: vi.fn(),
        onCancelPickingLocation: vi.fn(),
        onClearLocation: vi.fn(),
      })
    );

    expect(html).not.toContain('Elegir mi punto en el mapa');
    expect(html).toContain('Radio de búsqueda');
    expect(html).toContain('3 km');
    expect(html).toContain('Mejor valorados a 3 km');
  });
});
