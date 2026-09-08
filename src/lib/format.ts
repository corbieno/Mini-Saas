export function formatUsd(value: number | string | null | undefined, fallback = "Custom") {
  if (value == null || value === "") {
    return fallback;
  }

  const amount = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(amount)) {
    return fallback;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

export function formatAppPrice(price: number | string | null | undefined, pricingModel = "subscription") {
  const formatted = formatUsd(price);
  if (formatted === "Custom") {
    return formatted;
  }

  if (pricingModel === "one_time") {
    return formatted;
  }

  return `${formatted}/mo`;
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function formatDateLabel(value: string | Date | null | undefined) {
  if (!value) {
    return "—";
  }

  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.valueOf())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}
