"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  PiggyBank,
  Flag,
  Menu,
  Moon,
  Sun,
  RotateCcw,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatMonthLabel } from "@/lib/finance";
import { useFinance } from "./finance-context";
import { ConfirmDialog } from "./confirm-dialog";
import { MonthSelect } from "./month-select";

const NAV = [
  { href: "/finance", label: "Overview", icon: LayoutDashboard },
  { href: "/finance/accounts", label: "Accounts", icon: Wallet },
  { href: "/finance/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/finance/budgets", label: "Budgets", icon: PiggyBank },
  { href: "/finance/goals", label: "Goals", icon: Flag },
];

export function FinanceShell({
  children,
  dark,
  onToggleDark,
}: {
  children: React.ReactNode;
  dark: boolean;
  onToggleDark: () => void;
}) {
  const pathname = usePathname();
  const { ready, selectedMonth, months, setSelectedMonth, resetDemo } = useFinance();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  const nav = (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active = item.href === "/finance" ? pathname === "/finance" : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white",
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-slate-900/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900",
          "transition-transform md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div className="mb-6 flex items-center justify-between">
          <Link href="/finance" className="flex flex-col" onClick={() => setMobileOpen(false)}>
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Mini SaaS
            </span>
            <span className="text-lg font-semibold tracking-tight">Ledger</span>
          </Link>
          <Button variant="ghost" size="icon-sm" className="md:hidden" onClick={() => setMobileOpen(false)}>
            <X className="size-4" />
          </Button>
        </div>
        {nav}
        <div className="mt-auto space-y-3 pt-6">
          <Button variant="outline" className="w-full justify-start" onClick={() => setResetOpen(true)}>
            <RotateCcw className="size-4" />
            Reset demo data
          </Button>
          <Link
            href="/"
            className="block px-1 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          >
            ← Back to marketplace
          </Link>
        </div>
      </aside>

      <div className="md:pl-64">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(true)}>
              <Menu className="size-4" />
              <span className="sr-only">Open navigation</span>
            </Button>
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-50">Household ledger</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{formatMonthLabel(selectedMonth)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <MonthSelect value={selectedMonth} months={months} onChange={setSelectedMonth} />
            <Button variant="outline" size="icon" onClick={onToggleDark} aria-label="Toggle dark mode">
              {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-6 pb-16">
          {ready ? (
            children
          ) : (
            <div className="grid gap-4">
              <div className="h-28 animate-pulse rounded-2xl bg-white dark:bg-slate-900" />
              <div className="grid gap-4 md:grid-cols-3">
                <div className="h-24 animate-pulse rounded-2xl bg-white dark:bg-slate-900" />
                <div className="h-24 animate-pulse rounded-2xl bg-white dark:bg-slate-900" />
                <div className="h-24 animate-pulse rounded-2xl bg-white dark:bg-slate-900" />
              </div>
            </div>
          )}
        </main>
      </div>

      <ConfirmDialog
        open={resetOpen}
        title="Reset demo household?"
        description="This replaces your local Ledger data with the original sample accounts, transactions, budgets, and goals."
        confirmLabel="Reset data"
        onCancel={() => setResetOpen(false)}
        onConfirm={() => {
          resetDemo();
          setResetOpen(false);
        }}
      />
    </div>
  );
}
