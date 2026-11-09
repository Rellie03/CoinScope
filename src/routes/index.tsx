import { useRef, useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Camera, ImagePlus, Loader2, Scan } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CoinFace } from "@/components/coin/coin-face";
import { LoupeCamera } from "@/components/coin/loupe-camera";
import { CATALOG_BY_ID } from "@/lib/coins/catalog";
import { dualFromCatalog, makeScan, SAMPLE_IDS } from "@/lib/coins/dual";
import { fileToDataUrl } from "@/lib/coins/image";
import { identifyFromDescription, identifyFromImages } from "@/lib/coins/identify";
import { useCabinetStore } from "@/lib/coins/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({ component: Home });

const SCAN_COPY = [
  "Lens is reading the strike…",
  "Fault is hunting mint errors…",
  "Comparing legends and rims…",
  "Weighing the type against the market…",
];

function Home() {
  const navigate = useNavigate();
  const rememberScan = useCabinetStore((s) => s.rememberScan);
  const obverseRef = useRef<HTMLInputElement>(null);
  const reverseRef = useRef<HTMLInputElement>(null);
  const [obverse, setObverse] = useState<string | null>(null);
  const [reverse, setReverse] = useState<string | null>(null);
  const [busy, setBusy] = useState<"photo" | "describe" | null>(null);
  const [status, setStatus] = useState(SCAN_COPY[0]);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [describeOpen, setDescribeOpen] = useState(false);
  const [country, setCountry] = useState("");
  const [year, setYear] = useState("");
  const [denomination, setDenomination] = useState("");
  const [notes, setNotes] = useState("");

  async function onFile(
    file: File | undefined,
    setter: (v: string) => void,
  ) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Use a photograph of the coin.");
      return;
    }
    try {
      setter(await fileToDataUrl(file));
    } catch {
      toast.error("Could not read that image.");
    }
  }

  function go(scanId: string) {
    void navigate({ to: "/result/$scanId", params: { scanId } });
  }

  async function runPhoto(shots?: { obverse: string; reverse?: string }) {
    const obv = shots ? shots.obverse : obverse;
    const rev = shots ? shots.reverse : (reverse ?? undefined);
    if (!obv) {
      toast.error("Add an obverse photo first.");
      return;
    }
    setBusy("photo");
    const tick = window.setInterval(() => {
      setStatus((s) => SCAN_COPY[(SCAN_COPY.indexOf(s) + 1) % SCAN_COPY.length]!);
    }, 1400);
    try {
      const res = await identifyFromImages({
        data: { obverse: obv, reverse: rev },
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const scan = makeScan({
        source: "photo",
        identification: res.identification,
        fault: res.fault,
        obverseUrl: obv,
        reverseUrl: rev,
      });
      rememberScan(scan);
      go(scan.id);
    } catch {
      toast.error("The identifier could not finish. Try a sample strike.");
    } finally {
      window.clearInterval(tick);
      setBusy(null);
    }
  }

  // Camera flow: shots come back complete, so the reading runs on its own —
  // no extra tap on "Identify".
  function onCameraComplete(shots: { obverse: string; reverse?: string }) {
    setCameraOpen(false);
    setObverse(shots.obverse);
    setReverse(shots.reverse ?? null);
    void runPhoto(shots);
  }

  async function runDescribe(e: FormEvent) {
    e.preventDefault();
    setBusy("describe");
    try {
      const res = await identifyFromDescription({
        data: { country, year, denomination, notes },
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const scan = makeScan({
        source: "describe",
        identification: res.identification,
        fault: res.fault,
      });
      rememberScan(scan);
      go(scan.id);
    } catch {
      toast.error("Could not identify from that description.");
    } finally {
      setBusy(null);
    }
  }

  function runSample(id: string) {
    const coin = CATALOG_BY_ID[id];
    if (!coin) return;
    const dual = dualFromCatalog(coin);
    const scan = makeScan({
      source: "sample",
      identification: dual.identification,
      fault: dual.fault,
      obverseUrl: coin.image ?? undefined,
    });
    rememberScan(scan);
    go(scan.id);
  }

  return (
    <div className="stagger-in mx-auto max-w-lg space-y-10">
      <header className="space-y-3 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-muted">Two specialists. One reading.</p>
        <h1 className="font-display text-4xl leading-none tracking-tight text-fg">
          See what you hold
        </h1>
        <p className="text-sm leading-relaxed text-muted">
          Point the camera at the coin — it snaps when the coin is steady in the
          ring, flips to the reverse, then the reading comes up on its own. Lens
          names the coin. Fault hunts doubled dies, off-metal strikes, clips, and
          the rest — and will say when damage is just damage.
        </p>
      </header>

      <section className="flex flex-col items-center gap-5">
        <div className="relative w-[min(100%,20rem)]">
          <button
            type="button"
            onClick={() => setCameraOpen(true)}
            className="block w-full rounded-full"
            aria-label="Open the camera to scan a coin"
          >
            <div
              className={cn(
                "relative aspect-square overflow-hidden rounded-full loupe-ring bg-surface",
                busy === "photo" && "loupe-pulse",
              )}
            >
              {obverse ? (
                <img src={obverse} alt="Obverse preview" className="size-full object-cover" />
              ) : (
                <div className="flex size-full flex-col items-center justify-center gap-2 text-muted">
                  <Camera className="size-7" strokeWidth={1.4} />
                  <span className="text-xs uppercase tracking-wider">Tap to scan</span>
                  <span className="text-[11px]">Camera snaps when steady</span>
                </div>
              )}
              {busy === "photo" ? (
                <div className="absolute inset-0 overflow-hidden rounded-full">
                  <div className="scan-sweep absolute inset-x-0 h-1/3" />
                </div>
              ) : null}
            </div>
          </button>
        </div>

        <div className="flex w-full items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reverseRef.current?.click()}
            className="flex size-16 overflow-hidden rounded-full bg-surface shadow-[var(--shadow-border)]"
            aria-label="Upload reverse photograph from library"
          >
            {reverse ? (
              <img src={reverse} alt="Reverse preview" className="size-full object-cover" />
            ) : (
              <span className="m-auto text-[10px] uppercase tracking-wider text-muted">Rev</span>
            )}
          </button>
          <input
            ref={obverseRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => void onFile(e.target.files?.[0], setObverse)}
          />
          <input
            ref={reverseRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => void onFile(e.target.files?.[0], setReverse)}
          />
          <p className="max-w-[12rem] text-xs leading-relaxed text-muted">
            Reverse is optional. Fault is sharper with both sides.
          </p>
        </div>

        <Button size="lg" className="w-full max-w-sm" onClick={() => void runPhoto()} disabled={!!busy}>
          {busy === "photo" ? <Loader2 className="animate-spin" /> : <Scan />}
          {busy === "photo" ? status : "Identify with dual AI"}
        </Button>
        <button
          type="button"
          className="flex items-center gap-1.5 text-sm text-muted underline-offset-4 hover:text-fg hover:underline"
          onClick={() => obverseRef.current?.click()}
        >
          <ImagePlus className="size-4" />
          Upload photos from your library instead
        </button>
        <button
          type="button"
          className="text-sm text-muted underline-offset-4 hover:text-fg hover:underline"
          onClick={() => setDescribeOpen((v) => !v)}
        >
          No photo? Describe it
        </button>
      </section>

      {describeOpen ? (
        <form onSubmit={(e) => void runDescribe(e)} className="space-y-3 rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input placeholder="Country" value={country} onChange={(e) => setCountry(e.target.value)} />
            <Input placeholder="Year" value={year} onChange={(e) => setYear(e.target.value)} />
          </div>
          <Input
            placeholder="Denomination"
            value={denomination}
            onChange={(e) => setDenomination(e.target.value)}
          />
          <Input
            placeholder="Mint mark, variety, suspected error…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <Button type="submit" variant="secondary" className="w-full" disabled={!!busy}>
            {busy === "describe" ? <Loader2 className="animate-spin" /> : null}
            Run Lens + Fault
          </Button>
        </form>
      ) : null}

      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-lg text-fg">Study these strikes</h2>
          <p className="text-xs text-muted">No photo needed</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {SAMPLE_IDS.map((id) => {
            const coin = CATALOG_BY_ID[id];
            if (!coin) return null;
            return (
              <button
                key={id}
                type="button"
                onClick={() => runSample(id)}
                className="rounded-xl bg-surface p-2 text-left shadow-[var(--shadow-border)] transition-[box-shadow] duration-150 hover:shadow-[var(--shadow-border-hover)]"
              >
                <CoinFace src={coin.image} metal={coin.metal} name={coin.shortName} />
                <p className="mt-2 truncate px-0.5 text-xs text-fg">{coin.shortName}</p>
                <p className="truncate px-0.5 text-[11px] text-muted">
                  {coin.errorCoin ? "Mint error" : coin.year}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {cameraOpen ? (
        <LoupeCamera onClose={() => setCameraOpen(false)} onComplete={onCameraComplete} />
      ) : null}
    </div>
  );
}
