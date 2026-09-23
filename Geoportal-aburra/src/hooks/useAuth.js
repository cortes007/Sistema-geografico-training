import { useContext } from 'react';
import { AuthContext } from '../context/authContext';
import { supabase } from '../lib/supabaseClient';

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider.');
  }

  const { session, user, loading } = context;

  const signIn = async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  };

  const signUp = async ({ email, password, nombreUsuario, nombreCompleto }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nombre_usuario: nombreUsuario,
          nombre_completo: nombreCompleto,
        },
      },
    });

    return { data, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  return { session, user, loading, signIn, signUp, signOut };
}
