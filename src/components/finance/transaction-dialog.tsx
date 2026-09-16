"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  EXPENSE_CATEGORIES,
  parseMoneyInput,
  roundMoney,
  todayIso,
  type Account,
  type FinanceCategory,
  type Transaction,
  type TransactionInput,
  type TransactionKind,
} from "@/lib/finance";

type FormState = {
  kind: TransactionKind;
  date: string;
  payee: string;
  category: FinanceCategory;
  accountId: string;
  transferAccountId: string;
  amount: string;
  notes: string;
};

function inferKind(transaction?: Transaction): TransactionKind {
  if (!transaction) {
    return "expense";
  }
  if (transaction.category === "Transfer") {
    return "transfer";
  }
  if (transaction.category === "Income" || transaction.amount > 0) {
    return "income";
  }
  return "expense";
}

function fromTransaction(transaction: Transaction | undefined, accounts: Account[]): FormState {
  return {
    kind: inferKind(transaction),
    date: transaction?.date ?? todayIso(),
    payee: transaction?.payee ?? "",
    category: transaction?.category ?? "Groceries",
    accountId: transaction?.accountId ?? accounts[0]?.id ?? "",
    transferAccountId: transaction?.transferAccountId ?? "",
    amount: transaction ? String(Math.abs(transaction.amount)) : "",
    notes: transaction?.notes ?? "",
  };
}

export function TransactionDialog({
  open,
  transaction,
  accounts,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  transaction?: Transaction;
  accounts: Account[];
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: TransactionInput) => void;
}) {
  const [form, setForm] = useState<FormState>(fromTransaction(transaction, accounts));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(fromTransaction(transaction, accounts));
      setError(null);
    }
  }, [accounts, open, transaction]);

  function handleKindChange(kind: TransactionKind) {
    setForm((current) => ({
      ...current,
      kind,
      category: kind === "income" ? "Income" : kind === "transfer" ? "Transfer" : current.category === "Income" || current.category === "Transfer" ? "Groceries" : current.category,
    }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const amount = parseMoneyInput(form.amount);
    if (!form.payee.trim()) {
      setError("Payee is required.");
      return;
    }
    if (!form.accountId) {
      setError("Choose an account.");
      return;
    }
    if (amount == null || amount <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    if (form.kind === "transfer") {
      if (!form.transferAccountId || form.transferAccountId === form.accountId) {
        setError("Choose a different destination account.");
        return;
      }
    }

    const signed = form.kind === "income" ? roundMoney(amount) : roundMoney(-amount);
    onSubmit({
      id: transaction?.id,
      date: form.date,
      payee: form.payee.trim(),
      category: form.kind === "income" ? "Income" : form.kind === "transfer" ? "Transfer" : form.category,
      accountId: form.accountId,
      amount: signed,
      notes: form.notes.trim() || undefined,
      transferAccountId: form.kind === "transfer" ? form.transferAccountId : undefined,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{transaction ? "Edit transaction" : "Add transaction"}</DialogTitle>
            <DialogDescription>Amounts update the selected account balance. Transfers move money between accounts.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5 sm:col-span-2">
              <Label>Type</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["expense", "income", "transfer"] as const).map((kind) => (
                  <Button
                    key={kind}
                    type="button"
                    variant={form.kind === kind ? "default" : "outline"}
                    onClick={() => handleKindChange(kind)}
                    className="capitalize"
                  >
                    {kind}
                  </Button>
                ))}
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="txn-date">Date</Label>
              <Input
                id="txn-date"
                type="date"
                value={form.date}
                onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="txn-amount">Amount</Label>
              <Input
                id="txn-amount"
                inputMode="decimal"
                value={form.amount}
                onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
                placeholder="0.00"
              />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="txn-payee">Payee</Label>
              <Input
                id="txn-payee"
                value={form.payee}
                onChange={(event) => setForm((current) => ({ ...current, payee: event.target.value }))}
                placeholder="Whole Foods"
              />
            </div>
            {form.kind === "expense" ? (
              <div className="grid gap-1.5">
                <Label>Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(value) => setForm((current) => ({ ...current, category: value as FinanceCategory }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div className="grid gap-1.5">
              <Label>{form.kind === "transfer" ? "From" : "Account"}</Label>
              <Select
                value={form.accountId}
                onValueChange={(value) => setForm((current) => ({ ...current, accountId: value }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.kind === "transfer" ? (
              <div className="grid gap-1.5">
                <Label>To</Label>
                <Select
                  value={form.transferAccountId}
                  onValueChange={(value) => setForm((current) => ({ ...current, transferAccountId: value }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Destination" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts
                      .filter((account) => account.id !== form.accountId)
                      .map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="txn-notes">Notes (optional)</Label>
              <Textarea
                id="txn-notes"
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                placeholder="Optional detail"
              />
            </div>
          </div>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{transaction ? "Save transaction" : "Add transaction"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
