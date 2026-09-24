import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getEnv } from '../config/env';

let client: SupabaseClient | null = null;

export function db() {
  if (!client) {
    const env = getEnv();
    client = createClient(env.supabaseUrl, env.supabaseSecretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
