import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Only public values may reach the frontend: the project URL and the
// publishable (or legacy anon) key. Never the service_role key.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

let client: SupabaseClient<Database> | null = null;

/**
 * Browser-side Supabase client. The site is a static export, so there is no
 * server session: auth uses the PKCE flow and keeps the session in localStorage.
 * Call it only from client components (e.g. inside effects or event handlers).
 */
export function getSupabase(): SupabaseClient<Database> {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }
  client ??= createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      flowType: "pkce",
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return client;
}

/** Pings the Auth health endpoint to check that URL and key are valid. */
export async function checkSupabaseConnection(): Promise<boolean> {
  if (!supabaseUrl || !supabaseKey) return false;
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/health`, {
      headers: { apikey: supabaseKey },
    });
    return res.ok;
  } catch {
    return false;
  }
}
