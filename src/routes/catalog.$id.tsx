import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { CoinFace } from "@/components/coin/coin-face";
import { DualPanel } from "@/components/coin/dual-panel";
import { ValueBar } from "@/components/coin/value-bar";
import { CATALOG_BY_ID, DISCLAIMER_NOTE } from "@/lib/coins/catalog";
import { dualFromCatalog, makeScan } from "@/lib/coins/dual";
import { useCabinetStore } from "@/lib/coins/store";
import { METAL_LABEL, RARITY_LABEL } from "@/lib/coins/types";
import { formatUsd } from "@/lib/format";

export const Route = createFileRoute("/catalog/$id")({ component: CatalogDetail });

function CatalogDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const rememberScan = useCabinetStore((s) => s.rememberScan);
  const addToCabinet = useCabinetStore((s) => s.addToCabinet);
  const coin = CATALOG_BY_ID[id];

  if (!coin) {
    return (
      <div className="space-y-3 py-16 text-center">
        <h1 className="font-display text-2xl">Not in the cabinet</h1>
        <Button asChild>
          <Link to="/catalog">Back to catalog</Link>
        </Button>
      </div>
    );
  }

  const dual = dualFromCatalog(coin);

  function openReading() {
    const scan = makeScan({
      source: "catalog",
      identification: dual.identification,
      fault: dual.fault,
      obverseUrl: coin.image ?? undefined,
    });
    rememberScan(scan);
    void navigate({ to: "/result/$scanId", params: { scanId: scan.id } });
  }

  function save() {
    const scan = makeScan({
      source: "catalog",
      identification: dual.identification,
      fault: dual.fault,
      obverseUrl: coin.image ?? undefined,
    });
    rememberScan(scan);
    addToCabinet(scan);
    void navigate({ to: "/cabinet" });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <Link to="/catalog" className="text-xs text-muted hover:text-fg">
        Catalog
      </Link>
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
        <CoinFace src={coin.image} metal={coin.metal} name={coin.shortName} className="w-44 sm:w-52" />
        <div className="w-full space-y-4 text-center sm:text-left">
          <p className="text-xs uppercase tracking-wider text-muted">
            {coin.era} · {coin.region} · {RARITY_LABEL[coin.rarity]}
          </p>
          <h1 className="font-display text-3xl leading-tight">{coin.name}</h1>
          <p className="text-sm text-muted">
            {METAL_LABEL[coin.metal]} · {coin.fineness}
          </p>
          <ValueBar
            low={coin.estimatedValueLow}
            mid={coin.estimatedValueMid}
            high={coin.estimatedValueHigh}
            melt={coin.meltValue}
          />
          <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
            <Button onClick={openReading}>Run dual AI reading</Button>
            <Button variant="secondary" onClick={save}>
              Add to cabinet
            </Button>
          </div>
        </div>
      </div>

      <DualPanel identification={dual.identification} fault={dual.fault} />

      <section className="space-y-2">
        <h2 className="font-display text-xl">History</h2>
        <p className="text-sm leading-relaxed text-muted">{coin.history}</p>
      </section>

      {coin.comps.length ? (
        <section className="space-y-3">
          <h2 className="font-display text-xl">Auction comps</h2>
          <ul className="divide-y divide-border rounded-xl bg-surface shadow-[var(--shadow-border)]">
            {coin.comps.map((c) => (
              <li key={`${c.house}-${c.date}`} className="flex justify-between px-4 py-3 text-sm">
                <span className="text-muted">
                  {c.house} · {c.grade} · {c.date}
                </span>
                <span className="font-mono tabular-nums">{formatUsd(c.hammer)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="text-xs text-faint">{DISCLAIMER_NOTE}</p>
    </div>
  );
}
