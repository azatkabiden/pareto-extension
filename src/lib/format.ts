export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: Math.abs(value) >= 10_000 ? 0 : 2,
  }).format(value);
}

export function formatSignedCurrency(value: number): string {
  const formatted = formatCurrency(Math.abs(value));
  return `${value >= 0 ? "+" : "-"}${formatted}`;
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatSol(value: number): string {
  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: value >= 10 ? 2 : 4,
  }).format(value)} SOL`;
}
