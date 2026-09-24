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
    <form onSubmit={submit} className="mt-3 space-y-2 rounded-xl border border-blue-100 bg-blue-50 p-3">
      {['titulo', 'descripcion', 'fechaHoraInicio', 'fechaHoraFin'].map((name) => (
        <label key={name} className="block text-xs font-semibold text-slate-700">
          {name === 'titulo' ? 'Título' : name === 'descripcion' ? 'Descripción' : name === 'fechaHoraInicio' ? 'Inicio' : 'Fin'}
          {name === 'descripcion' ? (
            <textarea name={name} value={form[name]} onChange={update} rows={2} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 font-normal" />
          ) : (
            <input name={name} type={name.startsWith('fecha') ? 'datetime-local' : 'text'} required={name !== 'descripcion' && name !== 'fechaHoraFin'} value={form[name]} onChange={update} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 font-normal" />
          )}
        </label>
      ))}
      {error && <p role="alert" className="rounded-lg bg-red-50 p-2 text-xs text-red-700">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">{saving ? 'Guardando...' : 'Guardar'}</button>
        <button type="button" onClick={onCancel} className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-600">Cancelar</button>
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
    <article className="rounded-xl border border-slate-200 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="font-semibold text-slate-800">{event.titulo}</h4>
          <p className="text-xs text-slate-500">{new Date(event.fechaHoraInicio).toLocaleString()}</p>
        </div>
        {isOrganizer && <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-semibold text-amber-800">Eres el organizador</span>}
      </div>
      {event.descripcion && <p className="mt-2 text-xs text-slate-600">{event.descripcion}</p>}
      <p className="mt-2 text-xs text-slate-500">{event.asistentesConfirmados} asistentes</p>
      {user && <button type="button" onClick={toggleAttendance} disabled={busy} className="mt-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">{registered ? 'Cancelar asistencia' : 'Confirmar asistencia'}</button>}
      {isOrganizer && (
        <div className="mt-2 flex gap-2">
          <button type="button" onClick={() => setEditing((value) => !value)} className="text-xs font-semibold text-blue-600">Editar</button>
          <button type="button" onClick={remove} className="text-xs font-semibold text-red-600">Eliminar</button>
        </div>
      )}
      {editing && <EventForm eventId={event.id} initialValues={{ titulo: event.titulo, descripcion: event.descripcion || '', fechaHoraInicio: event.fechaHoraInicio.slice(0, 16), fechaHoraFin: event.fechaHoraFin?.slice(0, 16) || '' }} onSaved={() => { setEditing(false); onChange(); }} onCancel={() => setEditing(false)} />}
      {error && <p role="alert" className="mt-2 text-xs text-red-600">{error}</p>}
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
    <section className="mt-4 border-t border-slate-200 pt-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold text-slate-800">Quedadas próximas</h3>
        {user && <button type="button" onClick={() => setCreating((value) => !value)} className="rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white">Crear quedada aquí</button>}
      </div>
      {creating && <EventForm spotId={spotId} onSaved={() => { setCreating(false); load(); }} onCancel={() => setCreating(false)} />}
      {loading && <p className="mt-3 text-xs text-slate-500">Cargando quedadas...</p>}
      {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-2 text-xs text-red-700">{error}</p>}
      {!loading && !error && events.length === 0 && <p className="mt-3 text-xs text-slate-500">No hay quedadas próximas en este lugar.</p>}
      <div className="mt-3 space-y-2">{events.map((event) => <EventCard key={event.id} event={event} user={user} onChange={load} />)}</div>
    </section>
  );
}
