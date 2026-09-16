export function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function formatMoney(value: number, options?: { sign?: "auto" | "never" }) {
  const signDisplay = options?.sign === "never" ? "never" : "auto";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    signDisplay,
  }).format(value);
}

export function formatCompactMoney(value: number) {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    return `${value < 0 ? "-" : ""}$${(abs / 1_000_000).toFixed(1)}M`;
  }
  if (abs >= 10_000) {
    return `${value < 0 ? "-" : ""}$${Math.round(abs / 1000)}k`;
  }
  return formatMoney(value);
}

export function parseMoneyInput(raw: string) {
  const cleaned = raw.replace(/[$,\s]/g, "");
  const amount = Number(cleaned);
  if (!Number.isFinite(amount)) {
    return null;
  }
  return roundMoney(amount);
}

export function monthKeyFromDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function monthKeyFromIso(isoDate: string) {
  return isoDate.slice(0, 7);
}

export function formatMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  if (!year || !month) {
    return monthKey;
  }
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(
    new Date(year, month - 1, 1),
  );
}

export function formatShortDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) {
    return isoDate;
  }
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
    new Date(year, month - 1, day),
  );
}

export function formatDateWithYear(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) {
    return isoDate;
  }
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(year, month - 1, day),
  );
}

export function isoDateFromParts(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function shiftMonth(monthKey: string, delta: number) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return monthKeyFromDate(date);
}

export function todayIso(now = new Date()) {
  return isoDateFromParts(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

export function compareIsoDates(a: string, b: string) {
  return a.localeCompare(b);
}
