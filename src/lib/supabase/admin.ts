import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicEnv, getSupabaseServiceKey } from "@/lib/env";

let cachedAdminClient: SupabaseClient | null = null;

export function createSupabaseAdminClient() {
  const env = getSupabasePublicEnv();
  const serviceKey = getSupabaseServiceKey();

  if (!env || !serviceKey) {
    throw new Error("Missing Supabase admin env vars.");
  }

  if (!cachedAdminClient) {
    cachedAdminClient = createClient(env.url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  return cachedAdminClient;
}

export function isSupabaseAdminConfigured() {
  return Boolean(getSupabasePublicEnv() && getSupabaseServiceKey());
}
