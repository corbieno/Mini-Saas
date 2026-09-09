import { NextResponse } from "next/server";
import { ensureCreatorForUser, getAuthUser, getCreatorForUser, refreshCreatorStripeStatus } from "@/lib/data/creators";
import { getSiteUrl, isStripeConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStripeClient } from "@/lib/stripe";

async function loadCreator() {
  const user = await getAuthUser();
  if (!user) {
    return { user: null, creator: null };
  }

  const creator = (await getCreatorForUser(user.id)) ?? (await ensureCreatorForUser(user));
  return { user, creator };
}

export async function GET() {
  const { user, creator } = await loadCreator();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  if (!creator) {
    return NextResponse.json({ error: "Could not load creator profile" }, { status: 500 });
  }

  const synced = await refreshCreatorStripeStatus(creator);
  return NextResponse.json({ creator: synced });
}

export async function POST(request: Request) {
  const { user, creator } = await loadCreator();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  if (!creator) {
    return NextResponse.json({ error: "Could not load creator profile" }, { status: 500 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const workspaceName =
    typeof body.workspace_name === "string" && body.workspace_name.trim()
      ? body.workspace_name.trim()
      : creator.workspace_name;
  const contactEmail =
    typeof body.contact_email === "string" && body.contact_email.trim()
      ? body.contact_email.trim()
      : creator.contact_email || user.email || "";
  const country =
    typeof body.country === "string" && body.country.trim()
      ? body.country.trim().toUpperCase()
      : creator.country;
  const connect = body.connect !== false;

  if (connect && !workspaceName) {
    return NextResponse.json({ error: "Workspace name is required" }, { status: 400 });
  }

  const { data: updated, error: updateError } = await supabase
    .from("creators")
    .update({
      workspace_name: workspaceName,
      contact_email: contactEmail,
      country,
    })
    .eq("id", creator.id)
    .select("*")
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  if (!connect) {
    return NextResponse.json({ creator: updated, url: null });
  }

  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
  }

  if (!country) {
    return NextResponse.json({ error: "Business country is required before connecting Stripe" }, { status: 400 });
  }

  try {
    const stripe = getStripeClient();
    let accountId = updated.stripe_account_id as string | null;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country,
        email: contactEmail,
        metadata: {
          creator_id: updated.id,
          user_id: user.id,
        },
      });
      accountId = account.id;

      const { error: stripeUpdateError } = await supabase
        .from("creators")
        .update({
          stripe_account_id: accountId,
          status: "onboarding",
        })
        .eq("id", updated.id);

      if (stripeUpdateError) {
        return NextResponse.json({ error: stripeUpdateError.message }, { status: 400 });
      }
    }

    const siteUrl = getSiteUrl(request);
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${siteUrl}/onboarding?stripe=refresh`,
      return_url: `${siteUrl}/onboarding?stripe=return`,
      type: "account_onboarding",
    });

    return NextResponse.json({
      url: accountLink.url,
      creator: { ...updated, stripe_account_id: accountId, status: "onboarding" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to start Stripe Connect onboarding";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
