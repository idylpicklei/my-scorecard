export type GolfCourseLayout = {
  id: string;
  name: string;
  holePars: number[];
  strokeIndexes: number[];
  totalPar: number;
  createdAt: string;
};

export type CourseLayout = Pick<GolfCourseLayout, "holePars" | "strokeIndexes">;

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

export function lookupPlayerHandicap(
  playerName: string,
  handicaps: Record<string, number>,
): number {
  const key = playerName.trim().toLowerCase();
  if (!key) {
    return 0;
  }
  if (key in handicaps) {
    return handicaps[key];
  }
  const match = Object.entries(handicaps).find(
    ([name]) => name.toLowerCase() === key,
  );
  return match?.[1] ?? 0;
}

/** Lowest handicap among named players in the group (scratch player = 0 strokes). */
export function lowestHandicapInGroup(
  playerNames: string[],
  handicaps: Record<string, number>,
): number {
  const values = playerNames
    .map((name) => lookupPlayerHandicap(name, handicaps))
    .filter((value) => Number.isFinite(value));

  if (values.length === 0) {
    return 0;
  }
  return Math.min(...values);
}

/** Strokes vs the best player in the group (e.g. 14 vs low 10 → 4 strokes). */
export function relativePlayingHandicap(
  playerName: string,
  playerNames: string[],
  handicaps: Record<string, number>,
): number {
  const playerHcp = lookupPlayerHandicap(playerName, handicaps);
  const lowest = lowestHandicapInGroup(playerNames, handicaps);
  return Math.max(0, Math.round(playerHcp - lowest));
}

export type HoleStrokePlanEntry = {
  holeIndex: number;
  par: number;
  strokeIndex: number;
  receivers: string[];
};

export function playersReceivingStrokeOnHole(
  holeIndex: number,
  playerNames: string[],
  handicaps: Record<string, number>,
  courseLayout: CourseLayout,
): string[] {
  const strokeIndex = courseLayout.strokeIndexes[holeIndex];
  if (strokeIndex < 1) {
    return [];
  }

  return playerNames.filter((name) => {
    const relative = relativePlayingHandicap(name, playerNames, handicaps);
    return handicapStrokesOnHole(relative, strokeIndex) > 0;
  });
}

export function buildHoleStrokePlan(
  courseLayout: CourseLayout,
  playerNames: string[],
  handicaps: Record<string, number>,
): HoleStrokePlanEntry[] {
  return Array.from({ length: 18 }, (_, holeIndex) => ({
    holeIndex,
    par: courseLayout.holePars[holeIndex] ?? 0,
    strokeIndex: courseLayout.strokeIndexes[holeIndex] ?? 0,
    receivers: playersReceivingStrokeOnHole(
      holeIndex,
      playerNames,
      handicaps,
      courseLayout,
    ),
  }));
}

/** Per-hole stroke count (0, 1, or 2) for one player in a group. */
export function strokeAllocationForPlayer(
  playerName: string,
  groupNames: string[],
  handicaps: Record<string, number>,
  courseLayout: CourseLayout,
): number[] {
  const relative = relativePlayingHandicap(playerName, groupNames, handicaps);
  return courseLayout.strokeIndexes.map((strokeIndex) =>
    handicapStrokesOnHole(relative, strokeIndex),
  );
}

export function resolveRosterPlayerName(
  currentUser: { name: string; username: string },
  roster: string[],
): string | null {
  const candidates = [currentUser.name, currentUser.username];
  for (const player of roster) {
    if (
      candidates.some((value) => value.trim().toLowerCase() === player.trim().toLowerCase())
    ) {
      return player;
    }
  }
  return null;
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
