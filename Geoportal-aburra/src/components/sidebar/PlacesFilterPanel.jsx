import { LoaderCircle, MapPin, Star } from 'lucide-react';
import { EQUIPMENT_TYPES, EQUIPMENT_TYPE_STYLES } from '../../constants/equipmentTypes';
import { NEARBY_SEARCH_RADIUS_METERS } from '../../constants/location';
import { useMapContext } from '../../context/useMapContext';
import { useNearbyPlaces } from '../../hooks/useNearbyPlaces';

function formatDistance(distanceMeters) {
  if (distanceMeters < 1000) return `${Math.round(distanceMeters)} m`;
  return `${(distanceMeters / 1000).toFixed(1)} km`;
}

export default function PlacesFilterPanel({ locationStatus, locationError, onRequestLocation }) {
  const { activeEquipmentTypes, toggleEquipmentType } = useMapContext();
  const { places, loading, error, selectPlace } = useNearbyPlaces();

  return (
    <div className="flex flex-col gap-3">
      <div className="border-y border-[var(--color-bg-elevated)] py-3">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
          Filtrar lugares
        </h2>
        <div className="flex flex-wrap gap-2">
          {Object.values(EQUIPMENT_TYPES).map((type) => (
            <label
              key={type}
              className={`flex cursor-pointer items-center gap-2 rounded-full border px-2.5 py-1 text-xs transition-all duration-200 ${
                activeEquipmentTypes[type]
                  ? 'text-[var(--color-text-primary)]'
                  : 'border-[var(--color-bg-elevated)] bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]'
              }`}
              style={activeEquipmentTypes[type] ? {
                borderColor: EQUIPMENT_TYPE_STYLES[type].color,
                backgroundColor: `${EQUIPMENT_TYPE_STYLES[type].color}20`,
              } : undefined}
            >
              <input
                type="checkbox"
                checked={activeEquipmentTypes[type]}
                onChange={() => toggleEquipmentType(type)}
                className="h-4 w-4 rounded border-[var(--color-bg-elevated)]"
                style={{ accentColor: EQUIPMENT_TYPE_STYLES[type].color }}
              />
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: EQUIPMENT_TYPE_STYLES[type].color }}
              />
              {EQUIPMENT_TYPE_STYLES[type].label}
            </label>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={onRequestLocation}
        disabled={locationStatus === 'loading'}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--color-bg-elevated)] bg-[var(--color-bg-primary)] px-3 py-2.5 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg-elevated)] disabled:cursor-wait disabled:opacity-60"
      >
        {locationStatus === 'loading'
          ? <LoaderCircle className="h-4 w-4 animate-spin" />
          : <MapPin className="h-4 w-4" />}
        {locationStatus === 'loading' ? 'Consultando ubicación...' : 'Ubicación actual'}
      </button>

      {locationError && <p role="alert" className="text-xs text-[var(--color-accent-danger)]">{locationError}</p>}
      {locationStatus === 'ready' && (
        <section aria-live="polite" className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
            Mejor valorados a {NEARBY_SEARCH_RADIUS_METERS / 1000} km
          </h2>
          {loading && <p className="text-xs text-[var(--color-text-secondary)]">Buscando lugares cercanos...</p>}
          {error && <p role="alert" className="text-xs text-[var(--color-accent-danger)]">{error}</p>}
          {!loading && !error && places.length === 0 && (
            <p className="text-xs text-[var(--color-text-secondary)]">No hay lugares con calificaciones dentro del radio.</p>
          )}
          {places.map((place) => (
            <button
              key={place.trainingSpotId}
              type="button"
              onClick={() => selectPlace(place)}
              className="w-full rounded-xl border border-[var(--color-bg-elevated)] bg-[var(--color-bg-primary)] p-3 text-left transition-colors hover:border-[var(--color-accent-primary)]"
            >
              <span className="block truncate text-sm font-semibold text-[var(--color-text-primary)]">{place.name}</span>
              <span className="mt-1 flex items-center gap-1 text-xs text-[var(--color-text-secondary)]">
                <Star className="h-3.5 w-3.5 fill-[var(--color-accent-warning)] text-[var(--color-accent-warning)]" />
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
