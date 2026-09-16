import { isLiabilityType } from "./categories";
import { roundMoney } from "./money";
import type { Account, Transaction } from "./types";

function applySignedAmount(account: Account, signedAmount: number, direction: 1 | -1) {
  const impact = isLiabilityType(account.type) ? -signedAmount : signedAmount;
  return {
    ...account,
    balance: roundMoney(account.balance + impact * direction),
  };
}

/**
 * Apply or reverse a transaction's effect on account balances.
 * `direction` 1 = apply, -1 = reverse (edit/delete).
 *
 * Signed amounts: positive = inflow to `accountId`, negative = outflow.
 * Transfers also credit the opposite signed amount to `transferAccountId`.
 */
export function applyTransactionToAccounts(
  accounts: Account[],
  transaction: Transaction,
  direction: 1 | -1 = 1,
): Account[] {
  return accounts.map((account) => {
    if (account.id === transaction.accountId) {
      return applySignedAmount(account, transaction.amount, direction);
    }
    if (transaction.transferAccountId && account.id === transaction.transferAccountId) {
      return applySignedAmount(account, -transaction.amount, direction);
    }
    return account;
  });
}

export function replaceTransactionImpact(
  accounts: Account[],
  previous: Transaction | undefined,
  next: Transaction | undefined,
): Account[] {
  let nextAccounts = accounts;
  if (previous) {
    nextAccounts = applyTransactionToAccounts(nextAccounts, previous, -1);
  }
  if (next) {
    nextAccounts = applyTransactionToAccounts(nextAccounts, next, 1);
  }
  return nextAccounts;
}
