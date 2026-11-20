import { describe, expect, it } from 'vitest';
import {
  computeMobileSheetHeight,
  getRouteFitPadding,
  shouldCollapseMobileSheetOnRoute,
} from '../mobileSheetState';

describe('mobileSheetState', () => {
  describe('shouldCollapseMobileSheetOnRoute', () => {
    it('returns true for mobile viewports strictly narrower than 768px', () => {
      expect(shouldCollapseMobileSheetOnRoute(360)).toBe(true);
      expect(shouldCollapseMobileSheetOnRoute(412)).toBe(true);
      expect(shouldCollapseMobileSheetOnRoute(767)).toBe(true);
    });

    it('returns false for tablet/desktop viewports >= 768px and invalid values', () => {
      expect(shouldCollapseMobileSheetOnRoute(768)).toBe(false);
      expect(shouldCollapseMobileSheetOnRoute(1280)).toBe(false);
      expect(shouldCollapseMobileSheetOnRoute(0)).toBe(false);
      expect(shouldCollapseMobileSheetOnRoute(-1)).toBe(false);
      expect(shouldCollapseMobileSheetOnRoute(Number.NaN)).toBe(false);
      expect(shouldCollapseMobileSheetOnRoute(undefined)).toBe(false);
      expect(shouldCollapseMobileSheetOnRoute(null)).toBe(false);
    });
  });

  describe('computeMobileSheetHeight', () => {
    it('computes collapsed, expanded, and selected-place heights and forces collapse during route viewing', () => {
      expect(
        computeMobileSheetHeight({
          hasSelectedPlace: false,
          isPanelOpen: true,
        }),
      ).toBe('calc(84px + env(safe-area-inset-bottom))');

      expect(
        computeMobileSheetHeight({
          hasSelectedPlace: false,
          isPanelOpen: false,
        }),
      ).toBe('88dvh');

      expect(
        computeMobileSheetHeight({
          hasSelectedPlace: true,
          isPanelOpen: true,
          isCollapsedForRoute: false,
        }),
      ).toBe('60dvh');

      expect(
        computeMobileSheetHeight({
          hasSelectedPlace: true,
          isPanelOpen: false,
          isCollapsedForRoute: true,
        }),
      ).toBe('calc(84px + env(safe-area-inset-bottom))');
    });
  });

  describe('getRouteFitPadding', () => {
    it('returns mobile fit padding accommodating banner and sheet height and caps oversized transitions', () => {
      expect(
        getRouteFitPadding({
          viewportWidth: 375,
          viewportHeight: 667,
          sheetHeight: 84,
          hasBanner: true,
        }),
      ).toEqual([72, 56, 168, 56]);

      expect(
        getRouteFitPadding({
          viewportWidth: 375,
          viewportHeight: 667,
          sheetHeight: 84,
          hasBanner: false,
        }),
      ).toEqual([72, 56, 100, 56]);

      expect(
        getRouteFitPadding({
          viewportWidth: 375,
          viewportHeight: 667,
          sheetHeight: 580,
          hasBanner: true,
        }),
      ).toEqual([72, 56, 367, 56]);
    });

    it('returns desktop fit padding accounting for open/closed sidebar and active banner', () => {
      expect(
        getRouteFitPadding({
          viewportWidth: 1280,
          isPanelOpen: true,
          sidebarWidth: 360,
          hasBanner: true,
        }),
      ).toEqual([88, 80, 112, 408]);

      expect(
        getRouteFitPadding({
          viewportWidth: 1280,
          isPanelOpen: false,
          hasBanner: true,
        }),
      ).toEqual([88, 80, 112, 80]);

      expect(
        getRouteFitPadding({
          viewportWidth: 1280,
          isPanelOpen: false,
          hasBanner: false,
        }),
      ).toEqual([88, 80, 70, 80]);
    });
  });
});
