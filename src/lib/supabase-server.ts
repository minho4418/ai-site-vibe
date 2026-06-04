import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigured } from "./env";

export function getSupabaseAnonServer(): SupabaseClient | null {
  if (!supabaseConfigured) return null;
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function getSupabaseServiceServer(): SupabaseClient {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY (and NEXT_PUBLIC_SUPABASE_URL) must be set for service-role operations.",
    );
  }
  return createClient(SUPABASE_URL, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
