// Supabase client configuration
import '../config/env';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let cachedSupabase: SupabaseClient | null = null;
let cachedSupabaseAdmin: SupabaseClient | null = null;

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

export function getSupabaseAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY precisam estar configuradas');
  }

  if (!cachedSupabaseAdmin) {
    cachedSupabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
  }

  return cachedSupabaseAdmin;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, property) {
    return (getSupabase() as any)[property];
  },
});
