const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const usdFine = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

export function formatUsd(n: number, fine = false) {
  if (!Number.isFinite(n)) return "—";
  return (fine || Math.abs(n) < 20 ? usdFine : usd).format(n);
}

export function formatRange(low: number, high: number) {
  return `${formatUsd(low)} – ${formatUsd(high)}`;
}

export function formatGrams(n: number) {
  return `${n.toFixed(n >= 10 ? 2 : 3)} g`;
}

export function formatMm(n: number) {
  return `${n.toFixed(1)} mm`;
}
