export type Rarity = "common" | "scarce" | "rare" | "very-rare" | "legendary";

export type Metal =
  | "gold"
  | "silver"
  | "copper"
  | "nickel"
  | "clad"
  | "steel"
  | "bronze"
  | "billon";

export type GradeKey =
  | "G-4"
  | "VG-8"
  | "F-12"
  | "VF-20"
  | "EF-40"
  | "AU-50"
  | "AU-58"
  | "MS-60"
  | "MS-63"
  | "MS-65";

export type ErrorCategory =
  | "none"
  | "doubled-die"
  | "off-center"
  | "clip"
  | "off-metal"
  | "die-crack"
  | "lamination"
  | "broadstrike"
  | "wrong-planchet"
  | "die-clash"
  | "repunched-mintmark"
  | "other";

export type AuctionComp = {
  date: string;
  house: string;
  grade: string;
  hammer: number;
  note?: string;
};

export type Identification = {
  identified: boolean;
  confidence: number;
  name: string;
  shortName: string;
  country: string;
  year: string;
  denomination: string;
  mint: string;
  mintMark: string;
  metal: Metal;
  fineness: string;
  weightGrams: number;
  diameterMm: number;
  edge: string;
  designer: string;
  variety: string;
  strike: string;
  gradeEstimate: GradeKey;
  rarity: Rarity;
  estimatedValueLow: number;
  estimatedValueMid: number;
  estimatedValueHigh: number;
  meltValue: number | null;
  history: string;
  curatorNote: string;
  identificationNotes: string;
  conditionNotes: string;
  errorCoin: boolean;
  errorDescription: string | null;
  isBanknote: boolean;
  catalogMatchId: string | null;
  similar: { id?: string; name: string; note: string }[];
  comps: AuctionComp[];
};

export type ErrorFinding = {
  available: boolean;
  hasError: boolean;
  confidence: number;
  category: ErrorCategory;
  title: string;
  summary: string;
  tells: string[];
  authenticityRisk: "low" | "medium" | "high";
  authenticityNote: string;
  valueImpact: string;
};

export type CatalogCoin = Identification & {
  id: string;
  image: string | null;
  era: string;
  region: string;
  featured?: boolean;
};

export type ScanSource = "photo" | "describe" | "sample" | "catalog";

export type ScanRecord = {
  id: string;
  createdAt: number;
  source: ScanSource;
  obverseUrl?: string;
  reverseUrl?: string;
  identification: Identification;
  fault: ErrorFinding;
  grade: GradeKey;
};

export type CabinetItem = ScanRecord & {
  addedAt: number;
  notes: string;
  quantity: number;
};

export type ValuePoint = {
  at: number;
  total: number;
};

export const GRADE_OPTIONS: { key: GradeKey; label: string; multiplier: number }[] =
  [
    { key: "G-4", label: "Good", multiplier: 0.42 },
    { key: "VG-8", label: "Very Good", multiplier: 0.55 },
    { key: "F-12", label: "Fine", multiplier: 0.7 },
    { key: "VF-20", label: "Very Fine", multiplier: 0.86 },
    { key: "EF-40", label: "Extremely Fine", multiplier: 1 },
    { key: "AU-50", label: "About Uncirculated", multiplier: 1.28 },
    { key: "AU-58", label: "Choice AU", multiplier: 1.55 },
    { key: "MS-60", label: "Mint State 60", multiplier: 1.85 },
    { key: "MS-63", label: "Mint State 63", multiplier: 2.45 },
    { key: "MS-65", label: "Gem 65", multiplier: 4.1 },
  ];

export function valueAtGrade(
  ident: Identification,
  grade: GradeKey,
): { low: number; mid: number; high: number } {
  const base = GRADE_OPTIONS.find((g) => g.key === ident.gradeEstimate)?.multiplier ?? 1;
  const next = GRADE_OPTIONS.find((g) => g.key === grade)?.multiplier ?? 1;
  const ratio = next / base;
  const melt = ident.meltValue ?? 0;
  const scale = (n: number) => {
    const premium = Math.max(0, n - melt);
    return Math.round((melt + premium * ratio) * 100) / 100;
  };
  return {
    low: scale(ident.estimatedValueLow),
    mid: scale(ident.estimatedValueMid),
    high: scale(ident.estimatedValueHigh),
  };
}

export const RARITY_LABEL: Record<Rarity, string> = {
  common: "Common",
  scarce: "Scarce",
  rare: "Rare",
  "very-rare": "Very rare",
  legendary: "Legendary",
};

export const METAL_LABEL: Record<Metal, string> = {
  gold: "Gold",
  silver: "Silver",
  copper: "Copper",
  nickel: "Nickel",
  clad: "Clad",
  steel: "Steel",
  bronze: "Bronze",
  billon: "Billon",
};

export const ERROR_LABEL: Record<ErrorCategory, string> = {
  none: "No mint error",
  "doubled-die": "Doubled die",
  "off-center": "Off-center strike",
  clip: "Clipped planchet",
  "off-metal": "Off-metal / wrong planchet",
  "die-crack": "Die crack / cud",
  lamination: "Lamination",
  broadstrike: "Broadstrike",
  "wrong-planchet": "Wrong planchet",
  "die-clash": "Die clash",
  "repunched-mintmark": "Repunched mintmark",
  other: "Other error",
};
