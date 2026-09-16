"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  availableMonths,
  buildDemoSnapshot,
  currentMonthKey,
  loadOrSeedFinance,
  localFinanceRepository,
  replaceTransactionImpact,
  type Account,
  type AccountInput,
  type Budget,
  type BudgetInput,
  type FinanceRepository,
  type FinanceSnapshot,
  type Goal,
  type GoalInput,
  type Transaction,
  type TransactionInput,
} from "@/lib/finance";

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

type FinanceContextValue = {
  ready: boolean;
  snapshot: FinanceSnapshot;
  selectedMonth: string;
  months: string[];
  setSelectedMonth: (month: string) => void;
  resetDemo: () => void;
  upsertAccount: (input: AccountInput) => void;
  deleteAccount: (id: string) => { ok: true } | { ok: false; reason: string };
  upsertTransaction: (input: TransactionInput) => void;
  deleteTransaction: (id: string) => void;
  upsertBudget: (input: BudgetInput) => void;
  deleteBudget: (id: string) => void;
  upsertGoal: (input: GoalInput) => void;
  deleteGoal: (id: string) => void;
  accountById: Map<string, Account>;
};

const FinanceContext = createContext<FinanceContextValue | null>(null);

export function FinanceProvider({
  children,
  repository = localFinanceRepository,
}: {
  children: ReactNode;
  repository?: FinanceRepository;
}) {
  const [snapshot, setSnapshot] = useState<FinanceSnapshot>(() => buildDemoSnapshot());
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const loaded = loadOrSeedFinance(repository);
    setSnapshot(loaded);
    setSelectedMonth(currentMonthKey());
    setReady(true);
  }, [repository]);

  useEffect(() => {
    if (!ready) {
      return;
    }
    repository.save(snapshot);
  }, [ready, repository, snapshot]);

  const persist = useCallback((updater: (current: FinanceSnapshot) => FinanceSnapshot) => {
    setSnapshot((current) => updater(current));
  }, []);

  const resetDemo = useCallback(() => {
    repository.clear();
    const next = buildDemoSnapshot();
    setSnapshot(next);
    setSelectedMonth(currentMonthKey());
  }, [repository]);

  const upsertAccount = useCallback(
    (input: AccountInput) => {
      persist((current) => {
        const account: Account = {
          id: input.id ?? createId("acc"),
          name: input.name,
          institution: input.institution,
          type: input.type,
          balance: input.balance,
          lastFour: input.lastFour,
          color: input.color,
        };
        const exists = current.accounts.some((row) => row.id === account.id);
        return {
          ...current,
          accounts: exists
            ? current.accounts.map((row) => (row.id === account.id ? account : row))
            : [...current.accounts, account],
        };
      });
    },
    [persist],
  );

  const deleteAccount = useCallback(
    (id: string): { ok: true } | { ok: false; reason: string } => {
      const linked = snapshot.transactions.some(
        (txn) => txn.accountId === id || txn.transferAccountId === id,
      );
      if (linked) {
        return {
          ok: false,
          reason: "This account still has transactions. Remove or recategorize those first.",
        };
      }
      persist((current) => ({
        ...current,
        accounts: current.accounts.filter((account) => account.id !== id),
      }));
      return { ok: true };
    },
    [persist, snapshot.transactions],
  );

  const upsertTransaction = useCallback(
    (input: TransactionInput) => {
      persist((current) => {
        const previous = input.id ? current.transactions.find((row) => row.id === input.id) : undefined;
        const transaction: Transaction = {
          id: input.id ?? createId("txn"),
          date: input.date,
          payee: input.payee,
          category: input.category,
          accountId: input.accountId,
          amount: input.amount,
          notes: input.notes,
          transferAccountId: input.category === "Transfer" ? input.transferAccountId : undefined,
        };
        return {
          ...current,
          accounts: replaceTransactionImpact(current.accounts, previous, transaction),
          transactions: previous
            ? current.transactions.map((row) => (row.id === transaction.id ? transaction : row))
            : [transaction, ...current.transactions],
        };
      });
    },
    [persist],
  );

  const deleteTransaction = useCallback(
    (id: string) => {
      persist((current) => {
        const previous = current.transactions.find((row) => row.id === id);
        return {
          ...current,
          accounts: replaceTransactionImpact(current.accounts, previous, undefined),
          transactions: current.transactions.filter((row) => row.id !== id),
        };
      });
    },
    [persist],
  );

  const upsertBudget = useCallback(
    (input: BudgetInput) => {
      persist((current) => {
        const budget: Budget = {
          id: input.id ?? createId("bud"),
          category: input.category,
          limit: input.limit,
        };
        const exists = current.budgets.some((row) => row.id === budget.id);
        const conflict = current.budgets.find((row) => row.category === budget.category && row.id !== budget.id);
        const withoutConflict = conflict
          ? current.budgets.filter((row) => row.id !== conflict.id)
          : current.budgets;
        return {
          ...current,
          budgets: exists
            ? withoutConflict.map((row) => (row.id === budget.id ? budget : row))
            : [...withoutConflict, budget],
        };
      });
    },
    [persist],
  );

  const deleteBudget = useCallback(
    (id: string) => {
      persist((current) => ({
        ...current,
        budgets: current.budgets.filter((budget) => budget.id !== id),
      }));
    },
    [persist],
  );

  const upsertGoal = useCallback(
    (input: GoalInput) => {
      persist((current) => {
        const goal: Goal = {
          id: input.id ?? createId("goal"),
          name: input.name,
          targetAmount: input.targetAmount,
          currentAmount: input.currentAmount,
          targetDate: input.targetDate,
          note: input.note,
        };
        const exists = current.goals.some((row) => row.id === goal.id);
        return {
          ...current,
          goals: exists ? current.goals.map((row) => (row.id === goal.id ? goal : row)) : [...current.goals, goal],
        };
      });
    },
    [persist],
  );

  const deleteGoal = useCallback(
    (id: string) => {
      persist((current) => ({
        ...current,
        goals: current.goals.filter((goal) => goal.id !== id),
      }));
    },
    [persist],
  );

  const months = useMemo(
    () => availableMonths(snapshot, selectedMonth),
    [snapshot, selectedMonth],
  );

  const accountById = useMemo(
    () => new Map(snapshot.accounts.map((account) => [account.id, account])),
    [snapshot.accounts],
  );

  const value = useMemo<FinanceContextValue>(
    () => ({
      ready,
      snapshot,
      selectedMonth,
      months,
      setSelectedMonth,
      resetDemo,
      upsertAccount,
      deleteAccount,
      upsertTransaction,
      deleteTransaction,
      upsertBudget,
      deleteBudget,
      upsertGoal,
      deleteGoal,
      accountById,
    }),
    [
      accountById,
      deleteAccount,
      deleteBudget,
      deleteGoal,
      deleteTransaction,
      months,
      ready,
      resetDemo,
      selectedMonth,
      snapshot,
      upsertAccount,
      upsertBudget,
      upsertGoal,
      upsertTransaction,
    ],
  );

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  const value = useContext(FinanceContext);
  if (!value) {
    throw new Error("useFinance must be used within FinanceProvider");
  }
  return value;
}
