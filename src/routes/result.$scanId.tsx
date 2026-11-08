import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CoinFace } from "@/components/coin/coin-face";
import { DualPanel } from "@/components/coin/dual-panel";
import { ValueBar } from "@/components/coin/value-bar";
import { DISCLAIMER_NOTE } from "@/lib/coins/catalog";
import { useCabinetStore } from "@/lib/coins/store";
import { GRADE_OPTIONS, RARITY_LABEL, METAL_LABEL, valueAtGrade, type GradeKey } from "@/lib/coins/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/result/$scanId")({ component: ResultPage });

function ResultPage() {
  const { scanId } = Route.useParams();
  const scan = useCabinetStore((s) => s.getScan(scanId));
  const inCabinet = useCabinetStore((s) => s.inCabinet(scanId));
  const addToCabinet = useCabinetStore((s) => s.addToCabinet);
  const removeFromCabinet = useCabinetStore((s) => s.removeFromCabinet);
  const updateGrade = useCabinetStore((s) => s.updateGrade);
  const hydrated = useCabinetStore((s) => s.hydrated);

  const values = useMemo(() => {
    if (!scan) return null;
    return valueAtGrade(scan.identification, scan.grade);
  }, [scan]);

  if (!hydrated) {
    return <p className="text-sm text-muted">Loading the reading…</p>;
  }

  if (!scan || !values) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-16 text-center">
        <h1 className="font-display text-2xl">This reading is gone</h1>
        <p className="text-sm text-muted">Scan again, or open a piece from the catalog.</p>
        <Button asChild>
          <Link to="/">Back to the loupe</Link>
        </Button>
      </div>
    );
  }

  const ident = scan.identification;
  const photo = scan.obverseUrl;
  const currentId = scan.id;
  const currentScan = scan;

  function onGrade(g: GradeKey) {
    updateGrade(currentId, g);
  }

  function onCabinet() {
    if (inCabinet) {
      removeFromCabinet(currentId);
      toast("Removed from cabinet");
    } else {
      addToCabinet(currentScan);
      toast("Added to cabinet");
    }
  }

  const specs = [
    ["Country", ident.country],
    ["Year", ident.year],
    ["Mint", ident.mint],
    ["Mint mark", ident.mintMark],
    ["Metal", METAL_LABEL[ident.metal]],
    ["Fineness", ident.fineness],
    ["Weight", ident.weightGrams ? `${ident.weightGrams} g` : "—"],
    ["Diameter", ident.diameterMm ? `${ident.diameterMm} mm` : "—"],
    ["Edge", ident.edge],
    ["Designer", ident.designer],
    ["Strike", ident.strike],
    ["Rarity", RARITY_LABEL[ident.rarity]],
  ];

  return (
    <div className="stagger-in mx-auto max-w-2xl space-y-8">
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
        <CoinFace
          src={photo}
          metal={ident.metal}
          name={ident.shortName}
          className="w-44 shrink-0 sm:w-52"
        />
        <div className="w-full space-y-4 text-center sm:text-left">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted">
              {ident.identified ? "Identified" : "Uncertain"} · {ident.strike}
            </p>
            <h1 className="mt-1 font-display text-3xl leading-tight">{ident.name}</h1>
            <p className="mt-1 text-sm text-muted">{ident.variety}</p>
          </div>
          <ValueBar
            low={values.low}
            mid={values.mid}
            high={values.high}
            melt={ident.meltValue}
          />
          <Button className="w-full sm:w-auto" onClick={onCabinet} variant={inCabinet ? "secondary" : "default"}>
            {inCabinet ? (
              <>
                <Check /> In cabinet
              </>
            ) : (
              "Add to cabinet"
            )}
          </Button>
          {inCabinet ? (
            <button
              type="button"
              onClick={onCabinet}
              className="ml-3 inline-flex items-center gap-1 text-xs text-muted hover:text-fg"
            >
              <Trash2 className="size-3.5" />
              Remove
            </button>
          ) : null}
        </div>
      </div>

      <DualPanel identification={ident} fault={scan.fault} />

      <section className="space-y-3">
        <h2 className="text-xs uppercase tracking-wider text-muted">Grade the piece</h2>
        <div className="flex flex-wrap gap-2">
          {GRADE_OPTIONS.map((g) => (
            <button
              key={g.key}
              type="button"
              onClick={() => onGrade(g.key)}
              className={cn(
                "h-10 rounded-full px-3 text-xs transition-colors duration-150",
                scan.grade === g.key
                  ? "bg-primary text-primary-fg"
                  : "bg-surface text-muted shadow-[var(--shadow-border)] hover:text-fg",
              )}
            >
              {g.key}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted">
          Ranges move with condition. The mid is a typical {scan.grade} for this type — not an appraisal.
        </p>
      </section>

      {ident.history ? (
        <section className="space-y-2">
          <h2 className="font-display text-xl">History</h2>
          <p className="text-sm leading-relaxed text-muted">{ident.history}</p>
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 font-display text-xl">Specifications</h2>
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-border sm:grid-cols-3">
          {specs.map(([label, value]) => (
            <div key={label} className="bg-surface px-3 py-3">
              <dt className="text-[11px] uppercase tracking-wider text-muted">{label}</dt>
              <dd className="mt-1 text-sm text-fg">{value || "—"}</dd>
            </div>
          ))}
        </dl>
      </section>

      {ident.comps.length ? (
        <section className="space-y-3">
          <h2 className="font-display text-xl">Auction comps</h2>
          <ul className="divide-y divide-border rounded-xl bg-surface shadow-[var(--shadow-border)]">
            {ident.comps.map((c) => (
              <li key={`${c.house}-${c.date}-${c.grade}`} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-sm text-fg">
                    {c.house} · {c.grade}
                  </p>
                  <p className="text-xs text-muted">{c.date}</p>
                </div>
                <p className="font-mono text-sm tabular-nums">
                  {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
                    c.hammer,
                  )}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {ident.similar.length ? (
        <section className="space-y-2">
          <h2 className="font-display text-xl">Related</h2>
          <ul className="space-y-2">
            {ident.similar.map((s) => (
              <li key={s.name} className="text-sm">
                {s.id ? (
                  <Link to="/catalog/$id" params={{ id: s.id }} className="text-fg underline-offset-4 hover:underline">
                    {s.name}
                  </Link>
                ) : (
                  <span className="text-fg">{s.name}</span>
                )}
                <span className="text-muted"> — {s.note}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="text-xs leading-relaxed text-faint">{DISCLAIMER_NOTE}</p>
    </div>
  );
}
