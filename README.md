# Mini SaaS

Mini SaaS is a multi-surface Next.js 16 marketplace for showcasing and selling micro SaaS automations:

- **Marketing site** (`/`) with hero, category grid, value props, and CTA panel.
- **Marketplace browse + detail** (`/apps`, `/apps/[slug]`) backed by Supabase. The flagship workspace remains at `/apps/corbin-email-guru`.
- **Creator surfaces** (`/dashboard`, `/onboarding`) for listings, payouts, installs, and Stripe Connect.
- **Auth** (`/login`) with email + password and magic links via Supabase Auth.
- **API** for apps, creator metrics, Connect onboarding, and Stripe webhooks.

Built with **Next.js 16**, **TypeScript**, **Tailwind**, **shadcn/ui**, **framer-motion**, **Supabase**, and **Stripe Connect**.

## Getting Started

```bash
npm install
cp .env.example .env.local
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) for the marketing surface, or jump to:

- `/apps` – marketplace browse grid
- `/apps/corbin-email-guru` – flagship productivity app
- `/dashboard` – creator console (signed-in)
- `/onboarding` – Stripe Connect onboarding (signed-in)
- `/login` – sign in / sign up

## Environment Variables

Create `.env.local` from `.env.example`. Never commit secrets.

```
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Supabase → Project Settings → API
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=

# Stripe → Developers → API keys, Connect, Webhooks
STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

Notes:

- `SUPABASE_SERVICE_ROLE_KEY` is accepted as an alias of `SUPABASE_SERVICE_KEY`.
- `NEXT_PUBLIC_SITE_URL` is used for auth redirects and Stripe Account Link return/refresh URLs.
- In the Supabase dashboard, add `http://localhost:3000/auth/callback` (and your production URL) to **Authentication → URL Configuration → Redirect URLs**.
- For local password sign-in without clicking email links, disable **Confirm email** under **Authentication → Providers → Email**, or use the magic-link path.

## Apply schema and seed

In the Supabase SQL editor, run these files in order:

1. [`supabase/schema.sql`](supabase/schema.sql) — tables, indexes, RLS, signup trigger, `creator_metrics()` RPC
2. [`supabase/seed.sql`](supabase/seed.sql) — sample creators, apps, installs, and payouts

Both scripts are idempotent (`IF NOT EXISTS` / `ON CONFLICT`).

### Provider filters (Grok, Claude, OpenAI)

`/apps` chips now include **Grok**, **Claude**, and **OpenAI** in front of the workflow categories. Provider chips match the provider name in `apps.tags`; category chips match `apps.category` exactly (the old **Sales** chip is now **Sales Ops**, which is what the seed stores).

After pulling this change, re-run the seed so the new listings appear:

```bash
supabase db query -f supabase/seed.sql
```

Or paste [`supabase/seed.sql`](supabase/seed.sql) into the Supabase SQL editor. Existing rows upsert in place.

CLI equivalent if you use the Supabase CLI and are linked to a project:

```bash
supabase db query -f supabase/schema.sql
supabase db query -f supabase/seed.sql
```

Seed creators are storefront-only (no `auth.users` row). Signing up in the app creates a separate creator profile via the `handle_new_user` trigger.

## Test auth

1. Start the app with env vars set: `npm run dev`
2. Open `/dashboard` while signed out — you should land on `/login?next=/dashboard`
3. Create an account (email + password) or request a magic link
4. Confirm email if required, then sign in
5. `/dashboard` and `/onboarding` should load; **Log out** in the header should return you to `/login`

## Test Stripe Connect + webhook

1. Enable **Connect** (Express accounts) in the Stripe dashboard
2. From `/onboarding`, save a studio name + country, then **Continue to payouts**
3. Complete the Stripe-hosted Account Link (test mode)
4. On return (`/onboarding?stripe=return`), charges/payouts flags should update after Stripe redirects and/or the webhook runs

Forward webhooks with [Stripe CLI](https://stripe.com/docs/stripe-cli):

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copy the CLI `whsec_...` value into `STRIPE_WEBHOOK_SECRET`, then trigger an event:

```bash
stripe trigger account.updated
```

`POST /api/stripe/webhook` verifies the signature, stores the event on `webhook_events` (primary key = Stripe event id), and updates `creators.stripe_account_id` / onboarding flags for Connect events (`account.updated`, `capability.updated`, `account.application.deauthorized`).

## API

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/apps?q=&category=&featured=` | public | List published apps |
| `POST` | `/api/apps` | creator | Create a listing |
| `GET` | `/api/creator/metrics` | creator | Dashboard RPC + related rows |
| `GET` | `/api/creator/onboarding` | creator | Profile + Stripe sync |
| `POST` | `/api/creator/onboarding` | creator | Save profile; create Express Account Link |
| `POST` | `/api/stripe/webhook` | Stripe signature | Record events; update Connect status |

See [`docs/data-model.md`](docs/data-model.md) for tables, RLS, and relationships.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start Next.js (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Run the built app |
| `npm run lint` | ESLint (flat config) |

## Structure Highlights

```
src/app/
  page.tsx                         # Landing page
  (marketplace)/apps/page.tsx      # Marketplace browse
  (marketplace)/apps/[slug]/page.tsx
  (marketplace)/apps/corbin-email-guru/page.tsx
  (creator)/dashboard/page.tsx
  (creator)/onboarding/page.tsx
  (auth)/login/page.tsx
  auth/callback/route.ts
  api/apps/route.ts
  api/creator/onboarding/route.ts
  api/creator/metrics/route.ts
  api/stripe/webhook/route.ts
src/proxy.ts                       # Session refresh + protected creator routes
supabase/schema.sql
supabase/seed.sql
```

## Out of scope (this MVP)

Admin approval queue, featured-placement admin UI, app-manifest deploy hooks, production Vercel setup, and live paid checkout for buyers. Connect onboarding + webhook plumbing is in place so checkout can be added later.
