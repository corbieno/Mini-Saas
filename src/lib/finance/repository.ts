import { buildDemoSnapshot } from "./seed";
import type { FinanceRepository, FinanceSnapshot } from "./types";

export const FINANCE_STORAGE_KEY = "mini-saas.finance.v1";

/**
 * Browser persistence for Ledger v1.
 *
 * To swap in Supabase later:
 * 1. Add tables that match `FinanceSnapshot` (accounts, transactions, budgets, goals).
 * 2. Implement `FinanceRepository` with `load`/`save` (or replace the provider's
 *    CRUD methods with row-level queries).
 * 3. Pass that adapter into `FinanceProvider` — pages do not import localStorage.
 */

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export class LocalFinanceRepository implements FinanceRepository {
  constructor(private readonly key = FINANCE_STORAGE_KEY) {}

  load(): FinanceSnapshot | null {
    if (!canUseStorage()) {
      return null;
    }

    try {
      const raw = window.localStorage.getItem(this.key);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as FinanceSnapshot;
      if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.accounts)) {
        return null;
      }
      return parsed;
    } catch (error) {
      console.warn("Failed to load finance snapshot", error);
      return null;
    }
  }

  save(snapshot: FinanceSnapshot): void {
    if (!canUseStorage()) {
      return;
    }

    try {
      window.localStorage.setItem(this.key, JSON.stringify(snapshot));
    } catch (error) {
      console.error("Failed to persist finance snapshot", error);
    }
  }

  clear(): void {
    if (!canUseStorage()) {
      return;
    }
    window.localStorage.removeItem(this.key);
  }
}

export const localFinanceRepository = new LocalFinanceRepository();

export function loadOrSeedFinance(repository: FinanceRepository = localFinanceRepository): FinanceSnapshot {
  return repository.load() ?? buildDemoSnapshot();
}
