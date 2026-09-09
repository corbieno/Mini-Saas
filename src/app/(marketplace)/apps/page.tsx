import Link from "next/link";
import { listApps } from "@/lib/data/apps";
import { MarketplaceAppCard } from "@/components/marketplace/app-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatAppPrice } from "@/lib/format";
import { MARKETPLACE_FILTERS } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MarketplaceAppsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const params = await searchParams;
  const category = params.category || "All";
  const query = params.q?.trim() ?? "";
  const apps = await listApps({ query, category });

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-16 pt-8">
      <header className="space-y-4">
        <p className="text-sm uppercase tracking-wide text-slate-500">Marketplace</p>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-semibold text-slate-900">Explore apps</h1>
            <p className="text-sm text-slate-600">Discover vetted AI automations ready for everyday workflows.</p>
          </div>
          <Button size="lg" asChild>
            <Link href="/onboarding">Submit your app</Link>
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {MARKETPLACE_FILTERS.map((filter) => {
            const href = filter === "All" ? "/apps" : `/apps?category=${encodeURIComponent(filter)}${query ? `&q=${encodeURIComponent(query)}` : ""}`;
            const active = category === filter || (filter === "All" && !params.category);
            return (
              <Link key={filter} href={href}>
                <Badge variant={active ? "default" : "outline"} className="cursor-pointer">
                  {filter}
                </Badge>
              </Link>
            );
          })}
        </div>
        <form className="flex flex-wrap gap-3" action="/apps">
          {params.category ? <input type="hidden" name="category" value={params.category} /> : null}
          <Input
            name="q"
            defaultValue={query}
            placeholder="Search apps, creators, or integrations"
            className="max-w-lg"
          />
          <Button type="submit" variant="outline">
            Search
          </Button>
        </form>
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
              description={app.summary ?? ""}
              category={app.category}
              creator={app.creator_name ?? ""}
              price={formatAppPrice(app.price, app.pricing_model)}
              href={`/apps/${app.slug}`}
              tags={app.tags}
            />
          ))}
        </section>
      )}
    </main>
  );
}
