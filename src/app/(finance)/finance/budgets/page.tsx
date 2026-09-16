"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { budgetProgress, formatMoney, formatMonthLabel, spendingByCategory, type Budget } from "@/lib/finance";
import { BudgetDialog } from "@/components/finance/budget-dialog";
import { CategoryDonut } from "@/components/finance/charts";
import { ConfirmDialog } from "@/components/finance/confirm-dialog";
import { useFinance } from "@/components/finance/finance-context";
import { EmptyState, PageHeader, ProgressBar } from "@/components/finance/ui-bits";

export default function BudgetsPage() {
  const { snapshot, selectedMonth, upsertBudget, deleteBudget } = useFinance();
  const rows = budgetProgress(snapshot.budgets, snapshot.transactions, selectedMonth);
  const breakdown = spendingByCategory(snapshot.transactions, selectedMonth);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Budget | undefined>();
  const [pendingDelete, setPendingDelete] = useState<Budget | undefined>();

  function openCreate() {
    setEditing(undefined);
    setDialogOpen(true);
  }

  return (
    <div>
      <PageHeader
        title="Budgets"
        description={`Category limits for ${formatMonthLabel(selectedMonth)}. Progress is spent vs limit in the selected month.`}
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            Add budget
          </Button>
        }
      />

      <div className="mb-6">
        <CategoryDonut data={breakdown} />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No budgets yet"
          description="Set a monthly limit for groceries, dining, or any other category."
          action={
            <Button onClick={openCreate}>
              <Plus className="size-4" />
              Add budget
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4">
          {rows.map((budget) => {
            const over = budget.over;
            return (
              <Card key={budget.id} className="border-slate-200 dark:border-slate-800">
                <CardContent className="grid gap-3 pt-1">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{budget.category}</p>
                      <p className="text-sm text-slate-500">
                        {formatMoney(budget.spent)} of {formatMoney(budget.limit)}
                        {over ? ` · ${formatMoney(budget.spent - budget.limit)} over` : ` · ${formatMoney(budget.remaining)} left`}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => { setEditing(budget); setDialogOpen(true); }}>
                        <Pencil className="size-3.5" />
                        Edit
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => setPendingDelete(budget)}>
                        <Trash2 className="size-3.5" />
                        Delete
                      </Button>
                    </div>
                  </div>
                  <ProgressBar
                    value={budget.ratio * 100}
                    indicatorClassName={over ? "bg-rose-600 dark:bg-rose-400" : "bg-emerald-600 dark:bg-emerald-400"}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <BudgetDialog open={dialogOpen} budget={editing} onOpenChange={setDialogOpen} onSubmit={upsertBudget} />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={`Delete the ${pendingDelete?.category ?? ""} budget?`}
        description="Spending history stays. Only the monthly limit is removed."
        confirmLabel="Delete budget"
        onCancel={() => setPendingDelete(undefined)}
        onConfirm={() => {
          if (pendingDelete) {
            deleteBudget(pendingDelete.id);
          }
          setPendingDelete(undefined);
        }}
      />
    </div>
  );
}
