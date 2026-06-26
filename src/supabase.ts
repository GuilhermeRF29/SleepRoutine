import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Expose a flag to determine if Supabase environment variables are set
export const isSupabaseConfigured = !!supabaseUrl && !!supabaseAnonKey;

// Initialize client only if variables are present to avoid startup crashes
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
