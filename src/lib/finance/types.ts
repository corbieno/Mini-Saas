export const ACCOUNT_TYPES = ["checking", "savings", "credit", "brokerage", "loan"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const TRANSACTION_KINDS = ["expense", "income", "transfer"] as const;
export type TransactionKind = (typeof TRANSACTION_KINDS)[number];

export const EXPENSE_CATEGORIES = [
  "Housing",
  "Groceries",
  "Dining",
  "Transport",
  "Subscriptions",
  "Utilities",
  "Healthcare",
  "Shopping",
  "Entertainment",
  "Insurance",
  "Personal",
  "Other",
] as const;

export const FINANCE_CATEGORIES = [...EXPENSE_CATEGORIES, "Income", "Transfer"] as const;
export type FinanceCategory = (typeof FINANCE_CATEGORIES)[number];

export type Account = {
  id: string;
  name: string;
  institution: string;
  type: AccountType;
  balance: number;
  lastFour?: string;
  color: string;
};

export type Transaction = {
  id: string;
  date: string;
  payee: string;
  category: FinanceCategory;
  accountId: string;
  amount: number;
  notes?: string;
  transferAccountId?: string;
};

export type Budget = {
  id: string;
  category: (typeof EXPENSE_CATEGORIES)[number];
  limit: number;
};

export type Goal = {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  note?: string;
};

export type FinanceSnapshot = {
  version: 1;
  accounts: Account[];
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
};

export type AccountInput = Omit<Account, "id"> & { id?: string };
export type TransactionInput = Omit<Transaction, "id"> & { id?: string };
export type BudgetInput = Omit<Budget, "id"> & { id?: string };
export type GoalInput = Omit<Goal, "id"> & { id?: string };

/**
 * Persistence contract for the finance dashboard.
 * The UI talks only to this shape so a Supabase (or other) adapter can replace
 * the localStorage implementation without rewriting pages.
 */
export interface FinanceRepository {
  load(): FinanceSnapshot | null;
  save(snapshot: FinanceSnapshot): void;
  clear(): void;
}
