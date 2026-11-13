import { Crosshair, Star, X } from 'lucide-react';
import {
  DEFAULT_SEARCH_RADIUS_METERS,
  SEARCH_RADIUS_OPTIONS,
} from '../../constants/location';
import { useMapContext } from '../../context/useMapContext';
import { useNearbyPlaces } from '../../hooks/useNearbyPlaces';
import { getSidebarLocationControls } from '../../utils/locationPanelState';
import SpotSearchPanel from './SpotSearchPanel';

function formatDistance(distanceMeters) {
  if (distanceMeters < 1000) return `${Math.round(distanceMeters)} m`;
  return `${(distanceMeters / 1000).toFixed(1)} km`;
}

export default function PlacesFilterPanel({
  locationStatus,
  locationError,
  locationSource,
  isPickingLocation,
  onStartPickingLocation,
  onCancelPickingLocation,
  onClearLocation,
}) {
  const { searchRadiusMeters, setSearchRadiusMeters } = useMapContext();
  const { places, loading, error, selectPlace } = useNearbyPlaces();
  const activeRadiusMeters = searchRadiusMeters || DEFAULT_SEARCH_RADIUS_METERS;
  const {
    showManualPicker,
    showRadiusControls,
    showNearbySection,
    showLocationError,
  } = getSidebarLocationControls({ locationStatus, locationError });

  return (
    <div className="flex flex-col gap-3">
      <SpotSearchPanel />
      {showManualPicker && (
        <div className="rounded-xl border border-[var(--color-bg-elevated)] bg-[var(--color-bg-secondary)]/80 p-3">
          <p className="text-xs font-semibold text-[var(--color-text-primary)]">
            No se pudo obtener tu ubicación
          </p>
          <p className="mt-0.5 text-[11px] text-[var(--color-text-secondary)]">
            Marca un punto en el mapa para usar lugares cercanos y rutas peatonales.
          </p>
          <button
            type="button"
            onClick={isPickingLocation ? onCancelPickingLocation : onStartPickingLocation}
            aria-pressed={isPickingLocation}
            className={`mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-primary)] ${
              isPickingLocation
                ? 'bg-[var(--color-accent)] text-white hover:brightness-110'
                : 'border border-[var(--color-accent)]/60 bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] hover:border-[var(--color-accent)] hover:bg-[var(--color-bg-elevated)]'
            }`}
          >
            <Crosshair aria-hidden="true" className="h-4 w-4" />
            {isPickingLocation ? 'Cancelar selección en el mapa' : 'Elegir mi punto en el mapa'}
          </button>
        </div>
      )}

      {showLocationError && (
        <p role="alert" className="text-xs text-[var(--color-accent-danger)]">{locationError}</p>
      )}

      {showRadiusControls && (
        <div className="rounded-xl border border-[var(--color-bg-elevated)] bg-[var(--color-bg-secondary)]/80 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[var(--color-text-primary)]">
                {locationSource === 'manual' ? 'Ubicación manual activa' : 'Ubicación GPS activa'}
              </p>
              <p className="text-[11px] text-[var(--color-text-secondary)]">
                Habilita lugares cercanos y rutas peatonales.
              </p>
            </div>
            <button
              type="button"
              onClick={onClearLocation}
              aria-label="Quitar ubicación"
              className="inline-flex min-h-11 items-center gap-1 rounded-lg bg-[var(--color-bg-elevated)] px-2.5 py-1.5 text-xs font-semibold text-[var(--color-text-primary)] transition-colors motion-reduce:transition-none hover:bg-[var(--color-accent-danger)]/20 hover:text-[var(--color-accent-danger)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-primary)]"
            >
              <X aria-hidden="true" className="h-3.5 w-3.5" />
              Quitar
            </button>
          </div>

          <div className="mt-2.5 flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-[var(--color-text-secondary)]">Radio:</span>
            <div role="group" aria-label="Radio de búsqueda" className="flex gap-1.5">
              {SEARCH_RADIUS_OPTIONS.map((radiusMeters) => {
                const selected = activeRadiusMeters === radiusMeters;
                return (
                  <button
                    key={radiusMeters}
                    type="button"
                    onClick={() => setSearchRadiusMeters(radiusMeters)}
                    aria-pressed={selected}
                    className={`min-h-11 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-primary)] ${
                      selected
                        ? 'bg-[var(--color-accent)] text-white'
                        : 'border border-[var(--color-bg-elevated)] bg-[var(--color-bg-primary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)]'
                    }`}
                  >
                    {radiusMeters / 1000} km
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {showNearbySection && (
        <section aria-live="polite" className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
            Mejor valorados a {activeRadiusMeters / 1000} km
          </h2>
          {loading && <p role="status" aria-live="polite" className="text-xs text-[var(--color-text-secondary)]">Buscando lugares cercanos...</p>}
          {error && <p role="alert" className="text-xs text-[var(--color-accent-danger)]">{error}</p>}
          {!loading && !error && places.length === 0 && (
            <p role="status" aria-live="polite" className="text-xs text-[var(--color-text-secondary)]">No hay lugares con calificaciones dentro del radio.</p>
          )}
          {places.map((place) => (
            <button
              key={place.trainingSpotId}
              type="button"
              onClick={() => selectPlace(place)}
              className="min-h-11 w-full rounded-xl border border-[var(--color-text-secondary)] bg-[var(--color-bg-primary)] p-3 text-left transition-colors motion-reduce:transition-none hover:border-[var(--color-accent-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-primary)]"
            >
              <span className="block truncate text-sm font-semibold text-[var(--color-text-primary)]">{place.name}</span>
              <span className="mt-1 flex items-center gap-1 text-xs text-[var(--color-text-secondary)]">
                <Star aria-hidden="true" className="h-3.5 w-3.5 fill-[var(--color-accent-warning)] text-[var(--color-accent-warning)]" />
                {place.averageRating.toFixed(1)} · {place.ratingCount} {place.ratingCount === 1 ? 'opinión' : 'opiniones'}
                <span aria-hidden="true">·</span>
                {formatDistance(place.distanceMeters)}
              </span>
              <span className="mt-1 block truncate text-[11px] text-[var(--color-text-secondary)]">{place.type}</span>
            </button>
          ))}
        </section>
      )}
    </div>
  );
}
