export type GolfCourseLayout = {
  id: string;
  name: string;
  holePars: number[];
  strokeIndexes: number[];
  totalPar: number;
  createdAt: string;
};

export const DEFAULT_HOLE_PARS = Array(18).fill(4);
export const DEFAULT_STROKE_INDEXES = Array.from({ length: 18 }, (_, index) => index + 1);

export function normalizeHolePars(values: unknown): number[] {
  const source = Array.isArray(values) ? values : [];
  return Array.from({ length: 18 }, (_, index) => {
    const par = Number(source[index]);
    if (Number.isFinite(par) && par >= 3 && par <= 6) {
      return Math.round(par);
    }
    return 4;
  });
}

export function normalizeStrokeIndexes(values: unknown): number[] | null {
  const source = Array.isArray(values) ? values : [];
  if (source.length !== 18) {
    return null;
  }

  const indexes = source.map((value) => Math.round(Number(value)));
  const unique = new Set(indexes);

  if (unique.size !== 18) {
    return null;
  }

  for (const index of indexes) {
    if (index < 1 || index > 18) {
      return null;
    }
  }

  return indexes;
}

export function totalPar(holePars: number[]) {
  return holePars.reduce((sum, par) => sum + par, 0);
}

/** Strokes received on a hole for a playing handicap (stroke index 1 = hardest). */
export function handicapStrokesOnHole(playingHandicap: number, strokeIndex: number) {
  if (playingHandicap <= 0 || strokeIndex < 1 || strokeIndex > 18) {
    return 0;
  }

  const base = Math.floor(playingHandicap / 18);
  const remainder = playingHandicap % 18;
  return base + (strokeIndex <= remainder ? 1 : 0);
}

export function scoreToPar(score: number, par: number) {
  if (score <= 0 || par <= 0) {
    return null;
  }
  const diff = score - par;
  if (diff === 0) {
    return "E";
  }
  return diff > 0 ? `+${diff}` : String(diff);
}
