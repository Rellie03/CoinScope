import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { CATALOG, matchCatalogId } from "./catalog";
import { unavailableFault } from "./dual";
import type { ErrorCategory, ErrorFinding, GradeKey, Identification, Metal, Rarity } from "./types";

const METALS: Metal[] = ["gold", "silver", "copper", "nickel", "clad", "steel", "bronze", "billon"];
const RARITIES: Rarity[] = ["common", "scarce", "rare", "very-rare", "legendary"];
const GRADES: GradeKey[] = [
  "G-4",
  "VG-8",
  "F-12",
  "VF-20",
  "EF-40",
  "AU-50",
  "AU-58",
  "MS-60",
  "MS-63",
  "MS-65",
];
const ERRORS: ErrorCategory[] = [
  "none",
  "doubled-die",
  "off-center",
  "clip",
  "off-metal",
  "die-crack",
  "lamination",
  "broadstrike",
  "wrong-planchet",
  "die-clash",
  "repunched-mintmark",
  "other",
];

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 12;
const stamps: number[] = [];

function rateLimit() {
  const now = Date.now();
  while (stamps.length && now - stamps[0]! > WINDOW_MS) stamps.shift();
  if (stamps.length >= MAX_PER_WINDOW) return false;
  stamps.push(now);
  return true;
}

const PhotoInput = z.object({
  obverse: z.string().min(32).max(1_600_000),
  reverse: z.string().max(1_600_000).optional(),
});

const DescribeInput = z.object({
  country: z.string().max(80).optional(),
  year: z.string().max(32).optional(),
  denomination: z.string().max(80).optional(),
  notes: z.string().max(400).optional(),
});

const LENS_SYSTEM = `You are Lens, a careful numismatist. Identify coins and banknotes.

Rules:
- If it is not a coin or banknote, set identified=false.
- Be honest about uncertainty. Confidence is 0–100.
- Values are USD retail ranges for a typical example in the estimated grade, not an appraisal.
- Prefer melt + modest premium for common bullion; do not invent six-figure prices for worn common dates.
- history: 2–4 sentences, curator voice, no hype.
- curatorNote: one practical grading or authenticity tell.
- Do NOT diagnose mint errors — another specialist (Fault) handles that. You may mention a famous variety in variety/name if it is clearly that type.
- Return JSON only:
{
  "identified": boolean,
  "confidence": number,
  "name": string,
  "shortName": string,
  "country": string,
  "year": string,
  "denomination": string,
  "mint": string,
  "mintMark": string,
  "metal": "gold"|"silver"|"copper"|"nickel"|"clad"|"steel"|"bronze"|"billon",
  "fineness": string,
  "weightGrams": number,
  "diameterMm": number,
  "edge": string,
  "designer": string,
  "variety": string,
  "strike": string,
  "gradeEstimate": "G-4"|"VG-8"|"F-12"|"VF-20"|"EF-40"|"AU-50"|"AU-58"|"MS-60"|"MS-63"|"MS-65",
  "rarity": "common"|"scarce"|"rare"|"very-rare"|"legendary",
  "estimatedValueLow": number,
  "estimatedValueMid": number,
  "estimatedValueHigh": number,
  "meltValue": number|null,
  "history": string,
  "curatorNote": string,
  "identificationNotes": string,
  "conditionNotes": string,
  "isBanknote": boolean,
  "similar": [{"name": string, "note": string}]
}`;

const FAULT_SYSTEM = `You are Fault, a mint-error specialist. You do not name the coin for the catalog — you hunt mint errors, and you separate them from damage and from design varieties.

Look for: doubled dies (true Class I–VIII hub doubling, NOT machine doubling), off-center strikes, clipped planchets, off-metal / wrong planchet, broadstrikes, die cracks and cuds, laminations, die clashes, repunched mintmarks, broadstruck and off-center pieces.

Do NOT call these mint errors:
- Scratches, cleaning, corrosion, rim dings, holes, jewelry mounts
- First-year design varieties (e.g. V.D.B. initials) unless they also show a separate error
- Mechanical / strike doubling (flat, shelf toward the rim)
- Wear

Authenticity: note casts, transferred surfaces, added mintmarks, or too-good-to-be-true doubling.

Values: errorValueLow/Mid/High are a USD retail range for this same type, in a similar grade, WITH this error — what the piece could be worth if the error is genuine and confirmed. Use null for all three when hasError is false, or when you genuinely cannot estimate a range. Same discipline as Lens: realistic retail ranges, no invented six-figure prices for worn common dates, not an appraisal.

Return JSON only:
{
  "hasError": boolean,
  "confidence": number,
  "category": "none"|"doubled-die"|"off-center"|"clip"|"off-metal"|"die-crack"|"lamination"|"broadstrike"|"wrong-planchet"|"die-clash"|"repunched-mintmark"|"other",
  "title": string,
  "summary": string,
  "tells": string[],
  "authenticityRisk": "low"|"medium"|"high",
  "authenticityNote": string,
  "valueImpact": string,
  "errorValueLow": number|null,
  "errorValueMid": number|null,
  "errorValueHigh": number|null
}`;

export type DualResult =
  | { ok: true; identification: Identification; fault: ErrorFinding }
  | { ok: false; error: string };

function asMetal(v: unknown): Metal {
  return METALS.includes(v as Metal) ? (v as Metal) : "nickel";
}
function asRarity(v: unknown): Rarity {
  return RARITIES.includes(v as Rarity) ? (v as Rarity) : "common";
}
function asGrade(v: unknown): GradeKey {
  return GRADES.includes(v as GradeKey) ? (v as GradeKey) : "VF-20";
}
function asError(v: unknown): ErrorCategory {
  return ERRORS.includes(v as ErrorCategory) ? (v as ErrorCategory) : "other";
}
function asRisk(v: unknown): ErrorFinding["authenticityRisk"] {
  return v === "medium" || v === "high" || v === "low" ? v : "medium";
}
function num(v: unknown, fallback = 0) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function numOrNull(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}
function str(v: unknown, fallback = "") {
  return typeof v === "string" ? v : fallback;
}

function normalizeIdent(raw: Record<string, unknown>): Identification {
  const name = str(raw.name, "Unidentified piece");
  const identification: Identification = {
    identified: Boolean(raw.identified),
    confidence: Math.max(0, Math.min(100, num(raw.confidence, 0))),
    name,
    shortName: str(raw.shortName, name),
    country: str(raw.country, "Unknown"),
    year: str(raw.year, "Unknown"),
    denomination: str(raw.denomination, "Unknown"),
    mint: str(raw.mint, "Unknown"),
    mintMark: str(raw.mintMark, "None"),
    metal: asMetal(raw.metal),
    fineness: str(raw.fineness, "Unknown"),
    weightGrams: num(raw.weightGrams),
    diameterMm: num(raw.diameterMm),
    edge: str(raw.edge, "Unknown"),
    designer: str(raw.designer, "Unknown"),
    variety: str(raw.variety, "—"),
    strike: str(raw.strike, "Unknown"),
    gradeEstimate: asGrade(raw.gradeEstimate),
    rarity: asRarity(raw.rarity),
    estimatedValueLow: num(raw.estimatedValueLow),
    estimatedValueMid: num(raw.estimatedValueMid),
    estimatedValueHigh: num(raw.estimatedValueHigh),
    meltValue: raw.meltValue == null ? null : num(raw.meltValue),
    history: str(raw.history),
    curatorNote: str(raw.curatorNote),
    identificationNotes: str(raw.identificationNotes),
    conditionNotes: str(raw.conditionNotes),
    errorCoin: false,
    errorDescription: null,
    isBanknote: Boolean(raw.isBanknote),
    catalogMatchId: null,
    similar: Array.isArray(raw.similar)
      ? raw.similar.slice(0, 4).map((s) => {
          const row = (s ?? {}) as Record<string, unknown>;
          return { name: str(row.name, "Related type"), note: str(row.note) };
        })
      : [],
    comps: [],
  };

  const matchId = matchCatalogId(identification);
  identification.catalogMatchId = matchId;
  if (matchId) {
    const coin = CATALOG.find((c) => c.id === matchId);
    if (coin) {
      identification.comps = coin.comps;
      if (!identification.similar.length) identification.similar = coin.similar;
      if (!identification.history) identification.history = coin.history;
      if (!identification.curatorNote) identification.curatorNote = coin.curatorNote;
    }
  }
  if (identification.estimatedValueHigh < identification.estimatedValueLow) {
    identification.estimatedValueHigh = identification.estimatedValueLow;
  }
  if (
    identification.estimatedValueMid < identification.estimatedValueLow ||
    identification.estimatedValueMid > identification.estimatedValueHigh
  ) {
    identification.estimatedValueMid =
      (identification.estimatedValueLow + identification.estimatedValueHigh) / 2;
  }
  return identification;
}

function normalizeFault(raw: Record<string, unknown>): ErrorFinding {
  const hasError = Boolean(raw.hasError);
  const category = hasError ? asError(raw.category) : "none";
  // Error values only exist when an error was actually found, and only as a
  // complete low-mid-high range — a partial range is dropped, not shown.
  let errorValueLow = hasError ? numOrNull(raw.errorValueLow) : null;
  let errorValueMid = hasError ? numOrNull(raw.errorValueMid) : null;
  let errorValueHigh = hasError ? numOrNull(raw.errorValueHigh) : null;
  if (errorValueLow != null && errorValueHigh != null && errorValueHigh < errorValueLow) {
    const t = errorValueLow;
    errorValueLow = errorValueHigh;
    errorValueHigh = t;
  }
  if (
    errorValueLow != null &&
    errorValueMid != null &&
    errorValueHigh != null &&
    (errorValueMid < errorValueLow || errorValueMid > errorValueHigh)
  ) {
    errorValueMid = (errorValueLow + errorValueHigh) / 2;
  }
  const complete =
    errorValueLow != null && errorValueMid != null && errorValueHigh != null;
  return {
    available: true,
    hasError,
    confidence: Math.max(0, Math.min(100, num(raw.confidence, 0))),
    category: hasError && category === "none" ? "other" : category,
    title: str(raw.title, hasError ? "Possible mint error" : "No mint error found"),
    summary: str(raw.summary),
    tells: Array.isArray(raw.tells)
      ? raw.tells.map((t) => str(t)).filter(Boolean).slice(0, 6)
      : [],
    authenticityRisk: asRisk(raw.authenticityRisk),
    authenticityNote: str(raw.authenticityNote),
    valueImpact: str(raw.valueImpact),
    ...(complete
      ? { errorValueLow, errorValueMid, errorValueHigh }
      : { errorValueLow: null, errorValueMid: null, errorValueHigh: null }),
  };
}

function parseJson(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced?.[1] ?? trimmed;
  try {
    return JSON.parse(body) as Record<string, unknown>;
  } catch {
    const start = body.indexOf("{");
    const end = body.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(body.slice(start, end + 1)) as Record<string, unknown>;
      } catch {
        return null;
      }
    }
    return null;
  }
}

async function callGrok(
  system: string,
  userContent: unknown,
  maxTokens: number,
): Promise<{ ok: true; json: Record<string, unknown> } | { ok: false; error: string }> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "AI is unavailable right now. Browse the catalog or try a sample strike." };
  }

  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "grok-4.5",
      temperature: 0.2,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: userContent },
      ],
    }),
  });

  if (!res.ok) return { ok: false, error: `xAI API error ${res.status}` };
  const body = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const parsed = parseJson(body.choices?.[0]?.message?.content ?? "");
  if (!parsed) return { ok: false, error: "Unreadable model output" };
  return { ok: true, json: parsed };
}

async function runDual(userContent: unknown): Promise<DualResult> {
  if (!process.env.XAI_API_KEY) {
    return { ok: false, error: "AI is unavailable right now. Browse the catalog or try a sample strike." };
  }
  if (!rateLimit()) {
    return { ok: false, error: "The loupe is busy. Wait a few minutes, or identify a sample from the tray." };
  }

  const [lens, fault] = await Promise.all([
    callGrok(LENS_SYSTEM, userContent, 900),
    callGrok(FAULT_SYSTEM, userContent, 650),
  ]);

  if (!lens.ok) {
    return {
      ok: false,
      error: "Lens could not read this piece. Try a sharper photo of both sides, or describe it.",
    };
  }

  const identification = normalizeIdent(lens.json);
  if (fault.ok) {
    const finding = normalizeFault(fault.json);
    identification.errorCoin = finding.hasError;
    identification.errorDescription = finding.hasError ? finding.summary : null;
    return { ok: true, identification, fault: finding };
  }
  return { ok: true, identification, fault: unavailableFault() };
}

function photoContent(obverse: string, reverse?: string) {
  const content: unknown[] = [
    {
      type: "text",
      text: reverse
        ? "First image is the obverse (heads), second is the reverse (tails)."
        : "Obverse shown. Reverse not provided.",
    },
    { type: "image_url", image_url: { url: obverse, detail: "high" } },
  ];
  if (reverse) content.push({ type: "image_url", image_url: { url: reverse, detail: "high" } });
  return content;
}

export const identifyFromImages = createServerFn({ method: "POST" })
  .validator((input: unknown) => PhotoInput.parse(input))
  .handler(async ({ data }): Promise<DualResult> => {
    return runDual(photoContent(data.obverse, data.reverse));
  });

export const identifyFromDescription = createServerFn({ method: "POST" })
  .validator((input: unknown) => DescribeInput.parse(input))
  .handler(async ({ data }): Promise<DualResult> => {
    const bits = [
      data.country && `Country: ${data.country}`,
      data.year && `Year: ${data.year}`,
      data.denomination && `Denomination: ${data.denomination}`,
      data.notes && `Notes: ${data.notes}`,
    ].filter(Boolean);
    if (bits.length === 0) {
      return { ok: false, error: "Add a country, year, or denomination so Lens has something to go on." };
    }
    return runDual(
      `Identify from this description. Fault: only call a mint error if the notes describe one; otherwise hasError=false.\n${bits.join("\n")}`,
    );
  });
