import { useState } from 'react';
import { LogIn, LogOut, UserPlus, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

function getAuthMessage(error) {
  if (!error) return '';
  if (error.message.includes('Invalid login credentials')) return 'El correo o la contraseña no son correctos.';
  if (error.message.includes('User already registered')) return 'Ya existe una cuenta con este correo.';
  if (error.message.includes('Password should be at least')) return 'La contraseña debe tener al menos seis caracteres.';
  if (error.message.includes('Email not confirmed')) return 'Confirma tu correo electrónico antes de iniciar sesión.';
  return 'No fue posible completar la operación. Inténtalo de nuevo.';
}

function Field({ label, name, type = 'text', value, onChange, required = true }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold text-slate-700">{label}</span>
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        autoComplete={type === 'password' ? 'current-password' : name}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

function AuthForm({ mode, onClose, onChangeMode }) {
  const { signIn, signUp } = useAuth();
  const isRegister = mode === 'register';
  const [form, setForm] = useState({
    email: '',
    password: '',
    nombreUsuario: '',
    nombreCompleto: '',
  });
  const [status, setStatus] = useState({ loading: false, error: '', success: '' });

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus({ loading: true, error: '', success: '' });

    const result = isRegister
      ? await signUp(form)
      : await signIn({ email: form.email, password: form.password });

    if (result.error) {
      setStatus({ loading: false, error: getAuthMessage(result.error), success: '' });
      return;
    }

    if (isRegister && !result.data.session) {
      setStatus({
        loading: false,
        error: '',
        success: 'Cuenta creada. Revisa tu correo para confirmar el registro.',
      });
      return;
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section role="dialog" aria-modal="true" aria-labelledby="auth-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-blue-600">Geoportal deportivo</p>
            <h2 id="auth-title" className="text-xl font-bold text-slate-900">{isRegister ? 'Crear cuenta' : 'Iniciar sesión'}</h2>
            <p className="mt-1 text-sm text-slate-500">El mapa está disponible sin registro.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar autenticación" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <>
              <Field label="Nombre de usuario" name="nombreUsuario" value={form.nombreUsuario} onChange={updateField} />
              <Field label="Nombre completo" name="nombreCompleto" value={form.nombreCompleto} onChange={updateField} />
            </>
          )}
          <Field label="Correo electrónico" name="email" type="email" value={form.email} onChange={updateField} />
          <Field label="Contraseña" name="password" type="password" value={form.password} onChange={updateField} />

          {status.error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700">{status.error}</p>}
          {status.success && <p role="status" className="rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">{status.success}</p>}

          <button type="submit" disabled={status.loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60">
            {isRegister ? <UserPlus className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
            {status.loading ? 'Procesando...' : isRegister ? 'Crear cuenta' : 'Iniciar sesión'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">
          {isRegister ? '¿Ya tienes una cuenta?' : '¿Aún no tienes una cuenta?'}{' '}
          <button type="button" onClick={() => onChangeMode(isRegister ? 'login' : 'register')} className="font-semibold text-blue-600 hover:text-blue-700">
            {isRegister ? 'Inicia sesión' : 'Regístrate'}
          </button>
        </p>
      </section>
    </div>
  );
}

export default function AuthPanel() {
  const { user, loading, signOut } = useAuth();
  const [mode, setMode] = useState(null);

  if (loading) return null;

  if (user) {
    return (
      <div className="absolute right-4 top-4 z-30 flex items-center gap-2 rounded-xl bg-white/95 p-2 shadow-lg backdrop-blur-sm">
        <span className="max-w-40 truncate px-2 text-xs font-semibold text-slate-700" title={user.email}>{user.email}</span>
        <button type="button" onClick={signOut} aria-label="Cerrar sesión" title="Cerrar sesión" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900">
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="absolute right-4 top-4 z-30 flex gap-2 rounded-xl bg-white/95 p-2 shadow-lg backdrop-blur-sm">
        <button type="button" onClick={() => setMode('login')} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">
          <LogIn className="h-4 w-4" />
          Iniciar sesión
        </button>
        <button type="button" onClick={() => setMode('register')} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700">
          <UserPlus className="h-4 w-4" />
          Registrarse
        </button>
      </div>
      {mode && <AuthForm mode={mode} onClose={() => setMode(null)} onChangeMode={setMode} />}
    </>
  );
}
