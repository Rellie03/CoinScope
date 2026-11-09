import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ImagePlus, X, Zap, ZapOff } from "lucide-react";
import { fileToDataUrl } from "@/lib/coins/image";
import { cn } from "@/lib/utils";

type Kind = "coin" | "note";
type Side = "obverse" | "reverse";

export function LoupeCamera({
  onClose,
  onComplete,
}: {
  onClose: () => void;
  onComplete: (shots: { obverse: string; reverse?: string }) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const sampleRef = useRef<HTMLCanvasElement>(null);
  const prevGray = useRef<Uint8ClampedArray | null>(null);
  const hold = useRef(0);
  const lock = useRef(false);
  const sideRef = useRef<Side>("obverse");
  const kindRef = useRef<Kind>("coin");
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const shots = useRef<{ obverse?: string; reverse?: string }>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const guideRef = useRef<HTMLDivElement>(null);

  const [kind, setKind] = useState<Kind>("coin");
  kindRef.current = kind;
  const [side, setSide] = useState<Side>("obverse");
  const [hint, setHint] = useState("Starting the camera…");
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [torch, setTorch] = useState(false);
  const [torchOk, setTorchOk] = useState(false);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    let dead = false;
    let timer = 0;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setBlocked("This browser has no camera. Use a photo from your library.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 1280 },
          },
        });
        if (dead) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
        }
        const caps = stream.getVideoTracks()[0]?.getCapabilities?.() as
          | { torch?: boolean }
          | undefined;
        setTorchOk(Boolean(caps?.torch));
        setHint(sideRef.current === "obverse" ? "Center the obverse" : "Center the reverse");
        timer = window.setInterval(tick, 160);
      } catch (err) {
        const name = err instanceof DOMException ? err.name : "";
        setBlocked(
          name === "NotAllowedError"
            ? "Camera permission is off. Allow it, or pick photos from the library."
            : "Could not open the camera. Pick photos from the library.",
        );
      }
    }

    function tick() {
      const video = videoRef.current;
      const canvas = sampleRef.current;
      if (!video || !canvas || lock.current || video.readyState < 2) return;
      const reading = sampleCenter(video, canvas, prevGray.current);
      if (!reading) return;
      prevGray.current = reading.gray;

      let good = true;
      let next = "Hold still";
      if (reading.luma < 42) {
        good = false;
        next = "Needs more light";
      } else if (reading.luma > 228) {
        good = false;
        next = "Ease the glare";
      } else if (reading.detail < 7) {
        good = false;
        next = kindRef.current === "coin" ? "Center the coin in the ring" : "Fit the note in the frame";
      } else if (reading.motion > 16) {
        good = false;
        next = "Hold still";
      } else {
        next = sideRef.current === "obverse" ? "Obverse — capturing" : "Reverse — capturing";
      }

      hold.current = good ? hold.current + 160 : Math.max(0, hold.current - 240);
      const p = Math.min(1, hold.current / 880);
      setProgress(p);
      setReady(good && p > 0.35);
      setHint(next);
      if (hold.current >= 880) takeRef.current();
    }

    void start();
    return () => {
      dead = true;
      window.clearInterval(timer);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  function advance(url: string) {
    setFlash(true);
    window.setTimeout(() => setFlash(false), 140);
    hold.current = 0;
    setProgress(0);
    setReady(false);
    if (sideRef.current === "obverse") {
      shots.current.obverse = url;
      sideRef.current = "reverse";
      setSide("reverse");
      setHint("Flip it. Center the reverse.");
      window.setTimeout(() => {
        lock.current = false;
      }, 1100);
      return;
    }
    shots.current.reverse = url;
    const obverse = shots.current.obverse;
    if (!obverse) return;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    onCompleteRef.current({ obverse, reverse: url });
  }

  const takeRef = useRef<() => void>(() => {});
  takeRef.current = () => {
    if (lock.current) return;
    const video = videoRef.current;
    if (!video || video.readyState < 2 || !video.videoWidth) return;
    const url = captureFrame();
    if (!url) return;
    lock.current = true;
    advance(url);
  };

  // Crop the capture to the region actually visible inside the ring/frame
  // guide. The preview uses object-fit: cover, so a full-frame capture makes
  // the coin come out much smaller than it looked inside the ring.
  function captureFrame() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return "";
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const vr = video.getBoundingClientRect();
    const gr = guideRef.current?.getBoundingClientRect();
    let sx = 0;
    let sy = 0;
    let sw = vw;
    let sh = vh;
    if (gr && vr.width > 0 && vr.height > 0) {
      const scale = Math.max(vr.width / vw, vr.height / vh);
      const dispW = vw * scale;
      const dispH = vh * scale;
      const offX = (dispW - vr.width) / 2;
      const offY = (dispH - vr.height) / 2;
      sx = (gr.left - vr.left + offX) / scale;
      sy = (gr.top - vr.top + offY) / scale;
      sw = gr.width / scale;
      sh = gr.height / scale;
      sx = Math.max(0, Math.min(vw - 1, sx));
      sy = Math.max(0, Math.min(vh - 1, sy));
      sw = Math.max(1, Math.min(vw - sx, sw));
      sh = Math.max(1, Math.min(vh - sy, sh));
    }
    const max = 768;
    const outScale = Math.min(1, max / Math.max(sw, sh));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(sw * outScale));
    canvas.height = Math.max(1, Math.round(sh * outScale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.78);
  }

  function take() {
    takeRef.current();
  }

  function skipReverse() {
    const obverse = shots.current.obverse;
    if (!obverse) return;
    lock.current = true;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    onCompleteRef.current({ obverse });
  }

  async function onLibrary(file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    lock.current = true;
    try {
      advance(await fileToDataUrl(file));
    } catch {
      lock.current = false;
    }
  }

  async function toggleTorch() {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const next = !torch;
    try {
      await track.applyConstraints({
        advanced: [{ torch: next } as MediaTrackConstraintSet],
      });
      setTorch(next);
    } catch {
      setTorchOk(false);
    }
  }

  const ring = kind === "coin";

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black text-fg">
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="absolute inset-0 size-full object-cover"
      />
      <canvas ref={sampleRef} className="hidden" />
      <div
        ref={guideRef}
        className={cn(
          "pointer-events-none absolute left-1/2 top-[46%] -translate-x-1/2 -translate-y-1/2",
          ring ? "size-[min(78vw,22rem)]" : "h-[min(52vw,15rem)] w-[min(88vw,26rem)]",
        )}
      >
        <div
          className={cn(
            "absolute inset-0 shadow-[0_0_0_9999px_rgba(0,0,0,0.58)]",
            ring ? "rounded-full" : "rounded-xl",
            ready ? "ring-2 ring-[#8aa384]" : "ring-2 ring-[#c9cdd4]",
          )}
        />
        {ring ? (
          <svg
            className="absolute -inset-1.5 h-[calc(100%+12px)] w-[calc(100%+12px)] -rotate-90"
            viewBox="0 0 100 100"
            aria-hidden
          >
            <circle
              cx="50"
              cy="50"
              r="48"
              fill="none"
              stroke="#c9cdd4"
              strokeWidth="1.4"
              pathLength={100}
              strokeDasharray={`${Math.round(progress * 100)} 100`}
              strokeLinecap="round"
            />
          </svg>
        ) : null}
      </div>
      {flash ? <div className="pointer-events-none absolute inset-0 bg-fg/80" /> : null}

      <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onClose}
          className="flex size-11 items-center justify-center rounded-full bg-black/50 text-fg"
          aria-label="Close camera"
        >
          <X className="size-5" />
        </button>
        <div className="flex rounded-full bg-black/50 p-1 text-xs">
          {(["coin", "note"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={cn(
                "h-9 rounded-full px-3 capitalize",
                kind === k ? "bg-primary text-primary-fg" : "text-fg",
              )}
            >
              {k === "coin" ? "Coin" : "Note"}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => void toggleTorch()}
          disabled={!torchOk}
          className="flex size-11 items-center justify-center rounded-full bg-black/50 text-fg disabled:opacity-40"
          aria-label={torch ? "Turn flash off" : "Turn flash on"}
        >
          {torch ? <Zap className="size-5" /> : <ZapOff className="size-5" />}
        </button>
      </div>

      <div className="absolute inset-x-0 bottom-36 px-6 text-center">
        <p className="text-xs uppercase tracking-[0.18em] text-fg/80">
          {side === "obverse" ? "1 · Obverse" : "2 · Reverse"}
        </p>
        <p className="mt-1 font-display text-2xl text-fg">{blocked ?? hint}</p>
      </div>

      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-8 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex size-12 items-center justify-center rounded-full bg-black/50 text-fg"
          aria-label="Choose a photo from the library"
        >
          <ImagePlus className="size-5" />
        </button>
        <button
          type="button"
          onClick={() => void take()}
          disabled={!!blocked}
          className="flex size-[4.5rem] items-center justify-center rounded-full border-2 border-fg/90 disabled:opacity-40"
          aria-label="Take photo now"
        >
          <span className="size-14 rounded-full bg-fg" />
        </button>
        {side === "reverse" ? (
          <button type="button" onClick={skipReverse} className="w-12 text-xs text-fg">
            Skip
          </button>
        ) : (
          <span className="w-12" />
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => void onLibrary(e.target.files?.[0])}
      />
    </div>,
    document.body,
  );
}

function sampleCenter(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  prev: Uint8ClampedArray | null,
) {
  const w = 96;
  const h = 96;
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return null;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  canvas.width = w;
  canvas.height = h;
  const side = Math.min(vw, vh) * 0.62;
  ctx.drawImage(video, (vw - side) / 2, (vh - side) / 2, side, side, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  const gray = new Uint8ClampedArray(w * h);
  let luma = 0;
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    const g = (data[o]! * 0.3 + data[o + 1]! * 0.59 + data[o + 2]! * 0.11) | 0;
    gray[i] = g;
    luma += g;
  }
  luma /= w * h;
  let detail = 0;
  let motion = 0;
  let n = 0;
  for (let y = 1; y < h; y += 2) {
    for (let x = 1; x < w; x += 2) {
      const i = y * w + x;
      detail += Math.abs(gray[i]! - gray[i - 1]!);
      if (prev) motion += Math.abs(gray[i]! - prev[i]!);
      n++;
    }
  }
  return { luma, detail: detail / n, motion: prev ? motion / n : 99, gray };
}


