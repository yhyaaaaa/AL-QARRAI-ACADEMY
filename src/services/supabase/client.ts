import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/** null when the frontend has no Supabase configuration — the app then shows a setup error, never a fake mode. */
export const supabase: SupabaseClient | null = env.supabaseConfigured
  ? createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce",
      },
    })
  : null;

export function requireSupabase(): SupabaseClient {
  if (!supabase)
    throw new Error("Supabase is not configured (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).");
  return supabase;
}
