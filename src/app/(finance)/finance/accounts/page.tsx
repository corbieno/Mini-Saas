"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ACCOUNT_TYPE_LABELS, accountTypeBadgeClass, formatMoney, isLiabilityType } from "@/lib/finance";
import { AccountDialog } from "@/components/finance/account-dialog";
import { ConfirmDialog } from "@/components/finance/confirm-dialog";
import { useFinance } from "@/components/finance/finance-context";
import { EmptyState, PageHeader } from "@/components/finance/ui-bits";
import type { Account } from "@/lib/finance";

export default function AccountsPage() {
  const { snapshot, upsertAccount, deleteAccount } = useFinance();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Account | undefined>();
  const [pendingDelete, setPendingDelete] = useState<Account | undefined>();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function openCreate() {
    setEditing(undefined);
    setDialogOpen(true);
  }

  function openEdit(account: Account) {
    setEditing(account);
    setDialogOpen(true);
  }

  return (
    <div>
      <PageHeader
        title="Accounts"
        description="Checking, savings, credit, brokerage, and loans for the demo household. Balances stay in local storage."
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            Add account
          </Button>
        }
      />

      {snapshot.accounts.length === 0 ? (
        <EmptyState
          title="No accounts yet"
          description="Add a checking or credit account to start tracking balances."
          action={
            <Button onClick={openCreate}>
              <Plus className="size-4" />
              Add account
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {snapshot.accounts.map((account) => {
            const liability = isLiabilityType(account.type);
            return (
              <Card key={account.id} className="border-slate-200 dark:border-slate-800">
                <CardContent className="flex flex-col gap-4 pt-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="size-2.5 rounded-full" style={{ backgroundColor: account.color }} />
                      <div>
                        <p className="font-medium">{account.name}</p>
                        <p className="text-sm text-slate-500">
                          {account.institution}
                          {account.lastFour ? ` · •••• ${account.lastFour}` : ""}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className={accountTypeBadgeClass(account.type)}>
                      {ACCOUNT_TYPE_LABELS[account.type]}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">{liability ? "Amount owed" : "Balance"}</p>
                    <p className={`text-2xl font-semibold tabular-nums ${liability ? "text-rose-600 dark:text-rose-400" : ""}`}>
                      {formatMoney(account.balance)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(account)}>
                      <Pencil className="size-3.5" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setDeleteError(null);
                        setPendingDelete(account);
                      }}
                    >
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

      <AccountDialog
        open={dialogOpen}
        account={editing}
        onOpenChange={setDialogOpen}
        onSubmit={upsertAccount}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={`Delete ${pendingDelete?.name ?? "account"}?`}
        description={
          deleteError ??
          "This cannot be undone. Accounts with transactions must have those transactions removed first."
        }
        confirmLabel={deleteError ? "OK" : "Delete account"}
        onCancel={() => {
          setPendingDelete(undefined);
          setDeleteError(null);
        }}
        onConfirm={() => {
          if (!pendingDelete) {
            return;
          }
          if (deleteError) {
            setPendingDelete(undefined);
            setDeleteError(null);
            return;
          }
          const result = deleteAccount(pendingDelete.id);
          if (!result.ok) {
            setDeleteError(result.reason);
            return;
          }
          setPendingDelete(undefined);
        }}
      />
    </div>
  );
}
