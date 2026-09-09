import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { getStripeClient } from "@/lib/stripe";
import { clearCreatorStripeAccount, syncCreatorFromStripeAccount } from "@/lib/data/stripe-connect";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function recordEvent(event: Stripe.Event) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("webhook_events").insert({
    id: event.id,
    event_type: event.type,
    payload: event as unknown as Record<string, unknown>,
    processed: false,
  });

  if (error?.code === "23505") {
    return { duplicate: true };
  }

  if (error) {
    throw error;
  }

  return { duplicate: false };
}

async function markProcessed(eventId: string) {
  const admin = createSupabaseAdminClient();
  await admin.from("webhook_events").update({ processed: true }).eq("id", eventId);
}

async function handleStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case "account.updated": {
      await syncCreatorFromStripeAccount(event.data.object as Stripe.Account);
      break;
    }
    case "capability.updated": {
      const capability = event.data.object as Stripe.Capability;
      if (capability.account) {
        const accountId = typeof capability.account === "string" ? capability.account : capability.account.id;
        const account = await getStripeClient().accounts.retrieve(accountId);
        await syncCreatorFromStripeAccount(account);
      }
      break;
    }
    case "account.application.deauthorized": {
      const accountId = event.account;
      if (accountId) {
        await clearCreatorStripeAccount(accountId);
      }
      break;
    }
    default:
      break;
  }
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Missing Stripe webhook setup" }, { status: 400 });
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: "Supabase admin client is not configured" }, { status: 503 });
  }

  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripeClient().webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error("Webhook signature error", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    const recorded = await recordEvent(event);
    if (recorded.duplicate) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    await handleStripeEvent(event);
    await markProcessed(event.id);
    return NextResponse.json({ received: true, type: event.type });
  } catch (error) {
    console.error("Webhook processing error", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
