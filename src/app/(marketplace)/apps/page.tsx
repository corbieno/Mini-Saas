import { listApps } from "@/lib/data/apps";
import { MarketplaceAppCard } from "@/components/marketplace/app-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const filters = ["All", "Sales", "Marketing", "Operations", "Finance", "Inbox"];

export default async function MarketplaceAppsPage() {
  const apps = await listApps();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 pb-16">
      <header className="space-y-4">
        <p className="text-sm uppercase tracking-wide text-slate-500">Marketplace</p>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-semibold text-slate-900">Explore apps</h1>
            <p className="text-sm text-slate-600">Discover vetted AI automations ready for everyday workflows.</p>
          </div>
          <Button size="lg">Submit your app</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {filters.map((filter, idx) => (
            <Badge key={filter} variant={idx === 0 ? "default" : "outline"} className="cursor-pointer">
              {filter}
            </Badge>
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          <Input placeholder="Search apps, creators, or integrations" className="max-w-lg" />
        </div>
      </header>

      {apps.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-600">
          No apps yet. Once Supabase has data, they’ll render here automatically.
        </div>
      ) : (
        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {apps.map((app) => (
            <MarketplaceAppCard
              key={app.id}
              title={app.title}
              description={"summary" in app && app.summary ? app.summary : ""}
              category={app.category}
              creator=""
              price={app.price ? `$${app.price}/mo` : "Custom"}
              href={`/apps/${app.id ?? "corbin-email-guru"}`}
              tags={[]}
            />
          ))}
        </section>
      )}
    </main>
  );
}
