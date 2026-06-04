"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigured } from "./env";

let cached: SupabaseClient | null = null;

export function getSupabaseBrowser(): SupabaseClient | null {
  if (!supabaseConfigured) return null;
  if (cached) return cached;
  cached = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
