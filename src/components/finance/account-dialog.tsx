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
import {
  ACCOUNT_TYPES,
  ACCOUNT_TYPE_LABELS,
  isLiabilityType,
  parseMoneyInput,
  type Account,
  type AccountInput,
  type AccountType,
} from "@/lib/finance";

const COLOR_PRESETS = ["#2563eb", "#059669", "#d97706", "#7c3aed", "#4f46e5", "#e11d48", "#0f766e", "#64748b"];

type FormState = {
  name: string;
  institution: string;
  type: AccountType;
  balance: string;
  lastFour: string;
  color: string;
};

function fromAccount(account?: Account): FormState {
  return {
    name: account?.name ?? "",
    institution: account?.institution ?? "",
    type: account?.type ?? "checking",
    balance: account ? String(account.balance) : "",
    lastFour: account?.lastFour ?? "",
    color: account?.color ?? COLOR_PRESETS[0],
  };
}

export function AccountDialog({
  open,
  account,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  account?: Account;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: AccountInput) => void;
}) {
  const [form, setForm] = useState<FormState>(fromAccount(account));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(fromAccount(account));
      setError(null);
    }
  }, [account, open]);

  const liability = isLiabilityType(form.type);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const balance = parseMoneyInput(form.balance || "0");
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    if (balance == null || balance < 0) {
      setError(liability ? "Enter the amount owed as a positive number." : "Enter a valid balance.");
      return;
    }
    onSubmit({
      id: account?.id,
      name: form.name.trim(),
      institution: form.institution.trim() || "Other",
      type: form.type,
      balance,
      lastFour: form.lastFour.trim() || undefined,
      color: form.color,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{account ? "Edit account" : "Add account"}</DialogTitle>
            <DialogDescription>
              {liability
                ? "Credit cards and loans store the amount you currently owe."
                : "Asset balances are what you have on hand or invested."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="account-name">Name</Label>
              <Input
                id="account-name"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Everyday Checking"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="account-institution">Institution</Label>
              <Input
                id="account-institution"
                value={form.institution}
                onChange={(event) => setForm((current) => ({ ...current, institution: event.target.value }))}
                placeholder="Chase"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Type</Label>
              <Select
                value={form.type}
                onValueChange={(value) => setForm((current) => ({ ...current, type: value as AccountType }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {ACCOUNT_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="account-balance">{liability ? "Amount owed" : "Balance"}</Label>
              <Input
                id="account-balance"
                inputMode="decimal"
                value={form.balance}
                onChange={(event) => setForm((current) => ({ ...current, balance: event.target.value }))}
                placeholder="0.00"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="account-last-four">Last four (optional)</Label>
              <Input
                id="account-last-four"
                maxLength={4}
                value={form.lastFour}
                onChange={(event) => setForm((current) => ({ ...current, lastFour: event.target.value }))}
                placeholder="4821"
              />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PRESETS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={`Use color ${color}`}
                    onClick={() => setForm((current) => ({ ...current, color }))}
                    className="size-7 rounded-full ring-offset-2"
                    style={{
                      backgroundColor: color,
                      boxShadow: form.color === color ? `0 0 0 2px white, 0 0 0 4px ${color}` : undefined,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{account ? "Save account" : "Add account"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
