import { Star } from 'lucide-react';
import { NEARBY_SEARCH_RADIUS_METERS } from '../../constants/location';
import { useNearbyPlaces } from '../../hooks/useNearbyPlaces';

function formatDistance(distanceMeters) {
  if (distanceMeters < 1000) return `${Math.round(distanceMeters)} m`;
  return `${(distanceMeters / 1000).toFixed(1)} km`;
}

export default function PlacesFilterPanel({ locationStatus, locationError }) {
  const { places, loading, error, selectPlace } = useNearbyPlaces();

  return (
    <div className="flex flex-col gap-3">
      {locationError && <p role="alert" className="text-xs text-[var(--color-accent-danger)]">{locationError}</p>}
      {locationStatus === 'ready' && (
        <section aria-live="polite" className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
            Mejor valorados a {NEARBY_SEARCH_RADIUS_METERS / 1000} km
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
