"use client";

import Link from "next/link";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Landmark, TrendingUp, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  allocationFromAccounts,
  budgetProgress,
  formatMoney,
  formatMonthLabel,
  incomeVsSpendingSeries,
  monthCashflow,
  shiftMonth,
  spendingByCategory,
} from "@/lib/finance";
import { CategoryDonut, IncomeSpendChart } from "@/components/finance/charts";
import { useFinance } from "@/components/finance/finance-context";
import { MoneyText } from "@/components/finance/money-text";
import { PageHeader, ProgressBar } from "@/components/finance/ui-bits";

export default function FinanceOverviewPage() {
  const { snapshot, selectedMonth } = useFinance();
  const allocation = allocationFromAccounts(snapshot.accounts);
  const cashflow = monthCashflow(snapshot.transactions, selectedMonth);
  const months = [shiftMonth(selectedMonth, -2), shiftMonth(selectedMonth, -1), selectedMonth];
  const series = incomeVsSpendingSeries(snapshot.transactions, months);
  const categorySpend = spendingByCategory(snapshot.transactions, selectedMonth);
  const budgets = budgetProgress(snapshot.budgets, snapshot.transactions, selectedMonth);
  const alerts = budgets.filter((budget) => budget.over);
  const total = allocation.cash + allocation.investments + allocation.debt || 1;

  return (
    <div>
      <PageHeader
        title="Overview"
        description={`A snapshot of the demo household for ${formatMonthLabel(selectedMonth)}. All numbers live in this browser until you connect a backend.`}
      />

      <Card className="mb-6 overflow-hidden border-slate-200 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white dark:border-slate-800">
        <CardContent className="grid gap-6 p-6 md:grid-cols-[1.4fr_1fr] md:items-center">
          <div>
            <p className="text-sm uppercase tracking-wide text-slate-300">Net worth</p>
            <p className="mt-1 text-4xl font-semibold tracking-tight md:text-5xl">{formatMoney(allocation.netWorth)}</p>
            <p className="mt-2 text-sm text-slate-300">
              Cash {formatMoney(allocation.cash)} · Investments {formatMoney(allocation.investments)} · Debt {formatMoney(allocation.debt)}
            </p>
          </div>
          <div className="grid gap-3">
            <AllocationRow label="Cash" value={allocation.cash} share={allocation.cash / total} color="bg-emerald-400" />
            <AllocationRow label="Investments" value={allocation.investments} share={allocation.investments / total} color="bg-violet-400" />
            <AllocationRow label="Debt" value={allocation.debt} share={allocation.debt / total} color="bg-rose-400" />
          </div>
        </CardContent>
      </Card>

      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <MiniStat
          label="Income this month"
          value={formatMoney(cashflow.income)}
          icon={ArrowUpRight}
          hint="Paychecks and other inflows"
        />
        <MiniStat
          label="Spending this month"
          value={formatMoney(cashflow.spending)}
          icon={ArrowDownRight}
          hint="Excludes transfers"
        />
        <MiniStat
          label="Cashflow"
          value={formatMoney(cashflow.net)}
          icon={cashflow.net >= 0 ? TrendingUp : Wallet}
          hint={cashflow.net >= 0 ? "Income covers spending" : "Spending ahead of income"}
        />
      </section>

      {alerts.length > 0 ? (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          <div className="mb-2 flex items-center gap-2 font-medium">
            <AlertTriangle className="size-4" />
            Over-budget categories
          </div>
          <ul className="space-y-1">
            {alerts.map((alert) => (
              <li key={alert.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  {alert.category} is {formatMoney(alert.spent - alert.limit)} over a {formatMoney(alert.limit)} limit.
                </span>
                <Button asChild variant="outline" size="sm" className="bg-white dark:bg-slate-900">
                  <Link href="/finance/budgets">Review budgets</Link>
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
          Every tracked category is within its monthly limit.
        </div>
      )}

      <section className="mb-6 grid gap-4 lg:grid-cols-2">
        <IncomeSpendChart data={series} />
        <CategoryDonut data={categorySpend} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Accounts</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/finance/accounts">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {snapshot.accounts.slice(0, 4).map((account) => (
              <div key={account.id} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex size-8 items-center justify-center rounded-full" style={{ backgroundColor: `${account.color}22` }}>
                    <Landmark className="size-4" style={{ color: account.color }} />
                  </span>
                  <div>
                    <p className="text-sm font-medium">{account.name}</p>
                    <p className="text-xs text-slate-500">{account.institution}</p>
                  </div>
                </div>
                <MoneyText amount={account.type === "credit" || account.type === "loan" ? -account.balance : account.balance} signed />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Goals</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/finance/goals">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {snapshot.goals.map((goal) => {
              const ratio = goal.targetAmount > 0 ? goal.currentAmount / goal.targetAmount : 0;
              return (
                <div key={goal.id}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium">{goal.name}</span>
                    <span className="tabular-nums text-slate-500">
                      {formatMoney(goal.currentAmount)} / {formatMoney(goal.targetAmount)}
                    </span>
                  </div>
                  <ProgressBar value={ratio * 100} indicatorClassName="bg-emerald-600 dark:bg-emerald-400" />
                </div>
              );
            })}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function AllocationRow({
  label,
  value,
  share,
  color,
}: {
  label: string;
  value: number;
  share: number;
  color: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-slate-300">{label}</span>
        <span className="tabular-nums">{formatMoney(value)}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(4, Math.min(100, share * 100))}%` }} />
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string;
  value: string;
  icon: typeof Wallet;
  hint: string;
}) {
  return (
    <Card className="border-slate-200 dark:border-slate-800">
      <CardContent className="flex items-start justify-between gap-3 pt-1">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{hint}</p>
        </div>
        <Badge variant="secondary" className="mt-1">
          <Icon className="size-3.5" />
        </Badge>
      </CardContent>
    </Card>
  );
}
