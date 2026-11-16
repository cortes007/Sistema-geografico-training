import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Star } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useMapContext } from '../../context/useMapContext';
import {
  guardarCalificacionLugar,
  listarCalificacionesLugar,
  listarComponentesCalificacionUsuario,
} from '../../services/calificacionesService';
import { listarResumenComponentesSpot } from '../../services/spotInsightsService';
import {
  getComponentCriteriaForPlace,
  mergeComponentSummaryWithCriteria,
} from '../../utils/componentQuality';

function Stars({ value, interactive = false, onSelect }) {
  return (
    <div className="flex items-center gap-1" aria-label={`${value} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={interactive ? () => onSelect(star) : undefined}
          aria-label={interactive ? `Calificar con ${star} ${star === 1 ? 'estrella' : 'estrellas'}` : undefined}
          aria-pressed={interactive ? value === star : undefined}
          className={interactive ? 'min-h-11 min-w-11 rounded p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-primary)]' : 'cursor-default p-0.5'}
        >
          <Star
            aria-hidden="true"
            className={`h-5 w-5 ${star <= value ? 'fill-[var(--color-accent-warning)] text-[var(--color-accent-warning)]' : 'text-[var(--color-bg-elevated)]'}`}
          />
        </button>
      ))}
    </div>
  );
}

function ReviewCard({ review, isCurrentUser }) {
  return (
    <article className="rounded-xl border border-[var(--color-bg-elevated)] bg-[var(--color-bg-secondary)] p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-[var(--color-text-primary)]">
            {review.nombre_usuario}{isCurrentUser ? ' · Tu opinión' : ''}
          </p>
          <p className="mt-0.5 text-[11px] text-[var(--color-text-secondary)]">
            {new Date(review.fecha_actualizacion).toLocaleDateString('es-CO')}
          </p>
        </div>
        <Stars value={review.calificacion} />
      </div>
      {review.comentario && (
        <p className="mt-2 whitespace-pre-wrap break-words text-xs text-[var(--color-text-secondary)]">
          {review.comentario}
        </p>
      )}
    </article>
  );
}

export default function PlaceRatingsPanel({
  place,
  onRequestAuth,
  defaultShowOptionalRatings = false,
}) {
  const { user } = useAuth();
  const { refreshPlaceRatings } = useMapContext();
  const { name, type, equipmentType, latitude, longitude, trainingSpotId } = place;
  const requestId = useRef(0);
  const [reviews, setReviews] = useState([]);
  const [componentSummaryRows, setComponentSummaryRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [componentRatings, setComponentRatings] = useState({});
  const [showOptionalRatings, setShowOptionalRatings] = useState(defaultShowOptionalRatings);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  const criteria = useMemo(
    () => getComponentCriteriaForPlace({ equipmentType, type }),
    [equipmentType, type]
  );

  const componentSummary = useMemo(
    () => mergeComponentSummaryWithCriteria(criteria, componentSummaryRows),
    [componentSummaryRows, criteria]
  );

  const loadReviews = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError('');
    try {
      const [nextReviews, nextComponentRows] = await Promise.all([
        listarCalificacionesLugar({ name, type, latitude, longitude }),
        trainingSpotId ? listarResumenComponentesSpot(trainingSpotId).catch(() => []) : Promise.resolve([]),
      ]);
      if (currentRequest !== requestId.current) return;

      setReviews(nextReviews);
      setComponentSummaryRows(nextComponentRows);

      const ownReview = user ? nextReviews.find((review) => review.usuario_id === user.id) : null;
      setRating(ownReview?.calificacion ?? 0);
      setComment(ownReview?.comentario ?? '');

      if (ownReview?.id && trainingSpotId) {
        const ownComponents = await listarComponentesCalificacionUsuario(ownReview.id).catch(() => ({}));
        if (currentRequest === requestId.current) {
          setComponentRatings(ownComponents);
        }
      } else {
        setComponentRatings({});
      }
    } catch (reason) {
      if (currentRequest === requestId.current) {
        setError(reason.message || 'No se pudieron cargar las opiniones.');
      }
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [name, type, latitude, longitude, trainingSpotId, user]);

  useEffect(() => {
    Promise.resolve().then(loadReviews);
    return () => {
      requestId.current += 1;
    };
  }, [loadReviews]);

  const saveReview = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      await guardarCalificacionLugar(
        { name, type, latitude, longitude, trainingSpotId },
        { calificacion: rating, comentario: comment, componentes: componentRatings }
      );
      refreshPlaceRatings();
      setSuccess('Tu opinión se guardó correctamente.');
      await loadReviews();
    } catch (reason) {
      setError(reason.message || 'No se pudo guardar tu opinión.');
    } finally {
      setSaving(false);
    }
  };

  const average = reviews.length
    ? reviews.reduce((total, review) => total + review.calificacion, 0) / reviews.length
    : 0;
  const hasComponentScores = componentSummary.some((item) => item.ratingCount > 0);
  const ratedOptionalCount = criteria.filter((criterion) => Number(componentRatings[criterion.key]) > 0).length;

  return (
    <section className="mt-4 border-t border-[var(--color-bg-elevated)] pt-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold text-[var(--color-text-primary)]">Calificaciones y opiniones</h3>
        {!loading && reviews.length > 0 && (
          <span className="text-xs text-[var(--color-text-secondary)]">
            {average.toFixed(1)} / 5 · {reviews.length} {reviews.length === 1 ? 'opinión' : 'opiniones'}
          </span>
        )}
      </div>

      {hasComponentScores && (
        <div aria-label="Resumen de calidad de componentes" className="mt-2.5 space-y-1.5 rounded-xl border border-[var(--color-bg-elevated)] bg-[var(--color-bg-secondary)]/70 p-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
            Calidad de componentes
          </p>
          {componentSummary.map((item) => (
            <div key={item.key} className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate text-[var(--color-text-primary)]">{item.label}</span>
              <span className="shrink-0 font-semibold text-[var(--color-accent-warning)]">
                {item.averageRating !== null ? `${item.averageRating.toFixed(1)} / 5` : 'Sin datos'}
              </span>
            </div>
          ))}
        </div>
      )}

      {user ? (
        <form onSubmit={saveReview} className="mt-3 space-y-2 rounded-xl border border-[var(--color-accent-warning)]/30 bg-[var(--color-accent-warning)]/10 p-3">
          <label className="block text-xs font-semibold text-[var(--color-text-primary)]">
            Tu calificación
            <span className="mt-1 block">
              <Stars value={rating} interactive onSelect={setRating} />
            </span>
          </label>

          {trainingSpotId && (
            <div className="rounded-lg border border-[var(--color-bg-elevated)] bg-[var(--color-bg-primary)]/60">
              <button
                type="button"
                aria-expanded={showOptionalRatings}
                aria-controls="optional-component-ratings"
                onClick={() => setShowOptionalRatings((open) => !open)}
                className="flex min-h-11 w-full items-center justify-between gap-2 px-2.5 py-2 text-left text-[11px] font-semibold text-[var(--color-text-secondary)] transition-colors motion-reduce:transition-none hover:text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
              >
                <span>
                  Calidad de instalaciones (opcional)
                  {ratedOptionalCount > 0 ? ` · ${ratedOptionalCount}/${criteria.length}` : ''}
                </span>
                <ChevronDown
                  aria-hidden="true"
                  className={`h-4 w-4 shrink-0 transition-transform duration-200 motion-reduce:transition-none ${
                    showOptionalRatings ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {showOptionalRatings && (
                <div
                  id="optional-component-ratings"
                  className="space-y-1.5 border-t border-[var(--color-bg-elevated)] px-2.5 py-2"
                >
                  {criteria.map((criterion) => (
                    <div key={criterion.key} className="flex flex-wrap items-center justify-between gap-1">
                      <span className="text-[11px] text-[var(--color-text-primary)]">{criterion.label}</span>
                      <Stars
                        value={componentRatings[criterion.key] || 0}
                        interactive
                        onSelect={(value) =>
                          setComponentRatings((prev) => ({
                            ...prev,
                            [criterion.key]: prev[criterion.key] === value ? 0 : value,
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <label className="block text-xs font-semibold text-[var(--color-text-primary)]">
            Comentario <span className="font-normal text-[var(--color-text-secondary)]">(opcional)</span>
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="Comparte tu experiencia en este lugar"
              className="mt-1 min-h-11 w-full resize-y rounded-lg border border-[var(--color-text-secondary)] bg-[var(--color-bg-primary)] px-2.5 py-2 font-normal text-[var(--color-text-primary)] transition-all duration-200 motion-reduce:transition-none focus:border-[var(--color-accent-warning)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-primary)]"
            />
            <span className="mt-1 block text-right font-normal text-[var(--color-text-secondary)]">{comment.length}/1000</span>
          </label>
          <button
            type="submit"
            disabled={saving || loading || rating === 0}
            className="min-h-11 rounded-lg bg-[var(--color-accent-warning)] px-3 py-2 text-xs font-semibold text-[var(--color-bg-primary)] transition-all duration-200 motion-reduce:transition-none hover:bg-[var(--color-accent-secondary)] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-primary)]"
          >
            {saving ? 'Guardando...' : reviews.some((review) => review.usuario_id === user.id) ? 'Actualizar opinión' : 'Publicar opinión'}
          </button>
        </form>
      ) : (
        <div className="mt-3 rounded-xl bg-[var(--color-bg-secondary)] p-3">
          <p className="text-xs text-[var(--color-text-secondary)]">Inicia sesión para calificar este lugar y compartir tu opinión.</p>
          <button
            type="button"
            onClick={onRequestAuth}
            className="mt-2 min-h-11 rounded-lg bg-[var(--color-accent-primary)] px-3 py-2 text-xs font-semibold text-[var(--color-on-brand)] transition-all duration-200 motion-reduce:transition-none hover:bg-[var(--color-brand-light)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-primary)]"
          >
            Iniciar sesión
          </button>
        </div>
      )}

      {success && <p role="status" className="mt-2 text-xs text-[var(--color-accent-success)]">{success}</p>}
      {error && <p role="alert" className="mt-2 rounded-lg bg-[var(--color-accent-danger)]/20 p-2 text-xs text-[var(--color-accent-danger)]">{error}</p>}
      {loading && <p role="status" aria-live="polite" className="mt-3 text-xs text-[var(--color-text-secondary)]">Cargando opiniones...</p>}
      {!loading && !error && reviews.length === 0 && (
        <p role="status" aria-live="polite" className="mt-3 text-xs text-[var(--color-text-secondary)]">Este lugar aún no tiene opiniones.</p>
      )}
      {!loading && reviews.length > 0 && (
        <div className="mt-3 space-y-2">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} isCurrentUser={review.usuario_id === user?.id} />
          ))}
        </div>
      )}
    </section>
  );
}
