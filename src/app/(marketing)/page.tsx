import { LandingHero } from "@/components/sections/landing-hero";
import { CategoryGrid } from "@/components/sections/category-grid";
import { ValueProps } from "@/components/sections/value-props";
import { HowItWorks } from "@/components/sections/how-it-works";
import { CtaPanel } from "@/components/sections/cta-panel";
import { MarketplaceAppCard } from "@/components/marketplace/app-card";

const featuredApps = [
  {
    title: "Pipeline Pulse",
    description: "Turns CRM noise into prioritized revenue plays—auto syncs back to HubSpot & Salesforce.",
    category: "Sales Ops",
    creator: "Summit Automations",
    price: "$29/mo",
    href: "/apps/corbin-email-guru",
    tags: ["Lead Scoring", "CRM", "Slack Alerts"],
  },
  {
    title: "Inbox Relay",
    description: "AI concierge that triages founder inboxes, drafts replies, and books meetings automatically.",
    category: "Inbox",
    creator: "Analog Futures",
    price: "$19/mo",
    href: "/apps/corbin-email-guru",
    tags: ["Gmail", "Outlook"],
  },
  {
    title: "Finance Sitter",
    description: "Daily cash intel + anomaly detection for small biz owners. Connects to Stripe, Mercury, QuickBooks.",
    category: "Finance",
    creator: "Northwind Studio",
    price: "$49/mo",
    href: "/apps/corbin-email-guru",
    tags: ["Forecasting", "Alerts"],
  },
];

const categories = [
  { name: "Email + Inbox", description: "Personalized outreach, account monitoring, and triage bots.", icon: "✉️" },
  { name: "Meeting Intelligence", description: "Summaries, action items, and CRM pushes in under 60 seconds.", icon: "🎙️" },
  { name: "Scheduling", description: "Agents that coordinate complex logistics across tools.", icon: "📅" },
  { name: "Finance & Ops", description: "Cash visibility, payables automation, KPI snapshots.", icon: "💸" },
  { name: "Task Automation", description: "Trigger-based workflows for repetitive ops work.", icon: "⚙️" },
  { name: "CRM + GTM", description: "Lead research, follow-ups, and pipeline reinforcement.", icon: "📈" },
];

const valueProps = [
  {
    title: "For creators",
    items: [
      { title: "Own your storefront", description: "Publish apps with pricing you control. We surface you to the right buyers." },
      { title: "Usage analytics", description: "See installs, retention, and LTV so you know which automations to double down on." },
    ],
  },
  {
    title: "For buyers",
    items: [
      { title: "Trusted templates", description: "Every listing is reviewed, sandboxed, and comes with transparent pricing." },
      { title: "Enterprise ready", description: "SOC2 on the roadmap, managed auth, and Stripe Connect payouts." },
    ],
  },
];

const howItWorks = [
  { title: "Creators ship", description: "Build on our Supabase + Next.js starter or bring your own endpoints.", detail: "Deploy via Vercel or your stack." },
  { title: "Marketplace vets", description: "We run policy + QA checks, set up Stripe Connect, and feature top apps.", detail: "Average review turn-around: 48h." },
  { title: "Buyers subscribe", description: "Customers install, share workspaces, and you get paid automatically.", detail: "Platform fees start at 10%." },
];

export default function MarketingPage() {
  return (
    <main className="space-y-16 pb-16">
      <LandingHero
        tagline="Mini SaaS • micro automations with revenue on day one"
        title="The marketplace for shippable Mini SaaS products"
        description="Mini SaaS lets you launch automations, prompt tools, and agentic workflows that everyday teams can buy in minutes."
        primaryCta={{ label: "Browse Mini SaaS", href: "/apps" }}
        secondaryCta={{ label: "List on Mini SaaS", href: "/dashboard" }}
        stats={[
          { label: "Apps live", value: "120+" },
          { label: "Avg. creator payout", value: "$2.6k/mo" },
          { label: "Integrations", value: "40+" },
        ]}
      />

      <CategoryGrid title="Launch with the highest-demand categories" caption="Start here" items={categories} />

      <section className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Featured</p>
            <h2 className="text-3xl font-semibold text-slate-900">In-demand apps buyers are paying for</h2>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {featuredApps.map((app) => (
            <MarketplaceAppCard key={app.title} {...app} />
          ))}
        </div>
      </section>

      <ValueProps sections={valueProps} />
      <HowItWorks steps={howItWorks} />
      <CtaPanel
        eyebrow="beta invite"
        title="Ready to list your first Mini SaaS app?"
        description="Onboard as a creator, connect Stripe payouts, and launch to buyers in less than an hour on MiniSaaS.app."
        primaryCta={{ label: "Start onboarding", href: "/onboarding" }}
        secondaryCta={{ label: "Talk to us", href: "mailto:hey@minisaas.app" }}
      />
    </main>
  );
}
