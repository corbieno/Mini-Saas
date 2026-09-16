import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/finance";

export function MoneyText({
  amount,
  signed = false,
  className,
  absolute = false,
}: {
  amount: number;
  signed?: boolean;
  className?: string;
  absolute?: boolean;
}) {
  const display = absolute ? Math.abs(amount) : amount;
  const tone =
    signed && amount < 0
      ? "text-rose-600 dark:text-rose-400"
      : signed && amount > 0
        ? "text-emerald-600 dark:text-emerald-400"
        : "text-slate-900 dark:text-slate-50";

  return <span className={cn("tabular-nums", tone, className)}>{formatMoney(display)}</span>;
}
