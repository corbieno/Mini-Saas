# Data Model

| Table | Purpose | Key columns |
| --- | --- | --- |
| `creators` | Registered sellers | `id`, `user_id` (→ `auth.users`), `workspace_name`, `contact_email`, `status`, `country`, `stripe_account_id`, `charges_enabled`, `payouts_enabled`, `details_submitted`, `created_at` |
| `apps` | Marketplace listings | `id`, `creator_id`, `title`, `slug`, `category`, `summary`, `description`, `pricing_model`, `price`, `status`, `featured`, `tags`, `created_at` |
| `installs` | Buyer subscriptions/install events | `id`, `app_id`, `buyer_company`, `buyer_email`, `plan`, `status`, `renewal_date` |
| `payouts` | Ledger of creator payouts | `id`, `creator_id`, `amount`, `currency`, `payout_date`, `stripe_transfer_id` |
| `webhook_events` | Stripe webhook log (idempotent by Stripe event id) | `id` (Stripe event id), `event_type`, `payload`, `processed` |
| `creator_collaboration_settings` | Per-creator opt-in for collaboration suggestions. Default is off. | `creator_id`, `suggestions_enabled`, `updated_at` |
| `collaboration_requests` | A request between two listings. Nothing is linked until `status = accepted`. | `requester_creator_id`, `recipient_creator_id`, `requester_app_id`, `recipient_app_id`, `message`, `status` |
| `collaboration_credits` | Public “Built in collaboration with …” line for an accepted pair. No email or message. | `app_id`, `collaboration_request_id`, `partner_name` |
| `collaboration_contacts` | Partner name and email, readable only by `owner_creator_id` while the request is accepted. | `collaboration_request_id`, `owner_creator_id`, `partner_email` |

Creator `status` values: `pending` (no Connect account), `onboarding` (Account Link in progress), `active` (charges enabled), `approved` (seed/demo storefronts).

App `status` values: `draft` (creator-only), `approved` / `published` (public marketplace).

## Relationships
- `auth.users.id` → `creators.user_id`
- `creators.id` → `apps.creator_id`
- `apps.id` → `installs.app_id`
- `creators.id` → `payouts.creator_id`
- `creators.id` → `creator_collaboration_settings.creator_id`
- `creators.id` / `apps.id` → `collaboration_requests` (requester and recipient)
- Accepted requests maintain `collaboration_credits` (public name) and `collaboration_contacts` (private email)

Collaboration request `status`: `pending`, `accepted`, `declined`, `withdrawn`, `ended`.

### Collaboration matching

Suggestions compare a creator's own draft or published listing with another creator's published listing. A pair matches when any of these is true:

1. Same category and at least one shared tag or meaningful word.
2. At least two shared tags.
3. At least three shared meaningful words.

A meaningful word is a lowercase run of letters or digits, at least four characters, with a small stop-word list removed. The same check lives in `src/lib/collaboration/similarity.ts` and `private.listings_are_similar`.

### Collaboration consent

- Suggestions are off until a creator opts in. Opting out declines pending incoming requests, withdraws pending outgoing requests, and blocks new ones. Active collaborations stay until someone ends them.
- A request can be sent only when both creators are opted in, the sender owns the source listing, the target listing is published, and the listings are similar.
- The recipient accepts or declines. Withdraw is requester-only while pending. Either participant can end an accepted collaboration.
- Contact email is copied into `collaboration_contacts` only after acceptance. Public pages only read `collaboration_credits`.
- **TODO(revenue-sharing):** acceptance does not change Stripe Connect payouts. Each listing still pays its own creator.

Indexes on `apps.slug`, `apps.status`, `apps.category`, `installs.status`, `payouts.payout_date`, and `creators.stripe_account_id`.

## RLS (summary)
- **Public / anon**: read `apps` with status `approved` or `published`; read `creators` with status `approved` or `active`.
- **Authenticated creators**: full read/write on their own `creators` row and `apps`; read `installs` for their apps and their own `payouts`.
- **`webhook_events`**: no anon/authenticated policies (service role only).
- **`creator_collaboration_settings`**: authenticated users can read the opt-in flag (so suggestions can skip opted-out creators) and insert/update only their own row.
- **`collaboration_requests`**: select/update only if the caller is the requester or recipient. Insert only as yourself, status `pending`, against a published listing owned by an opted-in creator. Status changes are checked again by `private.enforce_collaboration_request_update` (accept is recipient-only, withdraw is requester-only, end is either participant, and both must still be opted in to accept).
- **`collaboration_credits`**: public read. No write policies; rows are maintained when a request is accepted or ended.
- **`collaboration_contacts`**: a creator can read only rows where they are `owner_creator_id`.
- New auth users get a `creators` row via `handle_new_user`, which also creates a collaboration settings row (suggestions off).

## API Surface
- `GET /api/apps` – list + filters (`q`, `category`, `featured`, `status`). `category` accepts workflow values (`Sales Ops`, `Marketing`, …) and provider chips (`Grok`, `Claude`, `OpenAI`); providers match `apps.tags`.
- `POST /api/apps` – create a listing (signed-in creator)
- `GET /api/creator/metrics` – dashboard stats via `creator_metrics()` RPC plus apps/installs/payouts
- `GET /api/creator/onboarding` – current creator + live Stripe account sync
- `POST /api/creator/onboarding` – save studio details and/or create a Stripe Connect Express Account Link
- `POST /api/stripe/webhook` – verify signatures, persist events, update Connect status
- `GET /api/creator/collaborations` – suggestions, incoming, outgoing, active, and the opt-in flag
- `POST /api/creator/collaborations` – request collaboration on a similar published listing
- `PATCH /api/creator/collaborations/settings` – opt in or opt out
- `POST /api/creator/collaborations/:id` – `accept`, `decline`, `withdraw`, or `end`
