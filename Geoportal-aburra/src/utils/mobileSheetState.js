export const MOBILE_BREAKPOINT_PX = 768;
export const MOBILE_SHEET_COLLAPSED_PX = 84;
export const MOBILE_SHEET_COLLAPSED_HEIGHT = 'calc(84px + env(safe-area-inset-bottom))';

export function shouldCollapseMobileSheetOnRoute(viewportWidth) {
  return Number.isFinite(viewportWidth)
    && viewportWidth > 0
    && viewportWidth < MOBILE_BREAKPOINT_PX;
}

export function computeMobileSheetHeight({
  hasSelectedPlace = false,
  isPanelOpen = true,
  isCollapsedForRoute = false,
} = {}) {
  if (isCollapsedForRoute) return MOBILE_SHEET_COLLAPSED_HEIGHT;
  if (hasSelectedPlace) return '60dvh';
  return isPanelOpen ? MOBILE_SHEET_COLLAPSED_HEIGHT : '88dvh';
}

export function getRouteFitPadding({
  viewportWidth = 1280,
  viewportHeight = 800,
  isPanelOpen = false,
  sidebarWidth = 0,
  sheetHeight = MOBILE_SHEET_COLLAPSED_PX,
  hasBanner = true,
} = {}) {
  if (shouldCollapseMobileSheetOnRoute(viewportWidth)) {
    const baseSheetHeight = Number.isFinite(sheetHeight) && sheetHeight > 0
      ? sheetHeight
      : MOBILE_SHEET_COLLAPSED_PX;
    const bannerAllowance = hasBanner ? 84 : 16;
    const rawBottom = Math.round(baseSheetHeight + bannerAllowance);
    const maxBottom = Number.isFinite(viewportHeight) && viewportHeight > 0
      ? Math.round(viewportHeight * 0.55)
      : rawBottom;
    return [72, 56, Math.min(rawBottom, maxBottom), 56];
  }

  const left = isPanelOpen && Number.isFinite(sidebarWidth) && sidebarWidth > 0
    ? Math.round(sidebarWidth + 48)
    : 80;
  const bottom = hasBanner ? 112 : 70;
  return [88, 80, bottom, left];
}
