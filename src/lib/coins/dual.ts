import { catalogToIdentification } from "./catalog";
import type { CatalogCoin, ErrorFinding, GradeKey, Identification, ScanRecord, ScanSource } from "./types";

export function cleanFault(summary?: string): ErrorFinding {
  return {
    available: true,
    hasError: false,
    confidence: 84,
    category: "none",
    title: "No mint error",
    summary:
      summary ??
      "Fault did not see doubling, a clip, an off-center strike, or an off-metal planchet. Wear and contact marks are circulation, not errors.",
    tells: [],
    authenticityRisk: "low",
    authenticityNote: "Weight, style, and strike look right for the type. No cast seam or soft modern copy.",
    valueImpact: "Price follows the type and grade. There is no error premium.",
  };
}

const OVERRIDES: Record<string, ErrorFinding> = {
  "wheat-cent": {
    ...cleanFault(
      "The V.D.B. initials are a design variety, not a mint error. Fault found no doubled die, clip, or off-center strike.",
    ),
    title: "Variety, not an error",
    tells: ["V.D.B. is a hub variety from the first year", "Reverse legend is a single impression"],
    valueImpact: "The V.D.B. variety carries a modest premium over a plain 1909. It is not an error price.",
  },
  "steel-cent": {
    ...cleanFault(
      "This is the intended zinc-coated steel issue. Fault is watching for the off-metal 1943 bronze cent, which this is not.",
    ),
    title: "On the right planchet",
    tells: [
      "Gray zinc-coated steel, not copper",
      "A real 1943 bronze would be non-magnetic and weigh about 3.11 g",
    ],
    authenticityNote:
      "Plated steel and altered 1948 dates are the usual fakes of the bronze error. This piece matches the common steel issue.",
    valueImpact: "Common steel cents are worth little. The bronze off-metal is the one that changes the price.",
  },
  "doubled-die-1955": {
    available: true,
    hasError: true,
    confidence: 96,
    category: "doubled-die",
    title: "Doubled die obverse",
    summary:
      "Class I hub doubling. LIBERTY, IN GOD WE TRUST, and the date each show a strong second impression. The reverse is normal, which is what this die pair does.",
    tells: [
      "Raised, split letters — not a flat machine-doubling shelf",
      "Date and motto share the same rotational spread",
      "Reverse wheat ears are a single impression",
    ],
    authenticityRisk: "medium",
    authenticityNote:
      "This is the most counterfeited doubled die. Check that doubling is raised, not tooled, and that the spread matches the known FS-101 die.",
    valueImpact: "The error is the value. A normal 1955 cent is pocket change; this die is hundreds to thousands of dollars.",
  },
  "athenian-owl": {
    ...cleanFault("Ancient strikes are often off-center by modern standards. That is the hammer, not a mint error."),
    title: "Ancient strike, not an error",
    tells: ["Irregular flan is normal for a tetradrachm", "A test cut would be period, not damage"],
    authenticityRisk: "medium",
    authenticityNote:
      "Owls are heavily forged. Weight near 17.2 g, crisp style, and a sharp edge beat a perfectly round modern-looking flan.",
  },
};

export function faultFromCatalog(coin: CatalogCoin): ErrorFinding {
  if (OVERRIDES[coin.id]) return OVERRIDES[coin.id]!;
  if (coin.errorCoin && coin.errorDescription) {
    return {
      available: true,
      hasError: true,
      confidence: Math.max(70, coin.confidence - 4),
      category: "other",
      title: "Mint error",
      summary: coin.errorDescription,
      tells: [coin.curatorNote],
      authenticityRisk: "medium",
      authenticityNote: coin.curatorNote,
      valueImpact: "The error, if genuine, is what moves the price off the normal type.",
    };
  }
  return cleanFault();
}

export function dualFromCatalog(coin: CatalogCoin): {
  identification: Identification;
  fault: ErrorFinding;
} {
  return {
    identification: catalogToIdentification(coin),
    fault: faultFromCatalog(coin),
  };
}

export function unavailableFault(): ErrorFinding {
  return {
    available: false,
    hasError: false,
    confidence: 0,
    category: "none",
    title: "Fault did not finish",
    summary:
      "Lens named the piece. The error specialist did not return a reading. Photograph both sides if you suspect a mint error.",
    tells: [],
    authenticityRisk: "medium",
    authenticityNote: "Authenticity was not checked on this pass.",
    valueImpact: "Treat the figure as a type price, not an error price.",
  };
}

export const SAMPLE_IDS = [
  "morgan-dollar",
  "wheat-cent",
  "doubled-die-1955",
  "athenian-owl",
  "krugerrand",
  "eight-reales",
] as const;

export function makeScan(input: {
  source: ScanSource;
  identification: Identification;
  fault: ErrorFinding;
  obverseUrl?: string;
  reverseUrl?: string;
  grade?: GradeKey;
}): ScanRecord {
  return {
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    source: input.source,
    obverseUrl: input.obverseUrl,
    reverseUrl: input.reverseUrl,
    identification: input.identification,
    fault: input.fault,
    grade: input.grade ?? input.identification.gradeEstimate,
  };
}
