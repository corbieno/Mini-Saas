import type { Metadata } from "next";
import { FinanceApp } from "@/components/finance/finance-app";

export const metadata: Metadata = {
  title: "Ledger · Mini SaaS",
  description: "Personal finance dashboard with demo household data — accounts, transactions, budgets, and goals.",
};

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  return <FinanceApp>{children}</FinanceApp>;
}
