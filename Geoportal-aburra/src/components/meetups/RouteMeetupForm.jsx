import { useEffect, useState } from 'react';
import { Bike, Crosshair, Footprints, LoaderCircle, Navigation } from 'lucide-react';
import {
  isValidRoutePoint,
  resolveInitialRoutePreview,
  validateRouteMeetupDraft,
} from '../../utils/routeMeetups';

function formatPointLabel(point) {
  if (!isValidRoutePoint(point)) return 'Sin seleccionar';
  return `${Number(point.latitude).toFixed(4)}, ${Number(point.longitude).toFixed(4)}`;
}

function createInitialDraft(initialEvent) {
  if (!initialEvent) {
    return {
      tipoActividad: 'running',
      trainingSpotId: null,
      titulo: '',
      descripcion: '',
      fechaHoraInicio: '',
      fechaHoraFin: '',
      origenNombre: '',
      destinoNombre: '',
    };
  }

  return {
    tipoActividad: initialEvent.tipoActividad === 'ciclismo' ? 'ciclismo' : 'running',
    trainingSpotId: initialEvent.trainingSpotId || null,
    titulo: initialEvent.titulo || '',
    descripcion: initialEvent.descripcion || '',
    fechaHoraInicio: initialEvent.fechaHoraInicio ? initialEvent.fechaHoraInicio.slice(0, 16) : '',
    fechaHoraFin: initialEvent.fechaHoraFin ? initialEvent.fechaHoraFin.slice(0, 16) : '',
    origenNombre: initialEvent.origenNombre || '',
    destinoNombre: initialEvent.destinoNombre || '',
  };
}

export default function RouteMeetupForm({
  initialEvent = null,
  spots = [],
  userLocation = null,
  originPoint = null,
  destinationPoint = null,
  routePickTarget = null,
  onOriginChange,
  onDestinationChange,
  onRequestPickPoint,
  onPreviewRoute,
  onSubmitMeetup,
  onSaved,
  onCancel,
}) {
  const [draft, setDraft] = useState(() => createInitialDraft(initialEvent));
  const [routePreview, setRoutePreview] = useState(() => resolveInitialRoutePreview(initialEvent));
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isValidRoutePoint(originPoint) || !isValidRoutePoint(destinationPoint) || !onPreviewRoute) {
      return undefined;
    }

    let cancelled = false;
    const profile = draft.tipoActividad === 'ciclismo' ? 'bike' : 'foot';

    const loadPreview = async () => {
      setPreviewLoading(true);
      setError('');
      try {
        const result = await onPreviewRoute({
          origin: originPoint,
          destination: destinationPoint,
          profile,
        });
        if (!cancelled && result) setRoutePreview(result);
      } catch (reason) {
        if (!cancelled) {
          setRoutePreview(null);
          setError(reason.message || 'No se pudo calcular la ruta preliminar.');
        }
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    };

    loadPreview();
    return () => {
      cancelled = true;
    };
  }, [destinationPoint, draft.tipoActividad, onPreviewRoute, originPoint]);

  const updateField = (event) => {
    const { name, value } = event.target;
    setDraft((current) => ({ ...current, [name]: value }));
  };

  const handleActivityChange = (tipoActividad) => {
    setDraft((current) => ({ ...current, tipoActividad }));
    setRoutePreview(null);
  };

  const useCurrentLocationAsOrigin = () => {
    if (!isValidRoutePoint(userLocation)) return;
    onOriginChange?.({
      latitude: Number(userLocation.latitude.toFixed(6)),
      longitude: Number(userLocation.longitude.toFixed(6)),
    });
    setDraft((current) => ({
      ...current,
      origenNombre: current.origenNombre || 'Mi ubicación',
    }));
    setRoutePreview(null);
  };

  const handleSelectSpotEndpoint = (role, spotId) => {
    if (!spotId) return;
    const matched = spots.find((item) => item.trainingSpotId === spotId);
    if (!matched) return;

    const point = {
      latitude: Number(matched.latitude.toFixed(6)),
      longitude: Number(matched.longitude.toFixed(6)),
    };
    if (role === 'origin') {
      onOriginChange?.(point);
      setDraft((current) => ({
        ...current,
        trainingSpotId: matched.trainingSpotId,
        origenNombre: matched.name,
      }));
    } else {
      onDestinationChange?.(point);
      setDraft((current) => ({
        ...current,
        trainingSpotId: current.trainingSpotId || matched.trainingSpotId,
        destinoNombre: matched.name,
      }));
    }
    setRoutePreview(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationError = validateRouteMeetupDraft({
      ...draft,
      origen: originPoint,
      destino: destinationPoint,
      routePreview,
    });
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = {
        trainingSpotId: draft.trainingSpotId || null,
        tipoActividad: draft.tipoActividad,
        perfilRuta: draft.tipoActividad === 'ciclismo' ? 'bike' : 'foot',
        titulo: draft.titulo,
        descripcion: draft.descripcion || null,
        fechaHoraInicio: draft.fechaHoraInicio,
        fechaHoraFin: draft.fechaHoraFin || null,
        origenNombre: draft.origenNombre || null,
        destinoNombre: draft.destinoNombre || null,
        origen: originPoint,
        destino: destinationPoint,
        rutaCoordenadas: routePreview.coordinates,
        distanciaMetros: routePreview.distanceMeters,
        duracionSegundos: routePreview.durationSeconds,
      };
      await onSubmitMeetup?.(payload, initialEvent?.id ?? null);
      onSaved?.();
    } catch (reason) {
      setError(reason.message || 'No se pudo guardar la quedada de ruta.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-2.5 rounded-xl border border-[var(--color-accent)]/40 bg-[var(--color-bg-secondary)] p-3"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--color-brand-light)]">
          {initialEvent ? 'Editar quedada de ruta' : 'Nueva quedada de ruta'}
        </h3>
      </div>

      <div role="group" aria-label="Modalidad de la quedada" className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={() => handleActivityChange('running')}
          aria-pressed={draft.tipoActividad === 'running'}
          className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-semibold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
            draft.tipoActividad === 'running'
              ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-white'
              : 'border-[var(--color-bg-elevated)] bg-[var(--color-bg-primary)] text-[var(--color-text-secondary)]'
          }`}
        >
          <Footprints aria-hidden="true" className="h-3.5 w-3.5" />
          Running
        </button>
        <button
          type="button"
          onClick={() => handleActivityChange('ciclismo')}
          aria-pressed={draft.tipoActividad === 'ciclismo'}
          className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-semibold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
            draft.tipoActividad === 'ciclismo'
              ? 'border-emerald-500 bg-emerald-600 text-white'
              : 'border-[var(--color-bg-elevated)] bg-[var(--color-bg-primary)] text-[var(--color-text-secondary)]'
          }`}
        >
          <Bike aria-hidden="true" className="h-3.5 w-3.5" />
          Ciclismo
        </button>
      </div>

      <label className="block text-xs font-semibold text-[var(--color-text-primary)]">
        Título
        <input
          name="titulo"
          type="text"
          required
          value={draft.titulo}
          onChange={updateField}
          placeholder={draft.tipoActividad === 'ciclismo' ? 'Ej. Rodada nocturna por la 70' : 'Ej. Trote matutino Parques del Río'}
          className="mt-1 min-h-10 w-full rounded-lg border border-[var(--color-bg-elevated)] bg-[var(--color-bg-primary)] px-2.5 py-1.5 font-normal text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
        />
      </label>

      <label className="block text-xs font-semibold text-[var(--color-text-primary)]">
        Descripción (opcional)
        <textarea
          name="descripcion"
          rows={2}
          value={draft.descripcion}
          onChange={updateField}
          placeholder="Ritmo, punto de encuentro o recomendaciones"
          className="mt-1 w-full rounded-lg border border-[var(--color-bg-elevated)] bg-[var(--color-bg-primary)] px-2.5 py-1.5 font-normal text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
        />
      </label>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="block text-xs font-semibold text-[var(--color-text-primary)]">
          Inicio
          <input
            name="fechaHoraInicio"
            type="datetime-local"
            required
            value={draft.fechaHoraInicio}
            onChange={updateField}
            className="mt-1 min-h-10 w-full rounded-lg border border-[var(--color-bg-elevated)] bg-[var(--color-bg-primary)] px-2 py-1.5 font-normal text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
          />
        </label>
        <label className="block text-xs font-semibold text-[var(--color-text-primary)]">
          Fin (opcional)
          <input
            name="fechaHoraFin"
            type="datetime-local"
            value={draft.fechaHoraFin}
            onChange={updateField}
            className="mt-1 min-h-10 w-full rounded-lg border border-[var(--color-bg-elevated)] bg-[var(--color-bg-primary)] px-2 py-1.5 font-normal text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
          />
        </label>
      </div>

      <div className="space-y-1.5 rounded-lg border border-[var(--color-bg-elevated)] bg-[var(--color-bg-primary)]/80 p-2.5">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-emerald-400">Origen (A)</span>
          <span className="text-[11px] text-[var(--color-text-secondary)]">
            {formatPointLabel(originPoint)}
          </span>
        </div>
        <input
          name="origenNombre"
          type="text"
          value={draft.origenNombre}
          onChange={updateField}
          placeholder="Nombre del punto de salida (opcional)"
          className="min-h-9 w-full rounded-lg border border-[var(--color-bg-elevated)] bg-[var(--color-bg-secondary)] px-2 py-1 text-xs text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
        />
        {spots.length > 0 && (
          <select
            aria-label="Elegir lugar deportivo como origen"
            defaultValue=""
            onChange={(event) => handleSelectSpotEndpoint('origin', event.target.value)}
            className="min-h-9 w-full rounded-lg border border-[var(--color-bg-elevated)] bg-[var(--color-bg-secondary)] px-2 py-1 text-xs text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
          >
            <option value="">Elegir spot existente como origen (opcional)...</option>
            {spots.map((spot) => (
              <option key={`orig-${spot.trainingSpotId}`} value={spot.trainingSpotId}>
                {spot.name}{spot.city ? ` · ${spot.city}` : ''}
              </option>
            ))}
          </select>
        )}
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => onRequestPickPoint?.('meetup-origin')}
            className={`inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
              routePickTarget === 'meetup-origin'
                ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-white'
                : 'border-[var(--color-bg-elevated)] bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)]'
            }`}
          >
            <Crosshair aria-hidden="true" className="h-3.5 w-3.5" />
            Elegir origen en el mapa
          </button>
          <button
            type="button"
            disabled={!isValidRoutePoint(userLocation)}
            onClick={useCurrentLocationAsOrigin}
            className="inline-flex min-h-9 items-center justify-center gap-1 rounded-lg border border-[var(--color-bg-elevated)] bg-[var(--color-bg-secondary)] px-2.5 py-1 text-xs font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
          >
            <Navigation aria-hidden="true" className="h-3 w-3" />
            Usar mi ubicación
          </button>
        </div>
      </div>

      <div className="space-y-1.5 rounded-lg border border-[var(--color-bg-elevated)] bg-[var(--color-bg-primary)]/80 p-2.5">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-rose-400">Destino (B)</span>
          <span className="text-[11px] text-[var(--color-text-secondary)]">
            {formatPointLabel(destinationPoint)}
          </span>
        </div>
        <input
          name="destinoNombre"
          type="text"
          value={draft.destinoNombre}
          onChange={updateField}
          placeholder="Nombre del punto de llegada (opcional)"
          className="min-h-9 w-full rounded-lg border border-[var(--color-bg-elevated)] bg-[var(--color-bg-secondary)] px-2 py-1 text-xs text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
        />
        {spots.length > 0 && (
          <select
            aria-label="Elegir lugar deportivo como destino"
            defaultValue=""
            onChange={(event) => handleSelectSpotEndpoint('destination', event.target.value)}
            className="min-h-9 w-full rounded-lg border border-[var(--color-bg-elevated)] bg-[var(--color-bg-secondary)] px-2 py-1 text-xs text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
          >
            <option value="">Elegir spot existente como destino (opcional)...</option>
            {spots.map((spot) => (
              <option key={`dest-${spot.trainingSpotId}`} value={spot.trainingSpotId}>
                {spot.name}{spot.city ? ` · ${spot.city}` : ''}
              </option>
            ))}
          </select>
        )}
        <button
          type="button"
          onClick={() => onRequestPickPoint?.('meetup-destination')}
          className={`inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
            routePickTarget === 'meetup-destination'
              ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-white'
              : 'border-[var(--color-bg-elevated)] bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)]'
          }`}
        >
          <Crosshair aria-hidden="true" className="h-3.5 w-3.5" />
          Elegir destino en el mapa
        </button>
      </div>

      {previewLoading && (
        <p role="status" className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
          <LoaderCircle aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
          Calculando vista previa de ruta...
        </p>
      )}

      {routePreview && !previewLoading && (
        <p role="status" className="rounded-lg bg-[var(--color-bg-primary)] px-2.5 py-1.5 text-xs text-[var(--color-text-primary)]">
          Ruta lista: <strong>{(routePreview.distanceMeters / 1000).toFixed(1)} km</strong> ·{' '}
          {Math.ceil(routePreview.durationSeconds / 60)} min aprox.
        </p>
      )}

      {error && (
        <p role="alert" className="rounded-lg bg-[var(--color-accent-danger)]/20 p-2 text-xs text-[var(--color-accent-danger)]">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving || previewLoading}
          className="min-h-10 flex-1 rounded-lg bg-[var(--color-accent-primary)] px-3 py-2 text-xs font-semibold text-[var(--color-on-brand)] transition-colors motion-reduce:transition-none hover:brightness-110 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
        >
          {saving ? 'Guardando...' : initialEvent ? 'Guardar cambios' : 'Publicar quedada'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="min-h-10 rounded-lg bg-[var(--color-bg-elevated)] px-3 py-2 text-xs font-semibold text-[var(--color-text-primary)] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
