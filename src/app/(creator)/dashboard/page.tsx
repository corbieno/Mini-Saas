import Link from "next/link";
import { CreateAppDialog } from "@/components/creator/create-app-dialog";
import { StatCard } from "@/components/creator/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listCreatorApps } from "@/lib/data/apps";
import {
  ensureCreatorForUser,
  getAuthUser,
  getCreatorForUser,
  getCreatorMetrics,
  installAppTitle,
  listCreatorInstalls,
  listCreatorPayouts,
  refreshCreatorStripeStatus,
} from "@/lib/data/creators";
import { formatAppPrice, formatDateLabel, formatUsd } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function CreatorDashboardPage() {
  const user = await getAuthUser();
  const loaded = user ? ((await getCreatorForUser(user.id)) ?? (await ensureCreatorForUser(user))) : null;
  const creator = loaded ? await refreshCreatorStripeStatus(loaded) : null;
  const metrics = await getCreatorMetrics();
  const apps = creator ? await listCreatorApps(creator.id) : [];
  const installs = creator ? await listCreatorInstalls(creator.id) : [];
  const payouts = creator ? await listCreatorPayouts(creator.id) : [];
  const nextPayout = metrics.next_payout ?? payouts[0] ?? null;
  const stripeReady = Boolean(creator?.charges_enabled);
  const profileHref = apps[0] ? `/apps/${apps[0].slug}` : "/apps";

  const stats = [
    { label: "MRR", value: formatUsd(metrics.mrr, "$0") },
    { label: "Active installs", value: String(metrics.active_installs) },
    { label: "Churn", value: `${metrics.churn_rate}%` },
  ];

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-16 pt-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-slate-500">Creator console</p>
          <h1 className="text-4xl font-semibold text-slate-900">
            {creator?.workspace_name ? creator.workspace_name : "Dashboard"}
          </h1>
          <p className="text-sm text-slate-600">
            {user?.email ?? "Sign in to see live payouts, installs, and listings."}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" asChild>
            <Link href={profileHref}>View marketplace profile</Link>
          </Button>
          <CreateAppDialog />
        </div>
      </header>

      {!stripeReady ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-950">
          Connect Stripe to receive payouts.{" "}
          <Link href="/onboarding" className="font-medium underline">
            Continue onboarding
          </Link>
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Payout preview</CardTitle>
          </CardHeader>
          <CardContent>
            {nextPayout ? (
              <div className="h-48 rounded-2xl bg-gradient-to-br from-emerald-50 to-slate-50 p-6">
                <p className="text-sm text-slate-600">Next transfer</p>
                <p className="text-3xl font-semibold text-slate-900">{formatUsd(nextPayout.amount)}</p>
                <p className="text-xs text-slate-500">
                  Stripe Connect • {formatDateLabel(nextPayout.payout_date)}
                </p>
              </div>
            ) : (
              <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-600">
                No payouts yet. Installs on your apps will show up here.
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Recent buyers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {installs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-600">
                No installs yet. Share your listing from the marketplace to get your first buyer.
              </div>
            ) : (
              installs.map((buyer) => (
                <div
                  key={buyer.id}
                  className="flex items-center justify-between rounded-2xl border border-slate-100 p-3"
                >
                  <div>
                    <p className="font-medium text-slate-900">{buyer.buyer_company || buyer.buyer_email || "Buyer"}</p>
                    <p className="text-xs text-slate-500">
                      {buyer.plan || installAppTitle(buyer)} · {buyer.status}
                    </p>
                  </div>
                  <span className="text-xs text-slate-500">{formatDateLabel(buyer.created_at)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Your listings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {apps.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-600">
                You have not listed an app yet. Publish one to appear on the marketplace.
              </div>
            ) : (
              apps.map((app) => (
                <div
                  key={app.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 p-3"
                >
                  <div>
                    <p className="font-medium text-slate-900">{app.title}</p>
                    <p className="text-xs text-slate-500">
                      {app.category} · {app.status} · {formatAppPrice(app.price, app.pricing_model)}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/apps/${app.slug}`}>View</Link>
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
