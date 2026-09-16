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
import { EXPENSE_CATEGORIES, parseMoneyInput, type Budget, type BudgetInput } from "@/lib/finance";

export function BudgetDialog({
  open,
  budget,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  budget?: Budget;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: BudgetInput) => void;
}) {
  const [category, setCategory] = useState<(typeof EXPENSE_CATEGORIES)[number]>("Groceries");
  const [limit, setLimit] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setCategory(budget?.category ?? "Groceries");
      setLimit(budget ? String(budget.limit) : "");
      setError(null);
    }
  }, [budget, open]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const amount = parseMoneyInput(limit);
    if (amount == null || amount <= 0) {
      setError("Enter a monthly limit greater than zero.");
      return;
    }
    onSubmit({ id: budget?.id, category, limit: amount });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{budget ? "Edit budget" : "Add budget"}</DialogTitle>
            <DialogDescription>Monthly spending limit for one category. Progress uses the selected month.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={(value) => setCategory(value as typeof category)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="budget-limit">Monthly limit</Label>
              <Input
                id="budget-limit"
                inputMode="decimal"
                value={limit}
                onChange={(event) => setLimit(event.target.value)}
                placeholder="600.00"
              />
            </div>
          </div>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{budget ? "Save budget" : "Add budget"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
