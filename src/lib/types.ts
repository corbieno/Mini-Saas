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

export const MARKETPLACE_FILTERS = ["All", "Sales", "Marketing", "Operations", "Finance", "Inbox"] as const;
