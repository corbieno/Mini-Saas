import type Stripe from "stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { stripeFieldsFromAccount } from "@/lib/stripe";

export async function syncCreatorFromStripeAccount(account: Stripe.Account) {
  const admin = createSupabaseAdminClient();
  const fields = stripeFieldsFromAccount(account);
  const creatorId = typeof account.metadata?.creator_id === "string" ? account.metadata.creator_id : null;

  if (creatorId) {
    const { error } = await admin.from("creators").update(fields).eq("id", creatorId);
    if (!error) {
      return;
    }
  }

  await admin.from("creators").update(fields).eq("stripe_account_id", account.id);
}

export async function clearCreatorStripeAccount(accountId: string) {
  const admin = createSupabaseAdminClient();
  await admin
    .from("creators")
    .update({
      stripe_account_id: null,
      charges_enabled: false,
      payouts_enabled: false,
      details_submitted: false,
      status: "pending",
    })
    .eq("stripe_account_id", accountId);
}
