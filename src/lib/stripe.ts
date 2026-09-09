import Stripe from "stripe";

let cachedStripe: Stripe | null = null;

export function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }

  if (!cachedStripe) {
    cachedStripe = new Stripe(secretKey, {
      appInfo: {
        name: "Mini SaaS",
      },
    });
  }

  return cachedStripe;
}

export function creatorStatusFromStripeAccount(account: Stripe.Account) {
  if (account.charges_enabled && account.details_submitted) {
    return "active";
  }

  if (account.details_submitted || account.payouts_enabled) {
    return "onboarding";
  }

  return "pending";
}

export function stripeFieldsFromAccount(account: Stripe.Account) {
  return {
    stripe_account_id: account.id,
    charges_enabled: Boolean(account.charges_enabled),
    payouts_enabled: Boolean(account.payouts_enabled),
    details_submitted: Boolean(account.details_submitted),
    status: creatorStatusFromStripeAccount(account),
  };
}
