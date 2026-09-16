import { isLiabilityType } from "./categories";
import { monthKeyFromIso, roundMoney } from "./money";
import type { Account, Budget, FinanceCategory, FinanceSnapshot, Transaction } from "./types";

export type Allocation = {
  cash: number;
  investments: number;
  debt: number;
  netWorth: number;
};

export function accountSignedValue(account: Account) {
  return isLiabilityType(account.type) ? -account.balance : account.balance;
}

export function allocationFromAccounts(accounts: Account[]): Allocation {
  let cash = 0;
  let investments = 0;
  let debt = 0;

  for (const account of accounts) {
    if (account.type === "checking" || account.type === "savings") {
      cash += account.balance;
    } else if (account.type === "brokerage") {
      investments += account.balance;
    } else {
      debt += account.balance;
    }
  }

  cash = roundMoney(cash);
  investments = roundMoney(investments);
  debt = roundMoney(debt);

  return {
    cash,
    investments,
    debt,
    netWorth: roundMoney(cash + investments - debt),
  };
}

export function transactionsInMonth(transactions: Transaction[], monthKey: string) {
  return transactions.filter((txn) => monthKeyFromIso(txn.date) === monthKey);
}

export function isExpenseCategory(category: FinanceCategory) {
  return category !== "Income" && category !== "Transfer";
}

export function monthCashflow(transactions: Transaction[], monthKey: string) {
  let income = 0;
  let spending = 0;

  for (const txn of transactionsInMonth(transactions, monthKey)) {
    if (txn.category === "Income") {
      income += txn.amount;
    } else if (isExpenseCategory(txn.category)) {
      spending += Math.abs(txn.amount);
    }
  }

  return {
    income: roundMoney(income),
    spending: roundMoney(spending),
    net: roundMoney(income - spending),
  };
}

export type MonthlyPoint = {
  month: string;
  income: number;
  spending: number;
};

export function incomeVsSpendingSeries(transactions: Transaction[], months: string[]): MonthlyPoint[] {
  return months.map((month) => {
    const { income, spending } = monthCashflow(transactions, month);
    return { month, income, spending };
  });
}

export type CategorySpend = {
  category: FinanceCategory;
  amount: number;
};

export function spendingByCategory(transactions: Transaction[], monthKey: string): CategorySpend[] {
  const totals = new Map<FinanceCategory, number>();

  for (const txn of transactionsInMonth(transactions, monthKey)) {
    if (!isExpenseCategory(txn.category)) {
      continue;
    }
    totals.set(txn.category, roundMoney((totals.get(txn.category) ?? 0) + Math.abs(txn.amount)));
  }

  return [...totals.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

export type BudgetProgress = Budget & {
  spent: number;
  remaining: number;
  ratio: number;
  over: boolean;
};

export function budgetProgress(budgets: Budget[], transactions: Transaction[], monthKey: string): BudgetProgress[] {
  const spentMap = new Map(spendingByCategory(transactions, monthKey).map((row) => [row.category, row.amount]));

  return budgets
    .map((budget) => {
      const spent = spentMap.get(budget.category) ?? 0;
      const remaining = roundMoney(budget.limit - spent);
      return {
        ...budget,
        spent,
        remaining,
        ratio: budget.limit > 0 ? spent / budget.limit : 0,
        over: spent > budget.limit,
      };
    })
    .sort((a, b) => b.ratio - a.ratio);
}

export function accountNameById(accounts: Account[]) {
  return new Map(accounts.map((account) => [account.id, account.name]));
}

export function availableMonths(snapshot: FinanceSnapshot, fallbackMonth: string) {
  const keys = new Set<string>([fallbackMonth]);
  for (const txn of snapshot.transactions) {
    keys.add(monthKeyFromIso(txn.date));
  }
  return [...keys].sort((a, b) => b.localeCompare(a));
}
