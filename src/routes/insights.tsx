import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { DISCLAIMER_NOTE } from "@/lib/coins/catalog";
import { useCabinetStore } from "@/lib/coins/store";
import { METAL_LABEL, RARITY_LABEL, valueAtGrade } from "@/lib/coins/types";
import { formatUsd } from "@/lib/format";

export const Route = createFileRoute("/insights")({ component: InsightsPage });

function InsightsPage() {
  const hydrated = useCabinetStore((s) => s.hydrated);
  const cabinet = useCabinetStore((s) => s.cabinet);
  const history = useCabinetStore((s) => s.history);
  const total = useCabinetStore((s) => s.cabinetTotal());

  const metalMix = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of cabinet) {
      const v = valueAtGrade(item.identification, item.grade).mid;
      const key = METAL_LABEL[item.identification.metal];
      map.set(key, (map.get(key) ?? 0) + v);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [cabinet]);

  const rarityMix = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of cabinet) {
      const key = RARITY_LABEL[item.identification.rarity];
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()];
  }, [cabinet]);

  const errors = cabinet.filter((c) => c.fault.hasError).length;

  const chart = useMemo(() => {
    const points =
      history.length > 0
        ? history
        : cabinet.length
          ? [{ at: Date.now(), total }]
          : [];
    return points.map((p) => ({
      t: new Date(p.at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      total: Math.round(p.total),
    }));
  }, [history, cabinet.length, total]);

  if (!hydrated) {
    return <p className="text-sm text-muted">Tallying the cabinet…</p>;
  }

  if (cabinet.length === 0) {
    return (
      <div className="space-y-4 py-10">
        <h1 className="font-display text-3xl">Insights</h1>
        <p className="max-w-md text-sm text-muted">
          Value over time, metal mix, and error count appear once the cabinet holds a piece.
        </p>
        <Button asChild>
          <Link to="/">Identify a coin</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Insights</h1>
          <p className="mt-1 text-sm text-muted">Reference totals only — markets move.</p>
        </div>
        <p className="font-display text-3xl tabular-nums">{formatUsd(total)}</p>
      </header>

      <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
        <h2 className="mb-4 text-xs uppercase tracking-wider text-muted">Cabinet value</h2>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="val" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#c9cdd4" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#c9cdd4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="t" tick={{ fill: "#8f8b84", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fill: "#8f8b84", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={48}
                tickFormatter={(n: number) => `$${n}`}
              />
              <Tooltip
                contentStyle={{
                  background: "#141414",
                  border: "1px solid #2c2c2e",
                  borderRadius: 12,
                  color: "#f3f1ec",
                }}
                formatter={(v: number) => [formatUsd(v), "Total"]}
              />
              <Area type="monotone" dataKey="total" stroke="#c9cdd4" fill="url(#val)" strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Pieces" value={String(cabinet.length)} />
        <Stat label="Mint errors" value={String(errors)} />
        <Stat
          label="Top metal"
          value={metalMix[0]?.[0] ?? "—"}
        />
      </div>

      <section className="grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="mb-3 font-display text-xl">Metal</h2>
          <ul className="space-y-2">
            {metalMix.map(([label, value]) => (
              <li key={label} className="flex justify-between text-sm">
                <span className="text-muted">{label}</span>
                <span className="tabular-nums">{formatUsd(value)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="mb-3 font-display text-xl">Rarity</h2>
          <ul className="space-y-2">
            {rarityMix.map(([label, n]) => (
              <li key={label} className="flex justify-between text-sm">
                <span className="text-muted">{label}</span>
                <span className="tabular-nums">{n}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <p className="text-xs text-faint">{DISCLAIMER_NOTE}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface px-4 py-4 shadow-[var(--shadow-border)]">
      <p className="text-xs uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl">{value}</p>
    </div>
  );
}
