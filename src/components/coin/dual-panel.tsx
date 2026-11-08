import { Aperture, ScanSearch } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ErrorFinding, Identification } from "@/lib/coins/types";
import { ERROR_LABEL } from "@/lib/coins/types";

export function DualPanel({
  identification,
  fault,
}: {
  identification: Identification;
  fault: ErrorFinding;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <article className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
        <header className="mb-3 flex items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted">
            <Aperture className="size-3.5" strokeWidth={1.6} />
            Lens
          </p>
          <Badge>{Math.round(identification.confidence)}% identity</Badge>
        </header>
        <h3 className="font-display text-xl leading-snug text-fg">{identification.name}</h3>
        <p className="mt-1 text-sm text-muted">
          {identification.year} · {identification.mint} · {identification.denomination}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-fg/90">{identification.identificationNotes}</p>
        {identification.curatorNote ? (
          <p className="mt-3 text-sm leading-relaxed text-muted">{identification.curatorNote}</p>
        ) : null}
      </article>

      <article
        className={cn(
          "rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]",
          fault.hasError && "shadow-[0_0_0_1px_rgba(196,92,74,0.45)]",
        )}
      >
        <header className="mb-3 flex items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted">
            <ScanSearch className="size-3.5" strokeWidth={1.6} />
            Fault
          </p>
          <Badge className={fault.hasError ? "text-destructive" : undefined}>
            {fault.available ? ERROR_LABEL[fault.category] : "Unavailable"}
          </Badge>
        </header>
        <h3 className="font-display text-xl leading-snug text-fg">{fault.title}</h3>
        <p className="mt-3 text-sm leading-relaxed text-fg/90">{fault.summary}</p>
        {fault.tells.length ? (
          <ul className="mt-3 space-y-1 text-sm text-muted">
            {fault.tells.map((t) => (
              <li key={t} className="flex gap-2">
                <span className="mt-2 size-1 shrink-0 rounded-full bg-primary/70" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        ) : null}
        <p className="mt-3 text-xs leading-relaxed text-muted">{fault.valueImpact}</p>
        {fault.authenticityNote ? (
          <p className="mt-2 text-xs text-muted">
            Authenticity {fault.authenticityRisk}: {fault.authenticityNote}
          </p>
        ) : null}
      </article>
    </div>
  );
}
