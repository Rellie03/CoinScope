import { useEffect, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutGrid, Library, Scan, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCabinetStore } from "@/lib/coins/store";
import { formatUsd } from "@/lib/format";

const NAV = [
  { to: "/", label: "Scan", icon: Scan },
  { to: "/cabinet", label: "Cabinet", icon: LayoutGrid },
  { to: "/catalog", label: "Catalog", icon: Library },
  { to: "/insights", label: "Insights", icon: TrendingUp },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const hydrated = useCabinetStore((s) => s.hydrated);
  const cabinet = useCabinetStore((s) => s.cabinet);
  const total = useCabinetStore((s) => s.cabinetTotal());

  useEffect(() => {
    const persist = useCabinetStore.persist;
    if (persist.hasHydrated()) {
      useCabinetStore.setState({ hydrated: true });
      return;
    }
    return persist.onFinishHydration(() => {
      useCabinetStore.setState({ hydrated: true });
    });
  }, []);

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <header className="sticky top-0 z-20 border-b border-border/80 bg-bg/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link to="/" className="flex items-baseline gap-2">
            <span className="font-display text-xl tracking-tight">Obverse</span>
            <span className="hidden text-xs text-muted sm:inline">Dual AI identifier</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => {
              const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex h-10 items-center rounded-md px-3 text-sm transition-colors duration-150",
                    active ? "text-fg" : "text-muted hover:text-fg",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <p className="font-mono text-xs tabular-nums text-muted">
            {hydrated ? `${cabinet.length} · ${formatUsd(total)}` : "—"}
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 pb-[calc(5.75rem+env(safe-area-inset-bottom))] pt-6 md:pb-16">
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border/80 bg-bg/95 backdrop-blur-md md:hidden">
        <ul className="mx-auto grid max-w-lg grid-cols-4 px-2 pb-[env(safe-area-inset-bottom)]">
          {NAV.map((item) => {
            const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={cn(
                    "flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] transition-colors duration-150",
                    active ? "text-fg" : "text-muted",
                  )}
                >
                  <Icon className="size-5" strokeWidth={1.6} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
