import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CoinCard } from "@/components/coin/coin-card";
import { Input } from "@/components/ui/input";
import { CATALOG, searchCatalog } from "@/lib/coins/catalog";
import type { Metal } from "@/lib/coins/types";
import { METAL_LABEL } from "@/lib/coins/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/catalog")({ component: CatalogPage });

const METAL_FILTERS: Array<Metal | "all" | "error"> = [
  "all",
  "gold",
  "silver",
  "copper",
  "error",
];

function CatalogPage() {
  const [q, setQ] = useState("");
  const [metal, setMetal] = useState<(typeof METAL_FILTERS)[number]>("all");

  const coins = useMemo(() => {
    let list = searchCatalog(q);
    if (metal === "error") list = list.filter((c) => c.errorCoin);
    else if (metal !== "all") list = list.filter((c) => c.metal === metal);
    return list;
  }, [q, metal]);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl">Catalog</h1>
        <p className="max-w-xl text-sm text-muted">
          A working type set — world trade silver, U.S. classics, bullion, and one famous mint error.
        </p>
      </header>

      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search name, mint, designer…"
        aria-label="Search catalog"
      />

      <div className="flex flex-wrap gap-2">
        {METAL_FILTERS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setMetal(key)}
            className={cn(
              "h-10 rounded-full px-3 text-xs transition-colors duration-150",
              metal === key ? "bg-primary text-primary-fg" : "bg-surface text-muted shadow-[var(--shadow-border)]",
            )}
          >
            {key === "all" ? "All" : key === "error" ? "Mint errors" : METAL_LABEL[key]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {coins.map((coin) => (
          <CoinCard key={coin.id} coin={coin} />
        ))}
      </div>

      {coins.length === 0 ? (
        <p className="text-sm text-muted">Nothing matches. Try a metal, a country, or a year.</p>
      ) : (
        <p className="text-xs text-muted">{coins.length} of {CATALOG.length} types</p>
      )}
    </div>
  );
}
