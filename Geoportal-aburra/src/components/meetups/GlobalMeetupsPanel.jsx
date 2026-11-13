import { Calendar, CheckCircle2, MapPin, RefreshCw, Users } from 'lucide-react';
import { resolveMeetupTargetPlace, useGlobalMeetups } from '../../hooks/useGlobalMeetups';

export default function GlobalMeetupsPanel() {
  const {
    events,
    registeredIds,
    loading,
    error,
    reload,
    selectMeetupSpot,
  } = useGlobalMeetups();

  return (
    <section aria-label="Agenda global de quedadas próximas" className="space-y-3">
      <div className="flex items-center justify-between gap-2 rounded-xl border border-[var(--color-bg-elevated)] bg-[var(--color-bg-secondary)]/80 px-3 py-2.5">
        <div className="min-w-0">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
            Quedadas próximas
          </h2>
          <p className="text-[11px] text-[var(--color-text-secondary)]">
            Eventos activos en el Valle de Aburrá
          </p>
        </div>
        <button
          type="button"
          onClick={reload}
          disabled={loading}
          aria-label="Actualizar quedadas próximas"
          className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg bg-[var(--color-bg-elevated)] px-2.5 text-xs font-semibold text-[var(--color-text-primary)] transition-colors motion-reduce:transition-none hover:brightness-110 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
        >
          <RefreshCw aria-hidden="true" className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading && (
        <p role="status" aria-live="polite" className="text-xs text-[var(--color-text-secondary)]">
          Cargando quedadas próximas...
        </p>
      )}

      {error && (
        <div role="alert" className="space-y-2 rounded-xl border border-[var(--color-accent-danger)]/40 bg-[var(--color-accent-danger)]/10 p-3">
          <p className="text-xs text-[var(--color-accent-danger)]">{error}</p>
          <button
            type="button"
            onClick={reload}
            className="inline-flex min-h-10 items-center rounded-lg bg-[var(--color-bg-elevated)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-primary)] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
          >
            Reintentar
          </button>
        </div>
      )}

      {!loading && !error && events.length === 0 && (
        <p role="status" aria-live="polite" className="rounded-xl border border-[var(--color-bg-elevated)] bg-[var(--color-bg-secondary)]/60 p-3 text-xs text-[var(--color-text-secondary)]">
          No hay quedadas próximas programadas por ahora.
        </p>
      )}

      {!loading && !error && events.length > 0 && (
        <div className="flex flex-col gap-2">
          {events.map((event) => {
            const canLocate = Boolean(resolveMeetupTargetPlace(event));
            const isRegistered = registeredIds.has(event.id);
            const attendeesLabel = event.asistentesConfirmados === 1 ? 'asistente' : 'asistentes';

            return (
              <article
                key={event.id}
                className="rounded-xl border border-[var(--color-bg-elevated)] bg-[var(--color-bg-primary)] p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                    {event.titulo}
                  </h3>
                  {isRegistered && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--color-accent-success)]/20 px-2 py-0.5 text-[11px] font-semibold text-[var(--color-accent-success)]">
                      <CheckCircle2 aria-hidden="true" className="h-3 w-3" />
                      Inscrito
                    </span>
                  )}
                </div>

                <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
                  <Calendar aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-[var(--color-accent)]" />
                  <span>{new Date(event.fechaHoraInicio).toLocaleString()}</span>
                </p>

                <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--color-text-primary)]">
                  <MapPin aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-[var(--color-accent)]" />
                  <span className="truncate">
                    {event.lugarNombre}
                    {event.ciudad ? ` · ${event.ciudad}` : ''}
                  </span>
                </p>

                <div className="mt-2.5 flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] text-[var(--color-text-secondary)]">
                    <Users aria-hidden="true" className="h-3.5 w-3.5" />
                    {event.asistentesConfirmados} {attendeesLabel}
                  </span>

                  <button
                    type="button"
                    disabled={!canLocate}
                    onClick={() => selectMeetupSpot(event)}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-xs font-semibold text-white transition-colors motion-reduce:transition-none hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                  >
                    Ver en el mapa
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
