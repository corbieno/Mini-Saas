import Link from "next/link";
import { notFound } from "next/navigation";
import { MarketplaceAppCard } from "@/components/marketplace/app-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAppBySlug, listApps } from "@/lib/data/apps";
import { formatAppPrice } from "@/lib/format";
import { isMarketplaceProvider } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MarketplaceAppDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const app = await getAppBySlug(slug);

  if (!app) {
    notFound();
  }

  const providerTag = app.tags.find((tag) => isMarketplaceProvider(tag));
  const related = (await listApps({ category: providerTag ?? app.category }))
    .filter((item) => item.id !== app.id)
    .slice(0, 3);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 pb-16 pt-8">
      <div className="space-y-3">
        <Badge variant="outline">{app.category}</Badge>
        <h1 className="text-4xl font-semibold text-slate-900">{app.title}</h1>
        <p className="text-lg text-slate-600">{app.summary}</p>
        <p className="text-sm text-slate-500">{app.creator_name ?? "Independent creator"}</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-6">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Starting at</p>
          <p className="text-3xl font-semibold text-slate-900">{formatAppPrice(app.price, app.pricing_model)}</p>
        </div>
        <Button size="lg" asChild>
          <Link href="/login">Get this app</Link>
        </Button>
      </div>

      {app.description ? <p className="text-base leading-7 text-slate-700">{app.description}</p> : null}

      {app.tags.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {app.tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>
      ) : null}

      {related.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">Related apps</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {related.map((item) => (
              <MarketplaceAppCard
                key={item.id}
                title={item.title}
                description={item.summary ?? ""}
                category={item.category}
                creator={item.creator_name ?? ""}
                price={formatAppPrice(item.price, item.pricing_model)}
                href={`/apps/${item.slug}`}
                tags={item.tags}
              />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
