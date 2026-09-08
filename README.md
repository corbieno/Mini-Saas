# Mini SaaS

Mini SaaS (the new domain + brand for this build) is a multi-surface Next.js 16 project for showcasing and selling high-performing micro SaaS automations:

- **Marketing site** (`/(marketing)`) with hero, category grid, value props, and CTA panel.
- **Marketplace browse + detail** (`/apps`, `/apps/corbin-email-guru`) using reusable `MarketplaceAppCard`.
- **Creator surfaces** (`/dashboard`, `/onboarding`) for payouts, installs, and onboarding steps.
- **Auth entry** (`/login`) with placeholder card.
- **Flagship business app** relocated to `/apps/corbin-email-guru` (multi-tab experience for outreach automation).

Built with **Next.js 16**, **TypeScript**, **Tailwind**, **shadcn/ui**, **framer-motion**, and freshly scaffolded Supabase + Stripe clients.

## Getting Started

```bash
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) for the marketing surface, or jump to:

- `/apps` – marketplace browse grid
- `/apps/corbin-email-guru` – flagship productivity app
- `/dashboard` – creator console stub
- `/onboarding` – onboarding wizard stub
- `/login` – auth card

## Environment Variables

Create `.env.local` (or copy `.env.example`) with:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

The Supabase helpers live in `src/lib/supabase/{client,server}.ts`, and Stripe helper in `src/lib/stripe.ts`.

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
  (marketing)/page.tsx         # Landing page
  (marketplace)/apps/page.tsx  # Marketplace browse
  (marketplace)/apps/corbin-email-guru/page.tsx
  (creator)/dashboard/page.tsx
  (creator)/onboarding/page.tsx
  (auth)/login/page.tsx
```

Shared UI lives in `src/components/sections`, `components/marketplace`, `components/creator`, `components/forms`, and `components/auth`.

## Next Steps

1. **Connect real data** – wire Supabase schema + actions for listings, creators, and installs.
2. **Stripe Connect** – implement onboarding routes + webhooks (`/api/stripe/*`).
3. **Auth** – add Clerk/Supabase Auth + middleware for dashboard routes.
4. **Admin tooling** – approval queue, featured placement controls.
5. **App manifests** – schema for creator submissions and deploy hooks.

Use this foundation to build the full marketplace experience end-to-end.
