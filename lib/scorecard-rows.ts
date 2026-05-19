import { TRIP_PLAYERS } from "@/lib/trip-roster";

export type ScoreRow = {
  player: string;
  front9: number;
  back9: number;
};

export type ScorecardPlayer = {
  playerName: string;
  holes: number[];
};

export type SavedScorecardLike = {
  id: string;
  course: string;
  courseId?: string;
  scheduleEntryId?: string;
  date: string;
  players: ScorecardPlayer[];
  createdAt?: string;
};

export function scorecardToRows(scorecard: SavedScorecardLike): ScoreRow[] {
  const rowByPlayer = new Map<string, ScoreRow>();

  for (const entry of scorecard.players) {
    const front9 = entry.holes.slice(0, 9).reduce((sum, score) => sum + score, 0);
    const back9 = entry.holes.slice(9, 18).reduce((sum, score) => sum + score, 0);
    rowByPlayer.set(entry.playerName.trim().toLowerCase(), {
      player: entry.playerName.trim(),
      front9,
      back9,
    });
  }

  return TRIP_PLAYERS.map((player) => {
    const match = rowByPlayer.get(player.toLowerCase());
    if (!match) {
      return { player, front9: 0, back9: 0 };
    }
    return { player, front9: match.front9, back9: match.back9 };
  });
}

export function cumulativeScoreRows(scorecards: SavedScorecardLike[]): ScoreRow[] {
  const totals = new Map<string, { front9: number; back9: number }>();

  for (const player of TRIP_PLAYERS) {
    totals.set(player, { front9: 0, back9: 0 });
  }

  for (const scorecard of scorecards) {
    for (const row of scorecardToRows(scorecard)) {
      const gross = row.front9 + row.back9;
      if (gross <= 0) {
        continue;
      }
      const bucket = totals.get(row.player)!;
      bucket.front9 += row.front9;
      bucket.back9 += row.back9;
    }
  }

  return TRIP_PLAYERS.map((player) => {
    const bucket = totals.get(player)!;
    return { player, front9: bucket.front9, back9: bucket.back9 };
  });
}
