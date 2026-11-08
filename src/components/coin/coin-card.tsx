import { Link } from "@tanstack/react-router";
import { CoinFace } from "@/components/coin/coin-face";
import { formatUsd } from "@/lib/format";
import type { CatalogCoin } from "@/lib/coins/types";
import { RARITY_LABEL } from "@/lib/coins/types";

export function CoinCard({ coin }: { coin: CatalogCoin }) {
  return (
    <Link
      to="/catalog/$id"
      params={{ id: coin.id }}
      className="group flex flex-col rounded-xl bg-surface p-3 shadow-[var(--shadow-border)] transition-[box-shadow,transform] duration-200 ease-out hover:shadow-[var(--shadow-border-hover)]"
    >
      <CoinFace src={coin.image} metal={coin.metal} name={coin.shortName} className="mx-auto w-[72%]" />
      <div className="mt-3 space-y-1 px-1">
        <p className="font-display text-base leading-snug text-fg">{coin.shortName}</p>
        <p className="text-xs text-muted">
          {coin.year} · {coin.country}
        </p>
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-muted">{RARITY_LABEL[coin.rarity]}</span>
          <span className="font-mono text-xs tabular-nums text-fg">{formatUsd(coin.estimatedValueMid)}</span>
        </div>
        {coin.errorCoin ? (
          <p className="pt-1 text-[11px] uppercase tracking-wider text-destructive">Mint error</p>
        ) : null}
      </div>
    </Link>
  );
}
