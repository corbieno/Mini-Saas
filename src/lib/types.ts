export type CreatorStatus = "pending" | "onboarding" | "active" | "approved";

export type AppStatus = "draft" | "approved" | "published";

export type MarketplaceApp = {
  id: string;
  title: string;
  slug: string;
  category: string;
  summary: string | null;
  description: string | null;
  pricing_model: string;
  price: number | null;
  currency: string;
  status: string;
  featured: boolean;
  tags: string[];
  creator_id: string | null;
  creator_name: string | null;
};

export type Creator = {
  id: string;
  user_id: string | null;
  workspace_name: string;
  contact_email: string;
  status: string;
  country: string | null;
  stripe_account_id: string | null;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
  created_at?: string;
};

export type Install = {
  id: string;
  app_id: string;
  buyer_company: string | null;
  buyer_email: string | null;
  plan: string | null;
  status: string;
  renewal_date: string | null;
  created_at: string;
  apps?: { title: string; slug: string } | { title: string; slug: string }[] | null;
};

export type Payout = {
  id: string;
  creator_id: string;
  amount: number;
  currency: string;
  payout_date: string;
  stripe_transfer_id: string | null;
};

export type CreatorMetrics = {
  mrr: number;
  active_installs: number;
  cancelled_installs: number;
  churn_rate: number;
  apps_count: number;
  next_payout: {
    amount: number;
    currency: string;
    payout_date: string;
    stripe_transfer_id: string | null;
  } | null;
};

export const PUBLIC_APP_STATUSES = ["approved", "published"] as const;
export const LIVE_CREATOR_STATUSES = ["approved", "active"] as const;

export const APP_CATEGORIES = [
  "Sales Ops",
  "Marketing",
  "Operations",
  "Finance",
  "Inbox",
] as const;

/** First-class model ecosystems. Provider chips match this name in `apps.tags`. */
export const MARKETPLACE_PROVIDERS = ["Grok", "Claude", "OpenAI"] as const;

/**
 * Browse chips on `/apps`. Provider names come first so Grok / Claude / OpenAI
 * are first-class discovery, then workflow categories that match seed `category`
 * values exactly (including "Sales Ops" — not the old "Sales" chip).
 */
export const MARKETPLACE_FILTERS = ["All", ...MARKETPLACE_PROVIDERS, ...APP_CATEGORIES] as const;

export function isMarketplaceProvider(value: string): value is (typeof MARKETPLACE_PROVIDERS)[number] {
  return (MARKETPLACE_PROVIDERS as readonly string[]).includes(value);
}

export type CollaborationStatus = "pending" | "accepted" | "declined" | "withdrawn" | "ended";

export type CollaborationAction = "accept" | "decline" | "withdraw" | "end";

export type CollaborationSettings = {
  creator_id: string;
  suggestions_enabled: boolean;
};

export type CollaborationSuggestion = {
  requester_app_id: string;
  requester_app_title: string;
  requester_app_slug: string;
  recipient_app_id: string;
  recipient_app_title: string;
  recipient_app_slug: string;
  recipient_creator_id: string;
  recipient_name: string;
  score: number;
  reasons: string[];
};

export type CollaborationRequestView = {
  id: string;
  status: CollaborationStatus;
  message: string | null;
  created_at: string;
  responded_at: string | null;
  ended_at: string | null;
  requester_creator_id: string;
  recipient_creator_id: string;
  requester_app_id: string;
  recipient_app_id: string;
  requester_app_title: string;
  recipient_app_title: string;
  requester_name: string;
  recipient_name: string;
  requester_app_slug: string | null;
  recipient_app_slug: string | null;
};

export type ActiveCollaboration = CollaborationRequestView & {
  partner_name: string;
  partner_email: string | null;
  your_app_title: string;
  their_app_title: string;
  your_app_slug: string | null;
  their_app_slug: string | null;
};

export type CollaborationOverview = {
  creator_id: string;
  settings: CollaborationSettings;
  suggestions: CollaborationSuggestion[];
  incoming: CollaborationRequestView[];
  outgoing: CollaborationRequestView[];
  active: ActiveCollaboration[];
  past: CollaborationRequestView[];
};

export type CollaborationCredit = {
  app_id: string;
  collaboration_request_id: string;
  partner_creator_id: string;
  partner_name: string;
};
