import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { CoinFace } from "@/components/coin/coin-face";
import { useCabinetStore } from "@/lib/coins/store";
import { valueAtGrade } from "@/lib/coins/types";
import { formatUsd } from "@/lib/format";

export const Route = createFileRoute("/cabinet")({ component: CabinetPage });

function CabinetPage() {
  const hydrated = useCabinetStore((s) => s.hydrated);
  const cabinet = useCabinetStore((s) => s.cabinet);
  const total = useCabinetStore((s) => s.cabinetTotal());
  const removeFromCabinet = useCabinetStore((s) => s.removeFromCabinet);

  if (!hydrated) {
    return <p className="text-sm text-muted">Opening the cabinet…</p>;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Cabinet</h1>
          <p className="mt-1 text-sm text-muted">
            {cabinet.length === 0
              ? "Empty. Identify a piece, or lift one from the catalog."
              : `${cabinet.length} piece${cabinet.length === 1 ? "" : "s"}`}
          </p>
        </div>
        {cabinet.length ? (
          <p className="font-display text-2xl tabular-nums">{formatUsd(total)}</p>
        ) : null}
      </header>

      {cabinet.length === 0 ? (
        <div className="rounded-xl bg-surface px-5 py-10 text-center shadow-[var(--shadow-border)]">
          <p className="text-sm text-muted">
            Start with a sample strike — including the 1955 doubled die, so you can see Fault at work.
          </p>
          <Button asChild className="mt-4">
            <Link to="/">Open the loupe</Link>
          </Button>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {cabinet.map((item) => {
            const v = valueAtGrade(item.identification, item.grade);
            return (
              <li key={item.id} className="flex gap-3 rounded-xl bg-surface p-3 shadow-[var(--shadow-border)]">
                <Link
                  to="/result/$scanId"
                  params={{ scanId: item.id }}
                  className="w-20 shrink-0"
                >
                  <CoinFace
                    src={item.obverseUrl}
                    metal={item.identification.metal}
                    name={item.identification.shortName}
                  />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link to="/result/$scanId" params={{ scanId: item.id }} className="block">
                    <p className="truncate font-display text-lg leading-snug">
                      {item.identification.shortName}
                    </p>
                    <p className="text-xs text-muted">
                      {item.identification.year} · {item.grade}
                      {item.fault.hasError ? " · Error" : ""}
                    </p>
                    <p className="mt-2 font-mono text-sm tabular-nums">{formatUsd(v.mid)}</p>
                  </Link>
                  <button
                    type="button"
                    className="mt-2 text-xs text-muted hover:text-fg"
                    onClick={() => removeFromCabinet(item.id)}
                  >
                    Remove
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
