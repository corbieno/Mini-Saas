"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FINANCE_CATEGORIES, formatMonthLabel, formatShortDate, monthKeyFromIso, type Transaction } from "@/lib/finance";
import { ConfirmDialog } from "@/components/finance/confirm-dialog";
import { useFinance } from "@/components/finance/finance-context";
import { MoneyText } from "@/components/finance/money-text";
import { TransactionDialog } from "@/components/finance/transaction-dialog";
import { EmptyState, PageHeader } from "@/components/finance/ui-bits";

export default function TransactionsPage() {
  const { snapshot, selectedMonth, months, accountById, upsertTransaction, deleteTransaction } = useFinance();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [month, setMonth] = useState<string>(selectedMonth);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | undefined>();
  const [pendingDelete, setPendingDelete] = useState<Transaction | undefined>();

  useEffect(() => {
    setMonth(selectedMonth);
  }, [selectedMonth]);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return snapshot.transactions
      .filter((txn) => (month === "all" ? true : monthKeyFromIso(txn.date) === month))
      .filter((txn) => (category === "all" ? true : txn.category === category))
      .filter((txn) => {
        if (!needle) {
          return true;
        }
        const account = accountById.get(txn.accountId)?.name ?? "";
        return `${txn.payee} ${txn.notes ?? ""} ${txn.category} ${account}`.toLowerCase().includes(needle);
      })
      .sort((a, b) => b.date.localeCompare(a.date) || a.payee.localeCompare(b.payee));
  }, [accountById, category, month, query, snapshot.transactions]);

  function openCreate() {
    setEditing(undefined);
    setDialogOpen(true);
  }

  return (
    <div>
      <PageHeader
        title="Transactions"
        description="Search and filter the household register. Adding, editing, or deleting a row updates account balances."
        actions={
          <Button onClick={openCreate} disabled={snapshot.accounts.length === 0}>
            <Plus className="size-4" />
            Add transaction
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_10rem_12rem]">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search payee, category, or account"
            className="bg-white pl-8 dark:bg-slate-900"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full bg-white dark:bg-slate-900">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {FINANCE_CATEGORIES.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="w-full bg-white dark:bg-slate-900">
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All months</SelectItem>
            {months.map((item) => (
              <SelectItem key={item} value={item}>
                {formatMonthLabel(item)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {snapshot.accounts.length === 0 ? (
        <EmptyState title="Add an account first" description="Transactions need somewhere to land. Create a checking or credit account, then come back." />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No matching transactions"
          description="Try clearing search or filters, or add a new expense, paycheck, or transfer."
          action={
            <Button onClick={openCreate}>
              <Plus className="size-4" />
              Add transaction
            </Button>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Payee</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Account</th>
                <th className="px-4 py-3 text-right font-medium">Amount</th>
                <th className="px-4 py-3 font-medium"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((txn) => (
                <tr key={txn.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                  <td className="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-slate-300">{formatShortDate(txn.date)}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{txn.payee}</p>
                    {txn.notes ? <p className="text-xs text-slate-500">{txn.notes}</p> : null}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">{txn.category}</Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {accountById.get(txn.accountId)?.name ?? "Unknown"}
                    {txn.transferAccountId ? (
                      <span className="block text-xs text-slate-400">
                        → {accountById.get(txn.transferAccountId)?.name ?? "Unknown"}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <MoneyText amount={txn.amount} signed className="font-medium" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => { setEditing(txn); setDialogOpen(true); }}>
                        <Pencil className="size-3.5" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => setPendingDelete(txn)}>
                        <Trash2 className="size-3.5" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <TransactionDialog
        open={dialogOpen}
        transaction={editing}
        accounts={snapshot.accounts}
        onOpenChange={setDialogOpen}
        onSubmit={upsertTransaction}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={`Delete ${pendingDelete?.payee ?? "transaction"}?`}
        description="This reverses the amount on the related account balance."
        confirmLabel="Delete transaction"
        onCancel={() => setPendingDelete(undefined)}
        onConfirm={() => {
          if (pendingDelete) {
            deleteTransaction(pendingDelete.id);
          }
          setPendingDelete(undefined);
        }}
      />
    </div>
  );
}
