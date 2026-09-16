"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Bar, BarChart, CartesianGrid, Legend, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CATEGORY_COLORS, formatCompactMoney, formatMoney, formatMonthLabel, type CategorySpend, type MonthlyPoint } from "@/lib/finance";
import { EmptyState } from "./ui-bits";

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) {
    return null;
  }
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm dark:border-slate-700 dark:bg-slate-900">
      {label ? <p className="mb-1 font-medium text-slate-700 dark:text-slate-200">{label}</p> : null}
      {payload.map((item) => (
        <p key={item.name} style={{ color: item.color }}>
          {item.name}: {formatMoney(item.value)}
        </p>
      ))}
    </div>
  );
}

export function IncomeSpendChart({ data }: { data: MonthlyPoint[] }) {
  const chartData = data.map((row) => ({
    ...row,
    label: formatMonthLabel(row.month).replace(/ \d{4}$/, ""),
  }));

  return (
    <Card className="border-slate-200 dark:border-slate-800">
      <CardHeader>
        <CardTitle>Income vs spending</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        {chartData.length === 0 ? (
          <EmptyState title="No cashflow yet" description="Add income and expenses to see this month-by-month comparison." className="h-full border-0 bg-transparent py-8" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barGap={6}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => formatCompactMoney(Number(value))} width={56} />
              <Tooltip content={<ChartTooltip />} />
              <Legend />
              <Bar dataKey="income" name="Income" fill="#059669" radius={[6, 6, 0, 0]} />
              <Bar dataKey="spending" name="Spending" fill="#e11d48" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function CategoryDonut({ data }: { data: CategorySpend[] }) {
  const total = data.reduce((sum, row) => sum + row.amount, 0);

  return (
    <Card className="border-slate-200 dark:border-slate-800">
      <CardHeader>
        <CardTitle>Spending breakdown</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-[1fr_14rem]">
        <div className="h-64">
          {data.length === 0 ? (
            <EmptyState title="No spending this month" description="Expenses in the selected month will appear as a category mix." className="h-full border-0 bg-transparent py-8" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="amount" nameKey="category" innerRadius={62} outerRadius={90} paddingAngle={2}>
                  {data.map((row) => (
                    <Cell key={row.category} fill={CATEGORY_COLORS[row.category]} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
        <ul className="space-y-2 text-sm">
          {data.map((row) => (
            <li key={row.category} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <span className="size-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[row.category] }} />
                {row.category}
              </span>
              <span className="tabular-nums text-slate-900 dark:text-slate-50">{formatMoney(row.amount)}</span>
            </li>
          ))}
          {data.length > 0 ? (
            <li className="flex items-center justify-between border-t border-slate-200 pt-2 font-medium dark:border-slate-800">
              <span>Total</span>
              <span className="tabular-nums">{formatMoney(total)}</span>
            </li>
          ) : null}
        </ul>
      </CardContent>
    </Card>
  );
}
