import {
  handicapStrokesOnHole,
  relativePlayingHandicap,
  type CourseLayout,
} from "@/lib/golf-course";
import { resolveNameToRosterName } from "@/lib/trip-roster";
import { TRIP_PLAYERS } from "@/lib/trip-roster";

export const SKINS_POT_DOLLARS = 40;

export type SkinsHoleScore = {
  player: string;
  gross: number;
  strokes: number;
  net: number;
};

export type SkinsHoleResult = {
  hole: number;
  winner: string | null;
  tied: boolean;
  incomplete: boolean;
  scores: SkinsHoleScore[];
};

export type SkinsPlayerResult = {
  player: string;
  skins: number;
  payoutDollars: number;
};

export type SkinsRoundResult = {
  skinsByPlayer: Record<string, number>;
  payoutByPlayer: Record<string, number>;
  playerResults: SkinsPlayerResult[];
  holes: SkinsHoleResult[];
  totalSkins: number;
  potDollars: number;
};

export type SkinsCalculationResult = SkinsRoundResult | "incomplete" | "no-course";

type ScorecardPlayerInput = {
  playerName: string;
  holes: number[];
};

/** Build 18-hole gross map keyed by canonical roster name. */
export function scorecardToRosterHoles(
  players: ScorecardPlayerInput[],
): Map<string, number[]> {
  const map = new Map<string, number[]>();

  for (const entry of players) {
    const rosterName = resolveNameToRosterName(entry.playerName) ?? entry.playerName.trim();
    if (!rosterName) {
      continue;
    }

    const holes = Array.from({ length: 18 }, (_, index) => {
      const score = Number(entry.holes[index]);
      return Number.isFinite(score) && score > 0 ? Math.round(score) : 0;
    });

    map.set(rosterName, holes);
  }

  return map;
}

function netScoreOnHole(
  gross: number,
  player: string,
  holeIndex: number,
  handicapsByPlayer: Record<string, number>,
  courseLayout: CourseLayout,
): { strokes: number; net: number } {
  const strokeIndex = courseLayout.strokeIndexes[holeIndex] ?? 0;
  const playingHcp = relativePlayingHandicap(player, [...TRIP_PLAYERS], handicapsByPlayer);
  const strokes = handicapStrokesOnHole(playingHcp, strokeIndex);
  return { strokes, net: gross - strokes };
}

export function calculateSkinsForRound(
  players: ScorecardPlayerInput[],
  options?: {
    potDollars?: number;
    random?: () => number;
    handicapsByPlayer: Record<string, number>;
    courseLayout: CourseLayout | null;
  },
): SkinsCalculationResult {
  const potDollars = options?.potDollars ?? SKINS_POT_DOLLARS;
  const random = options?.random ?? Math.random;
  const handicapsByPlayer = options?.handicapsByPlayer ?? {};
  const courseLayout = options?.courseLayout ?? null;

  if (!courseLayout || !courseLayout.strokeIndexes.some((index) => index > 0)) {
    return "no-course";
  }

  const holesByPlayer = scorecardToRosterHoles(players);

  const hasFullRound = TRIP_PLAYERS.every((player) => {
    const holes = holesByPlayer.get(player);
    return holes && holes.every((score) => score > 0);
  });

  if (!hasFullRound) {
    return "incomplete";
  }

  const skinsByPlayer: Record<string, number> = Object.fromEntries(
    TRIP_PLAYERS.map((player) => [player, 0]),
  );
  const holeResults: SkinsHoleResult[] = [];

  for (let holeIndex = 0; holeIndex < 18; holeIndex += 1) {
    const scores: SkinsHoleScore[] = TRIP_PLAYERS.map((player) => {
      const gross = holesByPlayer.get(player)![holeIndex];
      const { strokes, net } = netScoreOnHole(
        gross,
        player,
        holeIndex,
        handicapsByPlayer,
        courseLayout,
      );
      return { player, gross, strokes, net };
    });

    const minNet = Math.min(...scores.map((entry) => entry.net));
    const leaders = scores.filter((entry) => entry.net === minNet);

    let winner: string | null = null;
    const tied = leaders.length > 1;

    if (!tied && leaders.length === 1) {
      winner = leaders[0].player;
      skinsByPlayer[winner] += 1;
    }

    holeResults.push({
      hole: holeIndex + 1,
      winner,
      tied,
      incomplete: false,
      scores,
    });
  }

  const totalSkins = TRIP_PLAYERS.reduce((sum, player) => sum + skinsByPlayer[player], 0);
  const payoutByPlayer = splitSkinsPot(skinsByPlayer, potDollars, random);

  const playerResults: SkinsPlayerResult[] = TRIP_PLAYERS.map((player) => ({
    player,
    skins: skinsByPlayer[player],
    payoutDollars: payoutByPlayer[player],
  })).sort((a, b) => b.skins - a.skins || b.payoutDollars - a.payoutDollars);

  return {
    skinsByPlayer,
    payoutByPlayer,
    playerResults,
    holes: holeResults,
    totalSkins,
    potDollars,
  };
}

/**
 * Split pot by skins won; whole dollars only, sum equals pot.
 * Remaining dollars after flooring are assigned randomly.
 */
export function splitSkinsPot(
  skinsByPlayer: Record<string, number>,
  potDollars: number,
  random: () => number = Math.random,
): Record<string, number> {
  const players = [...TRIP_PLAYERS];
  const totalSkins = players.reduce((sum, player) => sum + (skinsByPlayer[player] ?? 0), 0);

  if (totalSkins <= 0) {
    return splitEvenPot(players, potDollars, random);
  }

  const shares = players.map((player) => {
    const skins = skinsByPlayer[player] ?? 0;
    const exact = (skins / totalSkins) * potDollars;
    return { player, skins, exact, payout: Math.floor(exact) };
  });

  let remaining = potDollars - shares.reduce((sum, entry) => sum + entry.payout, 0);

  const order = [...shares.keys()].sort(() => random() - 0.5);
  let cursor = 0;
  while (remaining > 0) {
    const index = order[cursor % order.length];
    shares[index].payout += 1;
    remaining -= 1;
    cursor += 1;
  }

  return Object.fromEntries(shares.map((entry) => [entry.player, entry.payout]));
}

function splitEvenPot(
  players: string[],
  potDollars: number,
  random: () => number,
): Record<string, number> {
  const base = Math.floor(potDollars / players.length);
  const payouts = players.map((player) => ({ player, payout: base }));
  let remaining = potDollars - base * players.length;

  const order = [...payouts.keys()].sort(() => random() - 0.5);
  let cursor = 0;
  while (remaining > 0) {
    payouts[order[cursor % order.length]].payout += 1;
    remaining -= 1;
    cursor += 1;
  }

  return Object.fromEntries(payouts.map((entry) => [entry.player, entry.payout]));
}

export function formatSkinsPayout(amount: number) {
  return amount === 0 ? "$0" : `$${amount}`;
}

export function formatSkinsHoleScore(entry: SkinsHoleScore) {
  if (entry.strokes === 0) {
    return String(entry.net);
  }
  return `${entry.net} (${entry.gross}−${entry.strokes})`;
}
