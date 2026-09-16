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
import { Textarea } from "@/components/ui/textarea";
import { parseMoneyInput, type Goal, type GoalInput } from "@/lib/finance";

export function GoalDialog({
  open,
  goal,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  goal?: Goal;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: GoalInput) => void;
}) {
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(goal?.name ?? "");
      setTargetAmount(goal ? String(goal.targetAmount) : "");
      setCurrentAmount(goal ? String(goal.currentAmount) : "");
      setTargetDate(goal?.targetDate ?? "");
      setNote(goal?.note ?? "");
      setError(null);
    }
  }, [goal, open]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const target = parseMoneyInput(targetAmount);
    const current = parseMoneyInput(currentAmount || "0");
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (target == null || target <= 0) {
      setError("Enter a target greater than zero.");
      return;
    }
    if (current == null || current < 0) {
      setError("Enter a valid amount saved.");
      return;
    }
    if (!targetDate) {
      setError("Pick a target date.");
      return;
    }
    onSubmit({
      id: goal?.id,
      name: name.trim(),
      targetAmount: target,
      currentAmount: current,
      targetDate,
      note: note.trim() || undefined,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{goal ? "Edit goal" : "Add goal"}</DialogTitle>
            <DialogDescription>Track progress toward a savings target. Totals are independent of account balances.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="goal-name">Name</Label>
              <Input id="goal-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Emergency fund" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="goal-current">Saved so far</Label>
                <Input
                  id="goal-current"
                  inputMode="decimal"
                  value={currentAmount}
                  onChange={(event) => setCurrentAmount(event.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="goal-target">Target</Label>
                <Input
                  id="goal-target"
                  inputMode="decimal"
                  value={targetAmount}
                  onChange={(event) => setTargetAmount(event.target.value)}
                  placeholder="25000"
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="goal-date">Target date</Label>
              <Input id="goal-date" type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="goal-note">Note (optional)</Label>
              <Textarea id="goal-note" value={note} onChange={(event) => setNote(event.target.value)} />
            </div>
          </div>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{goal ? "Save goal" : "Add goal"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
