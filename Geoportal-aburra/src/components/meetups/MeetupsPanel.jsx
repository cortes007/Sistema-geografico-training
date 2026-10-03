import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import {
  actualizarEvento,
  cancelarAsistencia,
  confirmarAsistencia,
  crearEvento,
  eliminarEvento,
  listarEventosPorSpot,
  usuarioEstaInscrito,
} from '../../services/eventosService';

const emptyForm = { titulo: '', descripcion: '', fechaHoraInicio: '', fechaHoraFin: '' };

function EventForm({ spotId, initialValues = emptyForm, onSaved, onCancel, eventId }) {
  const [form, setForm] = useState(initialValues);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (form.fechaHoraFin && new Date(form.fechaHoraFin) <= new Date(form.fechaHoraInicio)) {
      setError('La fecha de finalización debe ser posterior a la de inicio.');
      return;
    }
    setSaving(true);
    try {
      if (eventId) {
        await actualizarEvento(eventId, form);
      } else {
        await crearEvento({ ...form, trainingSpotId: spotId });
      }
      onSaved();
    } catch (submitError) {
      setError(submitError.message || 'No se pudo guardar la quedada.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-3 space-y-2 rounded-xl border border-[var(--color-accent-primary)]/30 bg-[var(--color-accent-primary)]/10 p-3">
      {['titulo', 'descripcion', 'fechaHoraInicio', 'fechaHoraFin'].map((name) => (
        <label key={name} className="block text-xs font-semibold text-[var(--color-text-primary)]">
          {name === 'titulo' ? 'Título' : name === 'descripcion' ? 'Descripción' : name === 'fechaHoraInicio' ? 'Inicio' : 'Fin'}
          {name === 'descripcion' ? (
            <textarea name={name} value={form[name]} onChange={update} rows={2} className="mt-1 w-full rounded-lg border border-[var(--color-bg-elevated)] bg-[var(--color-bg-primary)] px-2 py-1.5 font-normal text-[var(--color-text-primary)] outline-none transition-all duration-200 focus:border-[var(--color-accent-primary)]" />
          ) : (
            <input name={name} type={name.startsWith('fecha') ? 'datetime-local' : 'text'} required={name !== 'descripcion' && name !== 'fechaHoraFin'} value={form[name]} onChange={update} className="mt-1 w-full rounded-lg border border-[var(--color-bg-elevated)] bg-[var(--color-bg-primary)] px-2 py-1.5 font-normal text-[var(--color-text-primary)] outline-none transition-all duration-200 focus:border-[var(--color-accent-primary)]" />
          )}
        </label>
      ))}
      {error && <p role="alert" className="rounded-lg bg-[var(--color-accent-danger)]/20 p-2 text-xs text-[var(--color-accent-danger)]">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="rounded-lg bg-[var(--color-accent-primary)] px-3 py-2 text-xs font-semibold text-white transition-all duration-200 hover:bg-[var(--color-accent-secondary)] disabled:opacity-60">{saving ? 'Guardando...' : 'Guardar'}</button>
        <button type="button" onClick={onCancel} className="rounded-lg bg-[var(--color-bg-elevated)] px-3 py-2 text-xs font-semibold text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg-secondary)]">Cancelar</button>
      </div>
    </form>
  );
}

function EventCard({ event, user, onChange }) {
  const [registered, setRegistered] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    let active = true;
    if (!user) return undefined;
    usuarioEstaInscrito(event.id).then((value) => active && setRegistered(value)).catch((reason) => active && setError(reason.message));
    return () => { active = false; };
  }, [event.id, user]);

  const toggleAttendance = async () => {
    setBusy(true);
    setError('');
    try {
      if (registered) await cancelarAsistencia(event.id);
      else await confirmarAsistencia(event.id);
      setRegistered((value) => !value);
      onChange();
    } catch (reason) {
      setError(reason.message || 'No se pudo actualizar la asistencia.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm('¿Eliminar esta quedada?')) return;
    try {
      await eliminarEvento(event.id);
      onChange();
    } catch (reason) {
      setError(reason.message || 'No se pudo eliminar la quedada.');
    }
  };

  const isOrganizer = user?.id === event.organizadorId;
  return (
    <article className="rounded-xl border border-[var(--color-bg-elevated)] bg-[var(--color-bg-secondary)] p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="font-semibold text-[var(--color-text-primary)]">{event.titulo}</h4>
          <p className="text-xs text-[var(--color-text-secondary)]">{new Date(event.fechaHoraInicio).toLocaleString()}</p>
        </div>
        {isOrganizer && <span className="rounded-full bg-[var(--color-accent-warning)]/20 px-2 py-1 text-[10px] font-semibold text-[var(--color-accent-warning)]">Eres el organizador</span>}
      </div>
      {event.descripcion && <p className="mt-2 text-xs text-[var(--color-text-secondary)]">{event.descripcion}</p>}
      <p className="mt-2 text-xs text-[var(--color-text-secondary)]">{event.asistentesConfirmados} asistentes</p>
      {user && <button type="button" onClick={toggleAttendance} disabled={busy} className="mt-2 rounded-lg bg-[var(--color-accent-success)] px-3 py-2 text-xs font-semibold text-white transition-all duration-200 hover:bg-[var(--color-accent-primary)] disabled:opacity-60">{registered ? 'Cancelar asistencia' : 'Confirmar asistencia'}</button>}
      {isOrganizer && (
        <div className="mt-2 flex gap-2">
          <button type="button" onClick={() => setEditing((value) => !value)} className="text-xs font-semibold text-[var(--color-accent-primary)] hover:text-[var(--color-accent-secondary)]">Editar</button>
          <button type="button" onClick={remove} className="text-xs font-semibold text-[var(--color-accent-danger)] hover:text-red-400">Eliminar</button>
        </div>
      )}
      {editing && <EventForm eventId={event.id} initialValues={{ titulo: event.titulo, descripcion: event.descripcion || '', fechaHoraInicio: event.fechaHoraInicio.slice(0, 16), fechaHoraFin: event.fechaHoraFin?.slice(0, 16) || '' }} onSaved={() => { setEditing(false); onChange(); }} onCancel={() => setEditing(false)} />}
      {error && <p role="alert" className="mt-2 text-xs text-[var(--color-accent-danger)]">{error}</p>}
    </article>
  );
}

export default function MeetupsPanel({ spotId }) {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setEvents(await listarEventosPorSpot(spotId));
      setError('');
    } catch (reason) {
      setError(reason.message || 'No se pudieron cargar las quedadas.');
    } finally {
      setLoading(false);
    }
  }, [spotId]);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  return (
    <section className="mt-4 border-t border-[var(--color-bg-elevated)] pt-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold text-[var(--color-text-primary)]">Quedadas próximas</h3>
        {user && <button type="button" onClick={() => setCreating((value) => !value)} className="rounded-lg bg-[var(--color-accent-primary)] px-2.5 py-1.5 text-xs font-semibold text-white transition-all duration-200 hover:bg-[var(--color-accent-secondary)]">Crear quedada aquí</button>}
      </div>
      {creating && <EventForm spotId={spotId} onSaved={() => { setCreating(false); load(); }} onCancel={() => setCreating(false)} />}
      {loading && <p className="mt-3 text-xs text-[var(--color-text-secondary)]">Cargando quedadas...</p>}
      {error && <p role="alert" className="mt-3 rounded-lg bg-[var(--color-accent-danger)]/20 p-2 text-xs text-[var(--color-accent-danger)]">{error}</p>}
      {!loading && !error && events.length === 0 && <p className="mt-3 text-xs text-[var(--color-text-secondary)]">No hay quedadas próximas en este lugar.</p>}
      <div className="mt-3 space-y-2">{events.map((event) => <EventCard key={event.id} event={event} user={user} onChange={load} />)}</div>
    </section>
  );
}
