// Supabase client configuration
import '../config/env';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let cachedSupabase: SupabaseClient | null = null;

export function getSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('SUPABASE_URL e SUPABASE_ANON_KEY precisam estar configuradas');
  }

  if (!cachedSupabase) {
    cachedSupabase = createClient(supabaseUrl, supabaseAnonKey);
  }

  return cachedSupabase;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, property) {
    return (getSupabase() as any)[property];
  },
});
