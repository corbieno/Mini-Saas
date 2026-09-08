# Data Model Sketch

| Table | Purpose | Key columns |
| --- | --- | --- |
| `creators` | Registered sellers | `id`, `workspace_name`, `contact_email`, `status`, `stripe_account_id`, `created_at` |
| `apps` | Marketplace listings | `id`, `creator_id`, `title`, `slug`, `category`, `summary`, `pricing_model`, `price`, `status`, `featured`, `created_at` |
| `installs` | Buyer subscriptions/install events | `id`, `app_id`, `buyer_company`, `buyer_email`, `plan`, `status`, `renewal_date` |
| `payouts` | Ledger of creator payouts | `id`, `creator_id`, `amount`, `currency`, `payout_date`, `stripe_transfer_id` |
| `webhook_events` | Stripe + other webhook logs | `id`, `event_type`, `payload`, `processed` |

## Relationships
- `creators.id` → `apps.creator_id`
- `apps.id` → `installs.app_id`
- `creators.id` → `payouts.creator_id`

Indexes recommended on `apps.slug`, `apps.status`, `installs.status`, and `payouts.payout_date`.

## API Surface (draft)
- `GET /api/apps` – list + filters
- `POST /api/apps` – create app (creator only)
- `POST /api/stripe/webhook` – handle Connect events
- `POST /api/creator/onboarding` – begin Connect onboarding link
- `GET /api/creator/metrics` – dashboard stats via Supabase RPC
