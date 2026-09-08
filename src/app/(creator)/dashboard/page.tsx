import { StatCard } from "@/components/creator/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const stats = [
  { label: "MRR", value: "$2,640", delta: "+14%" },
  { label: "Active installs", value: "82", delta: "+9%" },
  { label: "Churn", value: "3.1%", delta: "-0.4%" },
];

const recentBuyers = [
  { company: "Summit CX", plan: "$49/mo", date: "Mar 25" },
  { company: "Newwind Labs", plan: "$29/mo", date: "Mar 24" },
  { company: "Atlas Retail", plan: "$59/mo", date: "Mar 23" },
];

export default function CreatorDashboardPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 pb-16">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-slate-500">Creator console</p>
          <h1 className="text-4xl font-semibold text-slate-900">Dashboard</h1>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">View marketplace profile</Button>
          <Button>Upload new app</Button>
        </div>
      </header>

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
            <div className="h-48 rounded-2xl bg-gradient-to-br from-emerald-50 to-slate-50 p-6">
              <p className="text-sm text-slate-600">Next transfer</p>
              <p className="text-3xl font-semibold text-slate-900">$1,820</p>
              <p className="text-xs text-slate-500">Stripe Connect • arrives Apr 2</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Recent buyers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentBuyers.map((buyer) => (
              <div key={buyer.company} className="flex items-center justify-between rounded-2xl border border-slate-100 p-3">
                <div>
                  <p className="font-medium text-slate-900">{buyer.company}</p>
                  <p className="text-xs text-slate-500">{buyer.plan}</p>
                </div>
                <span className="text-xs text-slate-500">{buyer.date}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
