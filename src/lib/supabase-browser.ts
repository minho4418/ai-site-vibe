"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigured } from "./env";

let cached: SupabaseClient<Database> | null = null;

export function getSupabaseBrowser(): SupabaseClient<Database> | null {
  if (!supabaseConfigured) return null;
  if (cached) return cached;
  cached = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
