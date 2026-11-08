import { cn } from "@/lib/utils";
import type { Metal } from "@/lib/coins/types";

export function CoinFace({
  src,
  metal,
  name,
  className,
}: {
  src?: string | null;
  metal: Metal;
  name: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative aspect-square overflow-hidden rounded-full loupe-ring",
        className,
      )}
    >
      {src ? (
        <img src={src} alt={name} className="size-full object-cover" />
      ) : (
        <div className={cn("relative flex size-full items-center justify-center", `coin-metal-${metal}`)}>
          <div className="absolute inset-0 bg-bg/35" />
          <div className="relative px-5 text-center">
            <p className="font-display text-base leading-snug text-fg">{name}</p>
          </div>
        </div>
      )}
    </div>
  );
}
