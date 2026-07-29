// Supabase client configuration
import { createClient } from '@supabase/supabase-js';

const runtimeEnv =
  typeof import.meta !== 'undefined' && import.meta.env
    ? import.meta.env
    : process.env;

const supabaseUrl = runtimeEnv.SUPABASE_URL || runtimeEnv.VITE_SUPABASE_URL;
const supabaseAnonKey = runtimeEnv.SUPABASE_ANON_KEY || runtimeEnv.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl!, supabaseAnonKey!);
