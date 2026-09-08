import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStripeClient, stripeFieldsFromAccount } from "@/lib/stripe";
import { isStripeConfigured } from "@/lib/env";
import type { Creator, CreatorMetrics, Install, Payout } from "@/lib/types";

const EMPTY_METRICS: CreatorMetrics = {
  mrr: 0,
  active_installs: 0,
  cancelled_installs: 0,
  churn_rate: 0,
  apps_count: 0,
  next_payout: null,
};

export async function getAuthUser() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function getCreatorForUser(userId: string): Promise<Creator | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.from("creators").select("*").eq("user_id", userId).maybeSingle();
  if (error) {
    console.warn("Failed to load creator", error.message);
    return null;
  }

  return (data as Creator | null) ?? null;
}

export async function ensureCreatorForUser(user: User): Promise<Creator | null> {
  const existing = await getCreatorForUser(user.id);
  if (existing) {
    return existing;
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const workspaceName =
    (typeof user.user_metadata?.workspace_name === "string" && user.user_metadata.workspace_name) ||
    user.email?.split("@")[0] ||
    "Studio";

  const { data, error } = await supabase
    .from("creators")
    .insert({
      user_id: user.id,
      workspace_name: workspaceName,
      contact_email: user.email ?? "",
      status: "pending",
    })
    .select("*")
    .single();

  if (error) {
    console.warn("Failed to create creator profile", error.message);
    return getCreatorForUser(user.id);
  }

  return data as Creator;
}

export async function refreshCreatorStripeStatus(creator: Creator): Promise<Creator> {
  if (!creator.stripe_account_id || !isStripeConfigured()) {
    return creator;
  }

  try {
    const account = await getStripeClient().accounts.retrieve(creator.stripe_account_id);
    const fields = stripeFieldsFromAccount(account);
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      await supabase.from("creators").update(fields).eq("id", creator.id);
    }
    return { ...creator, ...fields };
  } catch (error) {
    console.warn("Stripe account sync failed", error);
    return creator;
  }
}

export async function getCreatorMetrics(): Promise<CreatorMetrics> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return EMPTY_METRICS;
  }

  const { data, error } = await supabase.rpc("creator_metrics");
  if (error) {
    console.warn("Failed to load creator metrics", error.message);
    return EMPTY_METRICS;
  }

  const metrics = (data ?? {}) as Partial<CreatorMetrics>;
  return {
    ...EMPTY_METRICS,
    ...metrics,
    mrr: Number(metrics.mrr ?? 0),
    active_installs: Number(metrics.active_installs ?? 0),
    cancelled_installs: Number(metrics.cancelled_installs ?? 0),
    churn_rate: Number(metrics.churn_rate ?? 0),
    apps_count: Number(metrics.apps_count ?? 0),
  };
}

export async function listCreatorInstalls(creatorId: string): Promise<Install[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return [];
  }

  const { data: apps, error: appsError } = await supabase.from("apps").select("id").eq("creator_id", creatorId);
  if (appsError) {
    console.warn("Failed to load creator apps for installs", appsError.message);
    return [];
  }

  const appIds = (apps ?? []).map((app) => app.id);
  if (appIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("installs")
    .select("id, app_id, buyer_company, buyer_email, plan, status, renewal_date, created_at, apps ( title, slug )")
    .in("app_id", appIds)
    .order("created_at", { ascending: false })
    .limit(12);

  if (error) {
    console.warn("Failed to load installs", error.message);
    return [];
  }

  return (data ?? []) as Install[];
}

export async function listCreatorPayouts(creatorId: string): Promise<Payout[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("payouts")
    .select("*")
    .eq("creator_id", creatorId)
    .order("payout_date", { ascending: false })
    .limit(8);

  if (error) {
    console.warn("Failed to load payouts", error.message);
    return [];
  }

  return ((data ?? []) as Payout[]).map((payout) => ({
    ...payout,
    amount: Number(payout.amount),
  }));
}

export function installAppTitle(install: Install) {
  if (!install.apps) {
    return "App";
  }

  return Array.isArray(install.apps) ? install.apps[0]?.title ?? "App" : install.apps.title;
}
