import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CabinetItem, GradeKey, ScanRecord, ValuePoint } from "./types";
import { valueAtGrade } from "./types";
import { cleanFault } from "./dual";

type State = {
  hydrated: boolean;
  scans: ScanRecord[];
  cabinet: CabinetItem[];
  history: ValuePoint[];
  rememberScan: (scan: ScanRecord) => void;
  getScan: (id: string) => ScanRecord | CabinetItem | undefined;
  addToCabinet: (scan: ScanRecord, notes?: string) => void;
  removeFromCabinet: (id: string) => void;
  updateGrade: (id: string, grade: GradeKey) => void;
  updateNotes: (id: string, notes: string) => void;
  inCabinet: (scanId: string) => boolean;
  cabinetTotal: () => number;
};

function snapshot(cabinet: CabinetItem[]): ValuePoint {
  const total = cabinet.reduce((sum, item) => {
    const v = valueAtGrade(item.identification, item.grade);
    return sum + v.mid * item.quantity;
  }, 0);
  return { at: Date.now(), total: Math.round(total * 100) / 100 };
}

const MAX_SCANS = 24;
const MAX_HISTORY = 40;

export const useCabinetStore = create<State>()(
  persist(
    (set, get) => ({
      hydrated: false,
      scans: [],
      cabinet: [],
      history: [],
      rememberScan: (scan) =>
        set((s) => ({
          scans: [scan, ...s.scans.filter((x) => x.id !== scan.id)].slice(0, MAX_SCANS),
        })),
      getScan: (id) => {
        const { scans, cabinet } = get();
        const found = cabinet.find((x) => x.id === id) ?? scans.find((x) => x.id === id);
        if (!found) return undefined;
        if (!found.fault) return { ...found, fault: cleanFault() };
        return found;
      },
      addToCabinet: (scan, notes = "") =>
        set((s) => {
          if (s.cabinet.some((x) => x.id === scan.id)) return s;
          const item: CabinetItem = {
            ...scan,
            addedAt: Date.now(),
            notes,
            quantity: 1,
          };
          const cabinet = [item, ...s.cabinet];
          const point = snapshot(cabinet);
          const history =
            s.history.length && Math.abs(s.history[s.history.length - 1]!.total - point.total) < 0.01
              ? s.history
              : [...s.history, point].slice(-MAX_HISTORY);
          return { cabinet, history };
        }),
      removeFromCabinet: (id) =>
        set((s) => {
          const cabinet = s.cabinet.filter((x) => x.id !== id);
          return { cabinet, history: [...s.history, snapshot(cabinet)].slice(-MAX_HISTORY) };
        }),
      updateGrade: (id, grade) =>
        set((s) => {
          const cabinet = s.cabinet.map((x) => (x.id === id ? { ...x, grade } : x));
          const scans = s.scans.map((x) => (x.id === id ? { ...x, grade } : x));
          return { cabinet, scans, history: [...s.history, snapshot(cabinet)].slice(-MAX_HISTORY) };
        }),
      updateNotes: (id, notes) =>
        set((s) => ({
          cabinet: s.cabinet.map((x) => (x.id === id ? { ...x, notes } : x)),
        })),
      inCabinet: (scanId) => get().cabinet.some((x) => x.id === scanId),
      cabinetTotal: () => snapshot(get().cabinet).total,
    }),
    {
      name: "obverse-cabinet",
      partialize: (s) => ({
        scans: s.scans,
        cabinet: s.cabinet,
        history: s.history,
      }),
      onRehydrateStorage: () => () => {
        useCabinetStore.setState({ hydrated: true });
      },
    },
  ),
);

// Safety net: rehydration must never gate the UI forever. If the persisted
// state fails to load (blocked storage, corrupt entry), the result page
// would otherwise sit on "Loading the reading…" indefinitely — the sample
// flow hit exactly that on 2026-11-13. After 2.5s, unblock regardless;
// a later successful rehydration just sets the same flag again.
if (typeof window !== "undefined") {
  window.setTimeout(() => {
    if (!useCabinetStore.getState().hydrated) {
      useCabinetStore.setState({ hydrated: true });
    }
  }, 2500);
}
