import { Bike, Footprints, List, X } from 'lucide-react';

export default function ActiveRouteBanner({
  route,
  onClearRoute,
  onOpenSteps = null,
}) {
  if (!Array.isArray(route?.coordinates) || route.coordinates.length < 2) {
    return null;
  }

  const isBike = route.profile === 'bike';
  const label = route.label || (isBike ? 'Ruta en bicicleta' : 'Ruta peatonal');
  const distanceKm = Number.isFinite(route.distanceMeters)
    ? `${(route.distanceMeters / 1000).toFixed(1)} km`
    : null;
  const durationMinutes = Number.isFinite(route.durationSeconds)
    ? `${Math.max(1, Math.ceil(route.durationSeconds / 60))} min`
    : null;
  const hasSteps = Boolean(onOpenSteps && Array.isArray(route.steps) && route.steps.length > 0);
  const Icon = isBike ? Bike : Footprints;

  return (
    <div
      role="region"
      aria-label="Ruta activa"
      className="absolute bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center justify-between gap-2 rounded-2xl border border-[var(--color-bg-elevated)] bg-[var(--color-bg-secondary)]/95 px-3 py-2 text-xs text-[var(--color-text-primary)] shadow-2xl backdrop-blur-sm max-md:flex-wrap max-md:bottom-[calc(var(--sheet-h)+10px)] max-md:left-14 max-md:right-14 max-md:translate-x-0 max-md:px-2.5 max-md:py-1.5"
    >
      <div className="flex min-w-0 items-center gap-2">
        <span
          className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
            isBike ? 'bg-emerald-600/25 text-emerald-300' : 'bg-[var(--color-accent)]/25 text-[var(--color-brand-light)]'
          }`}
        >
          <Icon aria-hidden="true" className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold text-[var(--color-text-primary)]">{label}</p>
          {(distanceKm || durationMinutes) && (
            <p className="truncate text-[11px] text-[var(--color-text-secondary)]">
              {[distanceKm, durationMinutes].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {hasSteps && (
          <button
            type="button"
            onClick={onOpenSteps}
            className="inline-flex min-h-9 items-center gap-1 rounded-xl bg-[var(--color-bg-elevated)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-text-primary)] transition-colors motion-reduce:transition-none hover:brightness-110 max-md:min-h-8 max-md:px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
          >
            <List aria-hidden="true" className="h-3.5 w-3.5" />
            <span>Ver pasos</span>
          </button>
        )}
        <button
          type="button"
          onClick={onClearRoute}
          aria-label="Dejar de ver ruta"
          className="inline-flex min-h-9 items-center gap-1 rounded-xl bg-[var(--color-bg-elevated)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-text-primary)] transition-colors motion-reduce:transition-none hover:bg-[var(--color-accent-danger)]/20 hover:text-[var(--color-accent-danger)] max-md:min-h-8 max-md:px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
        >
          <X aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
          <span>Dejar de ver ruta</span>
        </button>
      </div>
    </div>
  );
}
