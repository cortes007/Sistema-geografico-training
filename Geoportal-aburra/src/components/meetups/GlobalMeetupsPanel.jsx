import { useState } from 'react';
import {
  Bike,
  Calendar,
  CheckCircle2,
  ExternalLink,
  Footprints,
  MapPin,
  Navigation,
  Plus,
  RefreshCw,
  Route,
  Users,
} from 'lucide-react';
import {
  resolveMeetupGoogleMapsUrl,
  resolveMeetupTargetPlace,
  useGlobalMeetups,
} from '../../hooks/useGlobalMeetups';
import RouteStepsPanel from '../map/RouteStepsPanel';
import RouteMeetupForm from './RouteMeetupForm';

const ACTIVITY_FILTERS = [
  { id: 'todas', label: 'Todas' },
  { id: 'entrenamiento', label: 'Entrenamiento' },
  { id: 'running', label: 'Running' },
  { id: 'ciclismo', label: 'Ciclismo' },
];

const ACTIVITY_BADGE = {
  entrenamiento: { label: 'Entrenamiento', className: 'bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)]' },
  running: { label: 'Running', className: 'bg-[var(--color-accent)]/20 text-[var(--color-brand-light)]' },
  ciclismo: { label: 'Ciclismo', className: 'bg-emerald-500/20 text-emerald-300' },
};

export default function GlobalMeetupsPanel({ onRequestAuth } = {}) {
  const {
    user,
    userLocation,
    spots,
    events,
    registeredIds,
    activityFilter,
    setActivityFilter,
    activeRouteMeetupId,
    activeRoute,
    highlightedStepIndex,
    stepsLoadingId,
    loading,
    error,
    actionError,
    reload,
    selectMeetupSpot,
    previewDraftRoute,
    focusMeetupStep,
    toggleAttendance,
    deleteMeetup,
    saveRouteMeetup,
    prepareEditMeetup,
    routePickTarget,
    draftOriginPoint,
    draftDestinationPoint,
    requestMapPoint,
    setDraftOrigin,
    setDraftDestination,
    resetDraftPoints,
    clearRoutePreview,
  } = useGlobalMeetups();

  const [creatingRoute, setCreatingRoute] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [busyEventId, setBusyEventId] = useState(null);

  const handleToggleAttendance = async (eventId, isRegistered) => {
    setBusyEventId(eventId);
    try {
      await toggleAttendance(eventId, isRegistered);
    } finally {
      setBusyEventId(null);
    }
  };

  const handleDelete = async (eventId) => {
    if (!window.confirm('¿Eliminar esta quedada?')) return;
    setBusyEventId(eventId);
    try {
      await deleteMeetup(eventId);
    } finally {
      setBusyEventId(null);
    }
  };

  return (
    <section aria-label="Agenda global de quedadas próximas" className="space-y-3">
      <div className="flex items-center justify-between gap-2 rounded-xl border border-[var(--color-bg-elevated)] bg-[var(--color-bg-secondary)]/80 px-3 py-2.5">
        <div className="min-w-0">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
            Quedadas próximas
          </h2>
          <p className="text-[11px] text-[var(--color-text-secondary)]">
            Entrenamientos, running y ciclismo en el Valle de Aburrá
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
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
      </div>

      <button
        type="button"
        onClick={() => {
          if (!user) {
            onRequestAuth?.();
            return;
          }
          setEditingEvent(null);
          resetDraftPoints(null, null);
          setCreatingRoute((value) => !value);
        }}
        className="inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-[var(--color-accent)] px-3 py-2 text-xs font-semibold text-white shadow-sm transition-colors motion-reduce:transition-none hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
      >
        <Plus aria-hidden="true" className="h-4 w-4 shrink-0" />
        {creatingRoute ? 'Cerrar creador de ruta' : 'Crear ruta de running o ciclismo'}
      </button>

      <div role="group" aria-label="Filtrar quedadas por tipo" className="flex flex-wrap gap-1.5">
        {ACTIVITY_FILTERS.map(({ id, label }) => {
          const active = activityFilter === id;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={active}
              onClick={() => setActivityFilter(id)}
              className={`min-h-9 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                active
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-white'
                  : 'border-[var(--color-bg-elevated)] bg-[var(--color-bg-primary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {(creatingRoute || editingEvent) && (
        <RouteMeetupForm
          key={editingEvent?.id || 'new-route-meetup'}
          initialEvent={editingEvent}
          spots={spots}
          userLocation={userLocation}
          originPoint={draftOriginPoint}
          destinationPoint={draftDestinationPoint}
          routePickTarget={routePickTarget}
          onOriginChange={setDraftOrigin}
          onDestinationChange={setDraftDestination}
          onRequestPickPoint={requestMapPoint}
          onPreviewRoute={previewDraftRoute}
          onSubmitMeetup={saveRouteMeetup}
          onSaved={() => {
            setCreatingRoute(false);
            setEditingEvent(null);
            resetDraftPoints(null, null);
          }}
          onCancel={() => {
            setCreatingRoute(false);
            setEditingEvent(null);
            resetDraftPoints(null, null);
            clearRoutePreview();
          }}
        />
      )}

      {loading && (
        <p role="status" aria-live="polite" className="text-xs text-[var(--color-text-secondary)]">
          Cargando quedadas próximas...
        </p>
      )}

      {actionError && (
        <p role="alert" className="rounded-xl border border-[var(--color-accent-danger)]/40 bg-[var(--color-accent-danger)]/10 p-2.5 text-xs text-[var(--color-accent-danger)]">
          {actionError}
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
          No hay quedadas próximas programadas para este filtro.
        </p>
      )}

      {!loading && !error && events.length > 0 && (
        <div className="flex flex-col gap-2">
          {events.map((event) => {
            const tipo = event.tipoActividad || 'entrenamiento';
            const isRouteMeetup = tipo === 'running' || tipo === 'ciclismo';
            const badge = ACTIVITY_BADGE[tipo] || ACTIVITY_BADGE.entrenamiento;
            const canLocate = isRouteMeetup
              ? Boolean(event.rutaGeom)
              : Boolean(resolveMeetupTargetPlace(event));
            const isRegistered = registeredIds.has(event.id);
            const isOrganizer = user?.id === event.organizadorId;
            const attendeesLabel = event.asistentesConfirmados === 1 ? 'asistente' : 'asistentes';
            const isActiveRoute = activeRouteMeetupId === event.id && activeRoute?.meetupId === event.id;
            const googleMapsUrl = isRouteMeetup ? resolveMeetupGoogleMapsUrl(event) : '';

            return (
              <article
                key={event.id}
                className="space-y-2 rounded-xl border border-[var(--color-bg-elevated)] bg-[var(--color-bg-primary)] p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}>
                        {tipo === 'ciclismo' ? <Bike aria-hidden="true" className="h-3 w-3" /> : tipo === 'running' ? <Footprints aria-hidden="true" className="h-3 w-3" /> : null}
                        {badge.label}
                      </span>
                      {isOrganizer && (
                        <span className="rounded-full bg-[var(--color-accent-warning)]/20 px-2 py-0.5 text-[10px] font-semibold text-[var(--color-accent-warning)]">
                          Organizas
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                      {event.titulo}
                    </h3>
                  </div>
                  {isRegistered && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--color-accent-success)]/20 px-2 py-0.5 text-[11px] font-semibold text-[var(--color-accent-success)]">
                      <CheckCircle2 aria-hidden="true" className="h-3 w-3" />
                      Inscrito
                    </span>
                  )}
                </div>

                {event.descripcion && (
                  <p className="text-xs text-[var(--color-text-secondary)]">{event.descripcion}</p>
                )}

                <p className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
                  <Calendar aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-[var(--color-accent)]" />
                  <span>{new Date(event.fechaHoraInicio).toLocaleString()}</span>
                </p>

                {isRouteMeetup ? (
                  <div className="space-y-1 text-xs text-[var(--color-text-primary)]">
                    <p className="flex items-center gap-1.5">
                      <Route aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      <span className="truncate">
                        {event.origenNombre || 'Origen'} → {event.destinoNombre || 'Destino'}
                      </span>
                    </p>
                    {Number.isFinite(event.distanciaMetros) && (
                      <p className="text-[11px] text-[var(--color-text-secondary)]">
                        {(event.distanciaMetros / 1000).toFixed(1)} km ·{' '}
                        {Math.max(1, Math.ceil((event.duracionSegundos || 0) / 60))} min aprox.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="flex items-center gap-1.5 text-xs text-[var(--color-text-primary)]">
                    <MapPin aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-[var(--color-accent)]" />
                    <span className="truncate">
                      {event.lugarNombre}
                      {event.ciudad ? ` · ${event.ciudad}` : ''}
                    </span>
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <span className="inline-flex items-center gap-1 text-[11px] text-[var(--color-text-secondary)]">
                    <Users aria-hidden="true" className="h-3.5 w-3.5" />
                    {event.asistentesConfirmados} {attendeesLabel}
                  </span>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {user && (
                      <button
                        type="button"
                        disabled={busyEventId === event.id}
                        onClick={() => handleToggleAttendance(event.id, isRegistered)}
                        className="inline-flex min-h-9 items-center rounded-lg bg-[var(--color-accent-success)] px-2.5 py-1 text-xs font-semibold text-[var(--color-on-brand)] hover:brightness-110 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                      >
                        {isRegistered ? 'Cancelar asistencia' : 'Asistir'}
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={!canLocate || (isRouteMeetup && stepsLoadingId === event.id)}
                      onClick={() => selectMeetupSpot(event)}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-3 py-1 text-xs font-semibold text-white transition-colors motion-reduce:transition-none hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                    >
                      {isRouteMeetup
                        ? (stepsLoadingId === event.id ? 'Cargando ruta...' : 'Ver ruta')
                        : 'Ver en el mapa'}
                    </button>
                  </div>
                </div>

                {isRouteMeetup && (
                  <div className="flex flex-wrap items-center gap-2 border-t border-[var(--color-bg-elevated)] pt-2">
                    {googleMapsUrl && (
                      <a
                        href={googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-[var(--color-brand)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-brand-light)] hover:bg-[var(--color-brand)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                      >
                        <Navigation aria-hidden="true" className="h-3 w-3" />
                        Google Maps
                        <ExternalLink aria-hidden="true" className="h-3 w-3" />
                      </a>
                    )}
                    {isOrganizer && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setCreatingRoute(false);
                            prepareEditMeetup(event);
                            setEditingEvent(event);
                          }}
                          className="min-h-9 px-2 text-[11px] font-semibold text-[var(--color-accent-primary)] hover:text-[var(--color-accent-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          disabled={busyEventId === event.id}
                          onClick={() => handleDelete(event.id)}
                          className="min-h-9 px-2 text-[11px] font-semibold text-[var(--color-accent-danger)] hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                        >
                          Eliminar
                        </button>
                      </>
                    )}
                  </div>
                )}

                {isActiveRoute && activeRoute?.steps?.length > 0 && (
                  <RouteStepsPanel
                    showProfileSelector={false}
                    routeProfile={activeRoute.profile}
                    route={activeRoute}
                    highlightedStepIndex={highlightedStepIndex}
                    onSelectStep={focusMeetupStep}
                    defaultExpanded
                  />
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
