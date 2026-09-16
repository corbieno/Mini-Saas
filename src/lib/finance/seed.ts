import { isoDateFromParts, monthKeyFromDate, todayIso } from "./money";
import type { Account, Budget, FinanceSnapshot, Goal, Transaction } from "./types";

export const SEED_VERSION = 1 as const;

export const ACCOUNT_IDS = {
  checking: "acc_checking",
  savings: "acc_savings",
  credit: "acc_credit",
  brokerage: "acc_brokerage",
  retirement: "acc_retirement",
  loan: "acc_loan",
} as const;

type DraftTxn = {
  day: number;
  payee: string;
  category: Transaction["category"];
  accountId: string;
  amount: number;
  transferAccountId?: string;
  notes?: string;
};

function clampDay(year: number, month: number, day: number) {
  const last = new Date(year, month, 0).getDate();
  return Math.min(day, last);
}

function notFuture(year: number, month: number, day: number, today: string) {
  return isoDateFromParts(year, month, day) <= today;
}

function tx(
  id: string,
  year: number,
  month: number,
  draft: DraftTxn,
): Transaction {
  return {
    id,
    date: isoDateFromParts(year, month, clampDay(year, month, draft.day)),
    payee: draft.payee,
    category: draft.category,
    accountId: draft.accountId,
    amount: draft.amount,
    transferAccountId: draft.transferAccountId,
    notes: draft.notes,
  };
}

function recurringForMonth(lastDay: number): DraftTxn[] {
  return [
    {
      day: 1,
      payee: "Harbor Property Management",
      category: "Housing",
      accountId: ACCOUNT_IDS.checking,
      amount: -2450,
      notes: "Rent — 2BR Oakland",
    },
    {
      day: 1,
      payee: "Ally Bank",
      category: "Transfer",
      accountId: ACCOUNT_IDS.checking,
      amount: -500,
      transferAccountId: ACCOUNT_IDS.savings,
      notes: "Monthly emergency-fund sweep",
    },
    {
      day: 2,
      payee: "Comcast Xfinity",
      category: "Subscriptions",
      accountId: ACCOUNT_IDS.checking,
      amount: -79.99,
    },
    {
      day: 2,
      payee: "Verizon Wireless",
      category: "Subscriptions",
      accountId: ACCOUNT_IDS.checking,
      amount: -64.8,
    },
    {
      day: 3,
      payee: "Netflix",
      category: "Subscriptions",
      accountId: ACCOUNT_IDS.credit,
      amount: -15.49,
    },
    {
      day: 3,
      payee: "Spotify",
      category: "Subscriptions",
      accountId: ACCOUNT_IDS.credit,
      amount: -16.99,
    },
    {
      day: 8,
      payee: "Honda Financial",
      category: "Transfer",
      accountId: ACCOUNT_IDS.checking,
      amount: -385,
      transferAccountId: ACCOUNT_IDS.loan,
      notes: "Civic auto loan",
    },
    {
      day: 10,
      payee: "State Farm",
      category: "Insurance",
      accountId: ACCOUNT_IDS.checking,
      amount: -148,
      notes: "Auto + renters",
    },
    {
      day: 12,
      payee: "PG&E",
      category: "Utilities",
      accountId: ACCOUNT_IDS.checking,
      amount: -91.22,
    },
    {
      day: 15,
      payee: "Acme Corp Payroll",
      category: "Income",
      accountId: ACCOUNT_IDS.checking,
      amount: 3420,
      notes: "Salary — first half",
    },
    {
      day: 16,
      payee: "Fidelity Investments",
      category: "Transfer",
      accountId: ACCOUNT_IDS.checking,
      amount: -250,
      transferAccountId: ACCOUNT_IDS.brokerage,
      notes: "Taxable brokerage contribution",
    },
    {
      day: lastDay,
      payee: "Acme Corp Payroll",
      category: "Income",
      accountId: ACCOUNT_IDS.checking,
      amount: 3420,
      notes: "Salary — second half",
    },
    {
      day: lastDay,
      payee: "Acme Corp 401(k)",
      category: "Income",
      accountId: ACCOUNT_IDS.retirement,
      amount: 420,
      notes: "Employer match",
    },
  ];
}

const MONTH_FLAVOR: DraftTxn[][] = [
  // Current month — dining + shopping run hot so overview alerts have something real to show
  [
    { day: 5, payee: "Whole Foods", category: "Groceries", accountId: ACCOUNT_IDS.checking, amount: -142.18 },
    { day: 6, payee: "Shell", category: "Transport", accountId: ACCOUNT_IDS.credit, amount: -58.2 },
    { day: 7, payee: "Chipotle", category: "Dining", accountId: ACCOUNT_IDS.credit, amount: -16.4 },
    { day: 8, payee: "Trader Joe's", category: "Groceries", accountId: ACCOUNT_IDS.checking, amount: -88.4 },
    { day: 11, payee: "Everlane", category: "Shopping", accountId: ACCOUNT_IDS.credit, amount: -124 },
    { day: 12, payee: "Uber", category: "Transport", accountId: ACCOUNT_IDS.credit, amount: -19.4 },
    { day: 13, payee: "Burma Superstar", category: "Dining", accountId: ACCOUNT_IDS.credit, amount: -78.2 },
    { day: 14, payee: "Che Fico", category: "Dining", accountId: ACCOUNT_IDS.credit, amount: -86.4, notes: "Date night" },
    { day: 15, payee: "Tacolicious", category: "Dining", accountId: ACCOUNT_IDS.credit, amount: -42.3 },
    { day: 16, payee: "Target", category: "Shopping", accountId: ACCOUNT_IDS.credit, amount: -56.8 },
    { day: 16, payee: "Costco Gas", category: "Transport", accountId: ACCOUNT_IDS.credit, amount: -52.1 },
  ],
  [
    { day: 5, payee: "Whole Foods", category: "Groceries", accountId: ACCOUNT_IDS.checking, amount: -118.64 },
    { day: 9, payee: "Trader Joe's", category: "Groceries", accountId: ACCOUNT_IDS.checking, amount: -96.22 },
    { day: 14, payee: "Oakland Zoo", category: "Entertainment", accountId: ACCOUNT_IDS.credit, amount: -42 },
    { day: 19, payee: "Liholiho Yacht Club", category: "Dining", accountId: ACCOUNT_IDS.credit, amount: -112.3 },
    { day: 22, payee: "Costco", category: "Groceries", accountId: ACCOUNT_IDS.checking, amount: -167.4 },
    { day: 26, payee: "Costco Gas", category: "Transport", accountId: ACCOUNT_IDS.credit, amount: -57.3 },
  ],
  [
    { day: 5, payee: "Whole Foods", category: "Groceries", accountId: ACCOUNT_IDS.checking, amount: -131.08 },
    { day: 9, payee: "Dumpling Time", category: "Dining", accountId: ACCOUNT_IDS.credit, amount: -48.2 },
    { day: 18, payee: "Clipper Card", category: "Transport", accountId: ACCOUNT_IDS.checking, amount: -45 },
    { day: 20, payee: "Flour + Water", category: "Dining", accountId: ACCOUNT_IDS.credit, amount: -94.75 },
    { day: 22, payee: "Delta Dental", category: "Healthcare", accountId: ACCOUNT_IDS.checking, amount: -140, notes: "Cleaning + x-rays" },
    { day: 23, payee: "Costco", category: "Groceries", accountId: ACCOUNT_IDS.checking, amount: -154.2 },
  ],
];

function seedAccounts(): Account[] {
  return [
    {
      id: ACCOUNT_IDS.checking,
      name: "Everyday Checking",
      institution: "Chase",
      type: "checking",
      balance: 4286.42,
      lastFour: "4821",
      color: "#2563eb",
    },
    {
      id: ACCOUNT_IDS.savings,
      name: "High-Yield Savings",
      institution: "Ally",
      type: "savings",
      balance: 18650,
      lastFour: "9903",
      color: "#059669",
    },
    {
      id: ACCOUNT_IDS.credit,
      name: "Sapphire Preferred",
      institution: "Chase",
      type: "credit",
      balance: 2148.67,
      lastFour: "4412",
      color: "#d97706",
    },
    {
      id: ACCOUNT_IDS.brokerage,
      name: "Taxable Brokerage",
      institution: "Fidelity",
      type: "brokerage",
      balance: 86420.18,
      lastFour: "2287",
      color: "#7c3aed",
    },
    {
      id: ACCOUNT_IDS.retirement,
      name: "401(k)",
      institution: "Vanguard",
      type: "brokerage",
      balance: 142800,
      color: "#4f46e5",
    },
    {
      id: ACCOUNT_IDS.loan,
      name: "Civic Auto Loan",
      institution: "Honda Financial",
      type: "loan",
      balance: 12450,
      lastFour: "1109",
      color: "#e11d48",
    },
  ];
}

function seedBudgets(): Budget[] {
  return [
    { id: "bud_housing", category: "Housing", limit: 2450 },
    { id: "bud_groceries", category: "Groceries", limit: 600 },
    { id: "bud_dining", category: "Dining", limit: 200 },
    { id: "bud_transport", category: "Transport", limit: 200 },
    { id: "bud_subs", category: "Subscriptions", limit: 180 },
    { id: "bud_utilities", category: "Utilities", limit: 120 },
    { id: "bud_shopping", category: "Shopping", limit: 150 },
    { id: "bud_entertainment", category: "Entertainment", limit: 80 },
  ];
}

function seedGoals(now: Date): Goal[] {
  const year = now.getFullYear();
  return [
    {
      id: "goal_emergency",
      name: "Emergency fund",
      targetAmount: 25000,
      currentAmount: 18650,
      targetDate: isoDateFromParts(year + 1, 3, 1),
      note: "Six months of essential spend in Ally savings.",
    },
    {
      id: "goal_japan",
      name: "Japan trip",
      targetAmount: 6000,
      currentAmount: 2400,
      targetDate: isoDateFromParts(year + 1, 4, 15),
      note: "Flights, rail pass, and two weeks in Kyoto + Tokyo.",
    },
    {
      id: "goal_house",
      name: "House down payment",
      targetAmount: 80000,
      currentAmount: 12000,
      targetDate: isoDateFromParts(year + 3, 6, 1),
      note: "20% on a Bay Area starter condo.",
    },
  ];
}

export function buildDemoSnapshot(now = new Date()): FinanceSnapshot {
  const today = todayIso(now);
  const transactions: Transaction[] = [];
  let seq = 1;

  for (let offset = 0; offset <= 2; offset += 1) {
    const cursor = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const year = cursor.getFullYear();
    const month = cursor.getMonth() + 1;
    const lastDay = new Date(year, month, 0).getDate();
    const drafts = [...recurringForMonth(lastDay), ...(MONTH_FLAVOR[offset] ?? [])];

    for (const draft of drafts) {
      const day = clampDay(year, month, draft.day);
      if (!notFuture(year, month, day, today)) {
        continue;
      }
      transactions.push(tx(`txn_${String(seq).padStart(3, "0")}`, year, month, { ...draft, day }));
      seq += 1;
    }
  }

  transactions.sort((a, b) => b.date.localeCompare(a.date) || b.payee.localeCompare(a.payee));

  return {
    version: SEED_VERSION,
    accounts: seedAccounts(),
    transactions,
    budgets: seedBudgets(),
    goals: seedGoals(now),
  };
}

export function currentMonthKey(now = new Date()) {
  return monthKeyFromDate(now);
}
