import Point from 'ol/geom/Point';
import { easeOut } from 'ol/easing';

const activeCenterAnimations = new WeakMap();

export function getAnimationDuration(durationMs) {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : durationMs;
}

function getCenterPadding(willSelectPlace) {
  const layout = document.querySelector('[data-geoportal-layout]');
  const sidebar = document.getElementById('geoportal-sidebar');
  const sidebarRect = sidebar?.getBoundingClientRect();

  if (window.innerWidth >= 768) {
    const isPanelOpen = layout?.dataset.panelOpen === 'true';
    return [72, 72, 24, isPanelOpen && sidebarRect ? sidebarRect.width + 32 : 72];
  }

  const selectedPlaceWillBeVisible = willSelectPlace
    || layout?.dataset.selectedPlace === 'true';
  const targetHeightVh = Number(layout?.dataset.selectedSheetHeightVh);
  const sheetHeight = selectedPlaceWillBeVisible && Number.isFinite(targetHeightVh)
    ? window.innerHeight * targetHeightVh / 100
    : sidebarRect?.height ?? 0;

  return [72, 72, sheetHeight + 24, 24];
}

export function centerOnFeature(map, coordinateOrExtent, { targetType = 'point', willSelectPlace = false } = {}) {
  if (!map) return;

  const view = map.getView();
  const previousAnimation = activeCenterAnimations.get(map);
  if (previousAnimation) {
    previousAnimation.cancel();
  } else {
    view.cancelAnimations();
  }

  const duration = getAnimationDuration(700);
  const padding = getCenterPadding(willSelectPlace);
  const target = targetType === 'extent' ? coordinateOrExtent : new Point(coordinateOrExtent);
  let active = true;
  const viewport = map.getViewport();
  const finish = () => {
    if (!active) return;
    active = false;
    map.un('pointerdrag', cancel);
    map.un('dblclick', cancel);
    viewport?.removeEventListener('wheel', cancel);
    viewport?.removeEventListener('keydown', handleKeyDown);
    if (activeCenterAnimations.get(map)?.cancel === cancel) {
      activeCenterAnimations.delete(map);
    }
  };
  const cancel = () => {
    if (!active) return;
    view.cancelAnimations();
    finish();
  };
  const handleKeyDown = (event) => {
    if (['ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowUp', '+', '-', '=', '_'].includes(event.key)) {
      cancel();
    }
  };
  const animation = { cancel };
  const options = {
    padding,
    duration,
    easing: easeOut,
    callback: finish,
  };

  if (targetType === 'point') {
    options.maxZoom = Math.max(view.getZoom() ?? 14, 14);
  }

  activeCenterAnimations.set(map, animation);
  if (duration > 0) {
    map.on('pointerdrag', cancel);
    map.on('dblclick', cancel);
    viewport?.addEventListener('wheel', cancel, { passive: true });
    viewport?.addEventListener('keydown', handleKeyDown);
  }

  view.fit(target, options);
}
