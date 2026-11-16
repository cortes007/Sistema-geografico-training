import { useState } from 'react';
import { AtSign, ExternalLink, Globe, Link2 } from 'lucide-react';

const SOURCE_LABELS = {
  osm: 'OpenStreetMap',
  oficial: 'Oficial',
  comunidad: 'Comunidad',
};

export default function SpotLinksBar({
  trainingSpotId,
  links,
  user,
  onSaveLinks,
  onRequestAuth,
}) {
  const [editing, setEditing] = useState(false);
  const [websiteInput, setWebsiteInput] = useState('');
  const [instagramInput, setInstagramInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const hasLinks = Boolean(links?.hasLinks);
  if (!hasLinks && !trainingSpotId) {
    return null;
  }

  const openEditor = () => {
    if (!user) {
      onRequestAuth?.();
      return;
    }
    setWebsiteInput(links?.websiteUrl || '');
    setInstagramInput(links?.instagramUrl || '');
    setError('');
    setSuccess('');
    setEditing((prev) => !prev);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      await onSaveLinks({
        websiteUrl: websiteInput,
        instagramUrl: instagramInput,
      });
      setSuccess('Enlace actualizado.');
      setEditing(false);
    } catch (reason) {
      setError(reason.message || 'No se pudo guardar el enlace.');
    } finally {
      setSaving(false);
    }
  };

  const sourceLabel = links?.fuente ? (SOURCE_LABELS[links.fuente] || links.fuente) : '';

  return (
    <section
      aria-label="Enlaces del lugar"
      className="rounded-xl border border-[var(--color-bg-elevated)] bg-[var(--color-bg-secondary)]/70 p-2.5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {links?.websiteUrl && (
            <a
              href={links.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[var(--color-bg-elevated)] bg-[var(--color-bg-primary)] px-2.5 py-1.5 text-xs font-semibold text-[var(--color-text-primary)] transition-colors motion-reduce:transition-none hover:border-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
            >
              <Globe aria-hidden="true" className="h-3.5 w-3.5 text-[var(--color-accent)]" />
              Sitio web
              <ExternalLink aria-hidden="true" className="h-3 w-3 opacity-70" />
            </a>
          )}

          {links?.instagramUrl && (
            <a
              href={links.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[var(--color-bg-elevated)] bg-[var(--color-bg-primary)] px-2.5 py-1.5 text-xs font-semibold text-[var(--color-text-primary)] transition-colors motion-reduce:transition-none hover:border-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
            >
              <AtSign aria-hidden="true" className="h-3.5 w-3.5 text-[var(--color-accent)]" />
              Instagram
              <ExternalLink aria-hidden="true" className="h-3 w-3 opacity-70" />
            </a>
          )}

          {!hasLinks && (
            <span className="text-[11px] text-[var(--color-text-secondary)]">
              Sin sitio web registrado
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {sourceLabel && (
            <span className="rounded-full bg-[var(--color-bg-elevated)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-text-secondary)]">
              {sourceLabel}
            </span>
          )}
          {trainingSpotId && (
            <button
              type="button"
              onClick={openEditor}
              className="inline-flex min-h-8 items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-[var(--color-accent)] transition-colors motion-reduce:transition-none hover:bg-[var(--color-bg-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
            >
              <Link2 aria-hidden="true" className="h-3 w-3" />
              {hasLinks ? 'Editar enlace' : 'Sugerir enlace'}
            </button>
          )}
        </div>
      </div>

      {success && (
        <p role="status" className="mt-1.5 text-[11px] text-[var(--color-accent-success)]">
          {success}
        </p>
      )}

      {editing && (
        <form onSubmit={handleSubmit} className="mt-2.5 space-y-2 border-t border-[var(--color-bg-elevated)] pt-2.5">
          <label className="block text-[11px] font-semibold text-[var(--color-text-primary)]">
            Sitio web oficial (https://)
            <input
              type="url"
              value={websiteInput}
              onChange={(event) => setWebsiteInput(event.target.value)}
              placeholder="https://tusitioweb.com"
              className="mt-1 min-h-10 w-full rounded-lg border border-[var(--color-bg-elevated)] bg-[var(--color-bg-primary)] px-2.5 py-1.5 text-xs font-normal text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
            />
          </label>
          <label className="block text-[11px] font-semibold text-[var(--color-text-primary)]">
            Instagram (@usuario o URL)
            <input
              type="text"
              value={instagramInput}
              onChange={(event) => setInstagramInput(event.target.value)}
              placeholder="@gimnasio_medellin"
              className="mt-1 min-h-10 w-full rounded-lg border border-[var(--color-bg-elevated)] bg-[var(--color-bg-primary)] px-2.5 py-1.5 text-xs font-normal text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
            />
          </label>
          {error && (
            <p role="alert" className="text-[11px] text-[var(--color-accent-danger)]">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="min-h-9 rounded-lg bg-[var(--color-accent)] px-3 py-1 text-xs font-semibold text-white hover:brightness-110 disabled:opacity-60"
            >
              {saving ? 'Guardando...' : 'Guardar enlace'}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="min-h-9 rounded-lg bg-[var(--color-bg-elevated)] px-3 py-1 text-xs font-semibold text-[var(--color-text-primary)]"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
