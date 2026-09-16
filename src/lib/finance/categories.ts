import type { AccountType, FinanceCategory } from "./types";
import { ACCOUNT_TYPES, EXPENSE_CATEGORIES, FINANCE_CATEGORIES } from "./types";

export { ACCOUNT_TYPES, EXPENSE_CATEGORIES, FINANCE_CATEGORIES };

export const LIABILITY_TYPES: AccountType[] = ["credit", "loan"];

export function isLiabilityType(type: AccountType) {
  return LIABILITY_TYPES.includes(type);
}

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  checking: "Checking",
  savings: "Savings",
  credit: "Credit card",
  brokerage: "Brokerage",
  loan: "Loan",
};

export const CATEGORY_COLORS: Record<FinanceCategory, string> = {
  Housing: "#0f766e",
  Groceries: "#047857",
  Dining: "#d97706",
  Transport: "#2563eb",
  Subscriptions: "#7c3aed",
  Utilities: "#0ea5e9",
  Healthcare: "#db2777",
  Shopping: "#c026d3",
  Entertainment: "#ea580c",
  Insurance: "#4f46e5",
  Personal: "#65a30d",
  Other: "#64748b",
  Income: "#059669",
  Transfer: "#94a3b8",
};

export function accountTypeBadgeClass(type: AccountType) {
  switch (type) {
    case "checking":
      return "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-200";
    case "savings":
      return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200";
    case "credit":
      return "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200";
    case "brokerage":
      return "border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-200";
    case "loan":
      return "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200";
  }
}
