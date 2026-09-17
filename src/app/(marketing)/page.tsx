import { LandingHero } from "@/components/sections/landing-hero";
import { CategoryGrid } from "@/components/sections/category-grid";
import { ValueProps } from "@/components/sections/value-props";
import { HowItWorks } from "@/components/sections/how-it-works";
import { CtaPanel } from "@/components/sections/cta-panel";
import { MarketplaceAppCard } from "@/components/marketplace/app-card";

const featuredApps = [
  {
    title: "Grok Desk Runner",
    description: "Desktop agent that watches a folder, reasons with Grok, and clicks through local apps for you.",
    category: "Operations",
    creator: "Nightshift Agents",
    price: "$39/mo",
    href: "/apps/grok-desk-runner",
    tags: ["Grok", "Desktop", "Agents"],
  },
  {
    title: "Claude Research Desk",
    description: "Long-context literature review — drop PDFs, get cited briefs you can hand to a client.",
    category: "Operations",
    creator: "Hearth Context",
    price: "$39/mo",
    href: "/apps/claude-research-desk",
    tags: ["Claude", "Research", "PDF"],
  },
  {
    title: "Assistants Switchboard",
    description: "Route customer intents to the right OpenAI Assistant with shared memory across threads.",
    category: "Inbox",
    creator: "Prompt Foundry",
    price: "$32/mo",
    href: "/apps/assistants-switchboard",
    tags: ["OpenAI", "Assistants", "Support"],
  },
];

const categories = [
  {
    name: "Grok",
    description: "Desktop agents and live-web automations built on Grok.",
    icon: "⚡",
    highlight: "xAI",
    href: "/apps?category=Grok",
  },
  {
    name: "Claude",
    description: "Research, writing, and code assistants with long-context Claude.",
    icon: "🪶",
    highlight: "Anthropic",
    href: "/apps?category=Claude",
  },
  {
    name: "OpenAI",
    description: "GPTs, Assistants, and API workflows for everyday teams.",
    icon: "◎",
    highlight: "GPT & Assistants",
    href: "/apps?category=OpenAI",
  },
  {
    name: "Email + Inbox",
    description: "Personalized outreach, account monitoring, and triage bots.",
    icon: "✉️",
    href: "/apps?category=Inbox",
  },
  {
    name: "Finance & Ops",
    description: "Cash visibility, payables automation, KPI snapshots.",
    icon: "💸",
    href: "/apps?category=Finance",
  },
  {
    name: "CRM + GTM",
    description: "Lead research, follow-ups, and pipeline reinforcement.",
    icon: "📈",
    href: "/apps?category=Sales Ops",
  },
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
        tagline="Mini SaaS • Grok, Claude, and OpenAI micro-SaaS"
        title="The marketplace for shippable Mini SaaS products"
        description="Launch automations, prompt tools, and agentic workflows on Grok, Claude, and OpenAI that everyday teams can buy in minutes."
        primaryCta={{ label: "Browse Mini SaaS", href: "/apps" }}
        secondaryCta={{ label: "List on Mini SaaS", href: "/dashboard" }}
        stats={[
          { label: "Apps live", value: "120+" },
          { label: "Avg. creator payout", value: "$2.6k/mo" },
          { label: "Ecosystems", value: "Grok · Claude · OpenAI" },
        ]}
      />

      <CategoryGrid
        title="Discover Grok, Claude, and OpenAI — then the workflows they power"
        caption="Start here"
        items={categories}
      />

      <section className="mx-auto w-full max-w-6xl space-y-6 px-4">
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
