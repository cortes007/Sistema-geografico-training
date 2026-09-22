import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

function getRequiredEnv(name: 'VITE_SUPABASE_URL' | 'VITE_SUPABASE_ANON_KEY'): string {
  const value = import.meta.env[name]?.trim();
  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}.`);
  }
  return value;
}

export const supabase: SupabaseClient<Database> = createClient<Database>(
  getRequiredEnv('VITE_SUPABASE_URL'),
  getRequiredEnv('VITE_SUPABASE_ANON_KEY'),
);