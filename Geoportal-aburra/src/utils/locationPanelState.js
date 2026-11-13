/**
 * Determines which location controls and nearby results should render in the sidebar.
 * Manual map location picking appears in the sidebar only when geolocation fails.
 */
export function getSidebarLocationControls({ locationStatus, locationError }) {
  const isLocationReady = locationStatus === 'ready';
  const hasLocationError = !isLocationReady && (locationStatus === 'error' || Boolean(locationError));

  return {
    showManualPicker: hasLocationError,
    showRadiusControls: isLocationReady,
    showNearbySection: isLocationReady,
    showLocationError: Boolean(locationError),
  };
}
