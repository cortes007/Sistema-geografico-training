import { useState } from 'react';
import { Bike, ChevronDown, ChevronUp, Footprints, MapPin } from 'lucide-react';
import { formatStepDistance } from '../../hooks/useDirections';

const PROFILE_OPTIONS = [
  { id: 'foot', label: 'A pie', Icon: Footprints },
  { id: 'bike', label: 'Bicicleta', Icon: Bike },
];

export default function RouteStepsPanel({
  routeProfile = 'foot',
  onSelectProfile,
  route = null,
  highlightedStepIndex = null,
  onSelectStep,
  defaultExpanded = false,
  disabled = false,
  showProfileSelector = true,
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const steps = Array.isArray(route?.steps) ? route.steps : [];
  const activeProfile = route?.profile || routeProfile || 'foot';
  const routeModeLabel = activeProfile === 'bike' ? 'Ruta en bicicleta' : 'Ruta peatonal';

  return (
    <div className="space-y-2">
      {showProfileSelector && (
        <div
          role="group"
          aria-label="Perfil de ruta"
          className="grid grid-cols-2 gap-1 rounded-xl border border-[var(--color-bg-elevated)] bg-[var(--color-bg-primary)] p-1"
        >
          {PROFILE_OPTIONS.map(({ id, label, Icon }) => {
            const isSelected = routeProfile === id;
            return (
              <button
                key={id}
                type="button"
                disabled={disabled}
                aria-pressed={isSelected}
                onClick={() => onSelectProfile?.(id)}
                className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors motion-reduce:transition-none disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                  isSelected
                    ? id === 'bike'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[var(--color-accent)] text-white'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                <Icon aria-hidden="true" className="h-3.5 w-3.5" />
                {label}
              </button>
            );
          })}
        </div>
      )}

      {route && (
        <div className="rounded-xl border border-[var(--color-bg-elevated)] bg-[var(--color-bg-secondary)]/70 p-2.5">
          <p role="status" className="text-xs font-medium text-[var(--color-text-primary)]">
            {routeModeLabel}: {(route.distanceMeters / 1000).toFixed(1)} km · {Math.ceil(route.durationSeconds / 60)} min aprox.
          </p>
          <p className="mt-0.5 text-[10px] text-[var(--color-text-secondary)]">
            {activeProfile === 'bike'
              ? 'Calculada priorizando red cicloviaria y vías aptas para bicicleta.'
              : 'Ruta peatonal calculada por el servicio del geoportal.'}
          </p>

          {steps.length > 0 && (
            <div className="mt-2 border-t border-[var(--color-bg-elevated)] pt-2">
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() => setExpanded((current) => !current)}
                className="flex min-h-10 w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-semibold text-[var(--color-brand-light)] transition-colors motion-reduce:transition-none hover:bg-[var(--color-bg-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
              >
                <span>Indicaciones paso a paso ({steps.length})</span>
                {expanded
                  ? <ChevronUp aria-hidden="true" className="h-4 w-4 shrink-0" />
                  : <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0" />}
              </button>

              {expanded && (
                <ol className="mt-2 max-h-52 space-y-1 overflow-y-auto pr-1">
                  {steps.map((step, index) => {
                    const isHighlighted = highlightedStepIndex === index;
                    const distanceLabel = formatStepDistance(step.distanceMeters);
                    return (
                      <li key={`${index}-${step.instruction}`}>
                        <button
                          type="button"
                          onClick={() => onSelectStep?.(step, index)}
                          disabled={!step.location}
                          className={`flex w-full items-start justify-between gap-2 rounded-lg border px-2.5 py-2 text-left text-xs transition-colors motion-reduce:transition-none disabled:cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                            isHighlighted
                              ? 'border-amber-400/60 bg-amber-500/15 text-[var(--color-text-primary)]'
                              : 'border-transparent bg-[var(--color-bg-primary)]/70 text-[var(--color-text-secondary)] hover:border-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)]'
                          }`}
                        >
                          <span className="flex min-w-0 items-start gap-2">
                            <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--color-bg-elevated)] text-[10px] font-bold text-[var(--color-text-primary)]">
                              {index + 1}
                            </span>
                            <span className="min-w-0 break-words">{step.instruction}</span>
                          </span>
                          <span className="flex shrink-0 items-center gap-1 text-[11px] font-medium text-[var(--color-text-secondary)]">
                            {distanceLabel}
                            {step.location && <MapPin aria-hidden="true" className="h-3 w-3 text-amber-400" />}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
