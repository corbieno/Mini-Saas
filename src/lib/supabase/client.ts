import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicEnv } from "@/lib/env";

export function getSupabaseBrowserClient() {
  const env = getSupabasePublicEnv();

  if (!env) {
    throw new Error("Missing Supabase browser env vars.");
  }

  return createBrowserClient(env.url, env.anonKey);
}
