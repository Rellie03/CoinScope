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
          <p className="text-xs uppercase tracking-wider text-muted">Worth today</p>
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

// Shown only when Fault found an error AND returned a complete
// low-mid-high error range. The numbers are estimates for this type WITH
// the error, if the error is genuine and confirmed — not an appraisal.
export function ErrorValueBar({
  low,
  mid,
  high,
  errorLabel,
}: {
  low: number;
  mid: number;
  high: number;
  errorLabel: string;
}) {
  const span = Math.max(high - low, 1);
  const midPct = Math.min(100, Math.max(0, ((mid - low) / span) * 100));

  return (
    <div className="space-y-3 rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted">
            Could be worth with this error
          </p>
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
      </div>
      <p className="text-xs leading-relaxed text-muted">
        Estimate for this type with a {errorLabel}, if the error is genuine and
        confirmed — not an appraisal.
      </p>
    </div>
  );
}
