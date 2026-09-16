"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateWithYear, formatMoney, type Goal } from "@/lib/finance";
import { ConfirmDialog } from "@/components/finance/confirm-dialog";
import { useFinance } from "@/components/finance/finance-context";
import { GoalDialog } from "@/components/finance/goal-dialog";
import { EmptyState, PageHeader, ProgressBar } from "@/components/finance/ui-bits";

export default function GoalsPage() {
  const { snapshot, upsertGoal, deleteGoal } = useFinance();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | undefined>();
  const [pendingDelete, setPendingDelete] = useState<Goal | undefined>();

  function openCreate() {
    setEditing(undefined);
    setDialogOpen(true);
  }

  return (
    <div>
      <PageHeader
        title="Goals"
        description="Lightweight savings targets. Update the amount saved as you go — these are not auto-linked to accounts yet."
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            Add goal
          </Button>
        }
      />

      {snapshot.goals.length === 0 ? (
        <EmptyState
          title="No goals yet"
          description="Create a target for an emergency fund, a trip, or a down payment."
          action={
            <Button onClick={openCreate}>
              <Plus className="size-4" />
              Add goal
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {snapshot.goals.map((goal) => {
            const ratio = goal.targetAmount > 0 ? Math.min(1, goal.currentAmount / goal.targetAmount) : 0;
            const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
            return (
              <Card key={goal.id} className="border-slate-200 dark:border-slate-800">
                <CardContent className="flex h-full flex-col gap-4 pt-1">
                  <div>
                    <p className="text-lg font-medium">{goal.name}</p>
                    <p className="text-sm text-slate-500">Target {formatDateWithYear(goal.targetDate)}</p>
                  </div>
                  <div>
                    <p className="text-2xl font-semibold tabular-nums">{formatMoney(goal.currentAmount)}</p>
                    <p className="text-sm text-slate-500">of {formatMoney(goal.targetAmount)}</p>
                  </div>
                  <ProgressBar value={ratio * 100} indicatorClassName="bg-emerald-600 dark:bg-emerald-400" />
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {remaining === 0 ? "Goal reached." : `${formatMoney(remaining)} to go.`}
                  </p>
                  {goal.note ? <p className="text-sm text-slate-500">{goal.note}</p> : null}
                  <div className="mt-auto flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setEditing(goal); setDialogOpen(true); }}>
                      <Pencil className="size-3.5" />
                      Edit
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => setPendingDelete(goal)}>
                      <Trash2 className="size-3.5" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <GoalDialog open={dialogOpen} goal={editing} onOpenChange={setDialogOpen} onSubmit={upsertGoal} />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={`Delete ${pendingDelete?.name ?? "goal"}?`}
        description="Progress for this savings target will be removed from this browser."
        confirmLabel="Delete goal"
        onCancel={() => setPendingDelete(undefined)}
        onConfirm={() => {
          if (pendingDelete) {
            deleteGoal(pendingDelete.id);
          }
          setPendingDelete(undefined);
        }}
      />
    </div>
  );
}
