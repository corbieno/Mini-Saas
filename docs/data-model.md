# Data Model

| Table | Purpose | Key columns |
| --- | --- | --- |
| `creators` | Registered sellers | `id`, `user_id` (→ `auth.users`), `workspace_name`, `contact_email`, `status`, `country`, `stripe_account_id`, `charges_enabled`, `payouts_enabled`, `details_submitted`, `created_at` |
| `apps` | Marketplace listings | `id`, `creator_id`, `title`, `slug`, `category`, `summary`, `description`, `pricing_model`, `price`, `status`, `featured`, `tags`, `created_at` |
| `installs` | Buyer subscriptions/install events | `id`, `app_id`, `buyer_company`, `buyer_email`, `plan`, `status`, `renewal_date` |
| `payouts` | Ledger of creator payouts | `id`, `creator_id`, `amount`, `currency`, `payout_date`, `stripe_transfer_id` |
| `webhook_events` | Stripe webhook log (idempotent by Stripe event id) | `id` (Stripe event id), `event_type`, `payload`, `processed` |

Creator `status` values: `pending` (no Connect account), `onboarding` (Account Link in progress), `active` (charges enabled), `approved` (seed/demo storefronts).

App `status` values: `draft` (creator-only), `approved` / `published` (public marketplace).

## Relationships
- `auth.users.id` → `creators.user_id`
- `creators.id` → `apps.creator_id`
- `apps.id` → `installs.app_id`
- `creators.id` → `payouts.creator_id`

Indexes on `apps.slug`, `apps.status`, `apps.category`, `installs.status`, `payouts.payout_date`, and `creators.stripe_account_id`.

## RLS (summary)
- **Public / anon**: read `apps` with status `approved` or `published`; read `creators` with status `approved` or `active`.
- **Authenticated creators**: full read/write on their own `creators` row and `apps`; read `installs` for their apps and their own `payouts`.
- **`webhook_events`**: no anon/authenticated policies (service role only).
- New auth users get a `creators` row via `handle_new_user`.

## API Surface
- `GET /api/apps` – list + filters (`q`, `category`, `featured`, `status`)
- `POST /api/apps` – create a listing (signed-in creator)
- `GET /api/creator/metrics` – dashboard stats via `creator_metrics()` RPC plus apps/installs/payouts
- `GET /api/creator/onboarding` – current creator + live Stripe account sync
- `POST /api/creator/onboarding` – save studio details and/or create a Stripe Connect Express Account Link
- `POST /api/stripe/webhook` – verify signatures, persist events, update Connect status
