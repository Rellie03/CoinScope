import { formatUsd } from "@/lib/format";

export function ValueBar({
  low,
  mid,
  high,
  melt,
}: {
  low: number;
  mid: number;
  high: number;
  melt: number | null;
}) {
  const span = Math.max(high - low, 1);
  const midPct = Math.min(100, Math.max(0, ((mid - low) / span) * 100));
  const meltPct =
    melt == null ? null : Math.min(100, Math.max(0, ((melt - low) / span) * 100));

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted">Reference range</p>
          <p className="font-display text-3xl tabular-nums leading-none text-fg">
            {formatUsd(mid)}
          </p>
        </div>
        <p className="text-right text-sm tabular-nums text-muted">
          {formatUsd(low)} – {formatUsd(high)}
        </p>
      </div>
      <div className="relative h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-primary/70"
          style={{ width: `${midPct}%` }}
        />
        {meltPct != null && melt != null && melt >= low && melt <= high ? (
          <span
            className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-muted"
            style={{ left: `${meltPct}%` }}
            title="Melt"
          />
        ) : null}
      </div>
      {melt != null ? (
        <p className="text-xs text-muted">
          Melt {formatUsd(melt, true)}
          {mid > melt ? ` · numismatic premium ${formatUsd(mid - melt, true)}` : ""}
        </p>
      ) : null}
    </div>
  );
}
