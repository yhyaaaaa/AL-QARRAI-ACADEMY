/**
 * Public (browser) configuration. Only VITE_* variables are available here.
 * The anon key is public by design; every table is protected by Row Level Security.
 */
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? "").trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? "").trim();

export const env = {
  supabaseUrl,
  supabaseAnonKey,
  supabaseConfigured: supabaseUrl.length > 0 && supabaseAnonKey.length > 0,
};
