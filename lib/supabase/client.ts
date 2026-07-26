// Supabase client configuration
import { createClient } from '@supabase/supabase-js';

const runtimeEnv =
  typeof import.meta !== 'undefined' && import.meta.env
    ? import.meta.env
    : process.env;

const supabaseUrl = runtimeEnv.NEXT_PUBLIC_SUPABASE_URL || runtimeEnv.VITE_SUPABASE_URL;
const supabaseAnonKey =
  runtimeEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY || runtimeEnv.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl!, supabaseAnonKey!);
