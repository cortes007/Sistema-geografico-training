import { Calendar, Clock, RotateCcw, Search, Star, X } from 'lucide-react';
import { ABURRA_MUNICIPALITIES } from '../../constants/location';
import { useSpotSearch } from '../../hooks/useSpotSearch';

const RATING_FILTER_OPTIONS = [
  { label: 'Cualquier nota', value: 0 },
  { label: '3.0+ estrellas', value: 3 },
  { label: '4.0+ estrellas', value: 4 },
  { label: '4.5+ estrellas', value: 4.5 },
];

export default function SpotSearchPanel() {
  const {
    spotFilters,
    hasActiveFilters,
    results,
    loading,
    error,
    reload,
    updateFilter,
    resetSpotFilters,
    selectSearchSpot,
  } = useSpotSearch();

  return (
    <section
      aria-label="Buscador y filtros inteligentes"
      className="rounded-xl border border-[var(--color-bg-elevated)] bg-[var(--color-bg-secondary)]/80 p-3"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
          Buscar en el Valle de Aburrá
        </h2>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetSpotFilters}
            className="inline-flex min-h-8 items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-[var(--color-accent)] transition-colors motion-reduce:transition-none hover:bg-[var(--color-bg-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
          >
            <RotateCcw aria-hidden="true" className="h-3 w-3" />
            Limpiar
          </button>
        )}
      </div>

      <div className="relative mt-2">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-secondary)]"
        />
        <input
          type="search"
          aria-label="Buscar por nombre o municipio"
          placeholder="Nombre de parque, gym o municipio..."
          value={spotFilters.query}
          onChange={(event) => updateFilter({ query: event.target.value })}
          className="min-h-11 w-full rounded-xl border border-[var(--color-bg-elevated)] bg-[var(--color-bg-primary)] py-2 pl-9 pr-9 text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
        />
        {spotFilters.query && (
          <button
            type="button"
            onClick={() => updateFilter({ query: '' })}
            aria-label="Limpiar búsqueda"
            className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
          >
            <X aria-hidden="true" className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <select
          aria-label="Filtrar por municipio"
          value={spotFilters.municipality}
          onChange={(event) => updateFilter({ municipality: event.target.value })}
          className="min-h-11 rounded-xl border border-[var(--color-bg-elevated)] bg-[var(--color-bg-primary)] px-2.5 py-2 text-xs text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
        >
          <option value="">Todos los municipios</option>
          {ABURRA_MUNICIPALITIES.map((municipality) => (
            <option key={municipality} value={municipality}>
              {municipality}
            </option>
          ))}
        </select>

        <select
          aria-label="Filtrar por calificación mínima"
          value={spotFilters.minRating}
          onChange={(event) => updateFilter({ minRating: Number(event.target.value) })}
          className="min-h-11 rounded-xl border border-[var(--color-bg-elevated)] bg-[var(--color-bg-primary)] px-2.5 py-2 text-xs text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
        >
          {RATING_FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => updateFilter({ onlyWithMeetups: !spotFilters.onlyWithMeetups })}
          aria-pressed={spotFilters.onlyWithMeetups}
          className={`inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
            spotFilters.onlyWithMeetups
              ? 'bg-[var(--color-accent)] text-white'
              : 'border border-[var(--color-bg-elevated)] bg-[var(--color-bg-primary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)]'
          }`}
        >
          <Calendar aria-hidden="true" className="h-3.5 w-3.5" />
          Con quedadas próximas
        </button>

        <button
          type="button"
          onClick={() => updateFilter({ onlyOpenNow: !spotFilters.onlyOpenNow })}
          aria-pressed={spotFilters.onlyOpenNow}
          className={`inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
            spotFilters.onlyOpenNow
              ? 'bg-[var(--color-accent)] text-white'
              : 'border border-[var(--color-bg-elevated)] bg-[var(--color-bg-primary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)]'
          }`}
        >
          <Clock aria-hidden="true" className="h-3.5 w-3.5" />
          Abierto ahora
        </button>
      </div>

      {hasActiveFilters && (
        <div aria-live="polite" className="mt-3 space-y-2 border-t border-[var(--color-bg-elevated)] pt-2.5">
          {loading && (
            <p role="status" className="text-xs text-[var(--color-text-secondary)]">
              Consultando catálogo...
            </p>
          )}
          {error && (
            <div role="alert" className="space-y-1.5">
              <p className="text-xs text-[var(--color-accent-danger)]">{error}</p>
              <button
                type="button"
                onClick={reload}
                className="inline-flex min-h-9 items-center rounded-lg bg-[var(--color-bg-elevated)] px-2.5 py-1 text-xs font-semibold text-[var(--color-text-primary)] hover:brightness-110"
              >
                Reintentar
              </button>
            </div>
          )}
          {!loading && !error && results.length === 0 && (
            <p role="status" className="text-xs text-[var(--color-text-secondary)]">
              No hay lugares que coincidan con los filtros activos.
            </p>
          )}
          {!loading && !error && results.length > 0 && (
            <>
              <p className="text-[11px] font-semibold text-[var(--color-text-secondary)]">
                {results.length} {results.length === 1 ? 'resultado' : 'resultados'}
              </p>
              <div className="flex max-h-72 flex-col gap-1.5 overflow-y-auto pr-0.5">
                {results.map((spot) => (
                  <button
                    key={spot.trainingSpotId}
                    type="button"
                    onClick={() => selectSearchSpot(spot)}
                    className="min-h-11 w-full shrink-0 rounded-xl border border-[var(--color-bg-elevated)] bg-[var(--color-bg-primary)] p-2.5 text-left transition-colors motion-reduce:transition-none hover:border-[var(--color-accent-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                  >
                    <span className="block truncate text-xs font-semibold text-[var(--color-text-primary)]">
                      {spot.name}
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-[var(--color-text-secondary)]">
                      <span>
                        {spot.city
                          ? `${spot.city} · ${spot.equipmentType || spot.type}`
                          : spot.equipmentType || spot.type}
                      </span>
                      {spot.averageRating !== null && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-0.5 text-[var(--color-text-primary)]">
                            <Star aria-hidden="true" className="h-3 w-3 fill-[var(--color-accent-warning)] text-[var(--color-accent-warning)]" />
                            {spot.averageRating.toFixed(1)}
                          </span>
                        </>
                      )}
                      {spot.hasUpcomingMeetup && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-semibold text-[var(--color-accent)]">Quedada activa</span>
                        </>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
