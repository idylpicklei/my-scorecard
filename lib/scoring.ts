import { TRIP_PLAYERS } from "@/lib/trip-roster";

export type PlayerScoreInput = {
  player: string;
  front9: number;
  back9: number;
};

export type PlayerStanding = {
  player: string;
  grossTotal: number;
  handicap: number;
  netTotal: number;
  hasScores: boolean;
  position: number;
};

export type TeamStanding = {
  id: string;
  name: string;
  players: string[];
  grossTotal: number;
  netTotal: number;
  hasScores: boolean;
};

export type TripOverview = {
  playerStandings: PlayerStanding[];
  teamStandings: TeamStanding[];
  currentPlayer: PlayerStanding | null;
};

function normalizePlayerKey(value: string): string {
  return value.trim().toLowerCase();
}

export function resolveTripPlayerName(
  user: { name: string; username: string },
): string | null {
  const nameKey = normalizePlayerKey(user.name);
  const usernameKey = normalizePlayerKey(user.username);

  return (
    TRIP_PLAYERS.find(
      (player) =>
        normalizePlayerKey(player) === nameKey ||
        normalizePlayerKey(player) === usernameKey,
    ) ?? null
  );
}

export function buildTripOverview(input: {
  scoreRows: PlayerScoreInput[];
  handicapsByPlayer: Record<string, number>;
  teams: Array<{ id: string; name: string; players: string[] }>;
  currentUser: { name: string; username: string };
}): TripOverview {
  const scoreByPlayer = new Map(
    input.scoreRows.map((row) => [normalizePlayerKey(row.player), row]),
  );

  const ranked = TRIP_PLAYERS.map((player) => {
    const row = scoreByPlayer.get(normalizePlayerKey(player));
    const grossTotal = row ? row.front9 + row.back9 : 0;
    const hasScores = grossTotal > 0;
    const handicap = input.handicapsByPlayer[player] ?? 0;
    const netTotal = hasScores ? grossTotal - handicap : 0;

    return {
      player,
      grossTotal,
      handicap,
      netTotal,
      hasScores,
    };
  }).sort((a, b) => {
    if (a.hasScores && !b.hasScores) return -1;
    if (!a.hasScores && b.hasScores) return 1;
    if (!a.hasScores && !b.hasScores) {
      return TRIP_PLAYERS.indexOf(a.player) - TRIP_PLAYERS.indexOf(b.player);
    }
    return a.netTotal - b.netTotal;
  });

  const playerStandings: PlayerStanding[] = ranked.map((entry, index) => ({
    ...entry,
    position: index + 1,
  }));

  const standingByPlayer = new Map(
    playerStandings.map((entry) => [entry.player, entry]),
  );

  const teamStandings: TeamStanding[] = input.teams.map((team) => {
    let grossTotal = 0;
    let netTotal = 0;
    let hasScores = false;

    for (const player of team.players) {
      const standing = standingByPlayer.get(player);
      if (!standing?.hasScores) {
        continue;
      }
      hasScores = true;
      grossTotal += standing.grossTotal;
      netTotal += standing.netTotal;
    }

    return {
      id: team.id,
      name: team.name,
      players: team.players,
      grossTotal,
      netTotal,
      hasScores,
    };
  }).sort((a, b) => {
    if (a.hasScores && !b.hasScores) return -1;
    if (!a.hasScores && b.hasScores) return 1;
    if (!a.hasScores && !b.hasScores) return 0;
    return a.netTotal - b.netTotal;
  });

  const tripPlayerName = resolveTripPlayerName(input.currentUser);
  const currentPlayer = tripPlayerName
    ? (standingByPlayer.get(tripPlayerName) ?? null)
    : null;

  return {
    playerStandings,
    teamStandings,
    currentPlayer,
  };
}

export function buildCumulativeTripOverview(input: {
  scorecards: Array<{
    players: Array<{ playerName: string; holes: number[] }>;
  }>;
  handicapsByPlayer: Record<string, number>;
  teams: Array<{ id: string; name: string; players: string[] }>;
  currentUser: { name: string; username: string };
}): TripOverview {
  const grossByPlayer = new Map<string, number>();
  const netByPlayer = new Map<string, number>();

  for (const player of TRIP_PLAYERS) {
    grossByPlayer.set(player, 0);
    netByPlayer.set(player, 0);
  }

  for (const scorecard of input.scorecards) {
    const rowByPlayer = new Map<string, { front9: number; back9: number }>();
    for (const entry of scorecard.players) {
      const front9 = entry.holes.slice(0, 9).reduce((sum, score) => sum + score, 0);
      const back9 = entry.holes.slice(9, 18).reduce((sum, score) => sum + score, 0);
      rowByPlayer.set(entry.playerName.trim().toLowerCase(), { front9, back9 });
    }

    for (const player of TRIP_PLAYERS) {
      const row = rowByPlayer.get(normalizePlayerKey(player));
      const gross = row ? row.front9 + row.back9 : 0;
      if (gross <= 0) {
        continue;
      }
      const handicap = input.handicapsByPlayer[player] ?? 0;
      grossByPlayer.set(player, (grossByPlayer.get(player) ?? 0) + gross);
      netByPlayer.set(player, (netByPlayer.get(player) ?? 0) + (gross - handicap));
    }
  }

  const ranked = TRIP_PLAYERS.map((player) => {
    const grossTotal = grossByPlayer.get(player) ?? 0;
    const netTotal = netByPlayer.get(player) ?? 0;
    return {
      player,
      grossTotal,
      handicap: input.handicapsByPlayer[player] ?? 0,
      netTotal,
      hasScores: grossTotal > 0,
    };
  }).sort((a, b) => {
    if (a.hasScores && !b.hasScores) return -1;
    if (!a.hasScores && b.hasScores) return 1;
    if (!a.hasScores && !b.hasScores) {
      return TRIP_PLAYERS.indexOf(a.player) - TRIP_PLAYERS.indexOf(b.player);
    }
    return a.netTotal - b.netTotal;
  });

  const playerStandings: PlayerStanding[] = ranked.map((entry, index) => ({
    ...entry,
    position: index + 1,
  }));

  const standingByPlayer = new Map(
    playerStandings.map((entry) => [entry.player, entry]),
  );

  const teamStandings: TeamStanding[] = input.teams
    .map((team) => {
      let grossTotal = 0;
      let netTotal = 0;
      let hasScores = false;

      for (const player of team.players) {
        const standing = standingByPlayer.get(player);
        if (!standing?.hasScores) {
          continue;
        }
        hasScores = true;
        grossTotal += standing.grossTotal;
        netTotal += standing.netTotal;
      }

      return {
        id: team.id,
        name: team.name,
        players: team.players,
        grossTotal,
        netTotal,
        hasScores,
      };
    })
    .sort((a, b) => {
      if (a.hasScores && !b.hasScores) return -1;
      if (!a.hasScores && b.hasScores) return 1;
      if (!a.hasScores && !b.hasScores) return 0;
      return a.netTotal - b.netTotal;
    });

  const tripPlayerName = resolveTripPlayerName(input.currentUser);
  const currentPlayer = tripPlayerName
    ? (standingByPlayer.get(tripPlayerName) ?? null)
    : null;

  return {
    playerStandings,
    teamStandings,
    currentPlayer,
  };
}

export function formatPosition(position: number, total: number): string {
  if (position <= 0 || total <= 0) {
    return "—";
  }
  const suffix =
    position % 10 === 1 && position % 100 !== 11
      ? "st"
      : position % 10 === 2 && position % 100 !== 12
        ? "nd"
        : position % 10 === 3 && position % 100 !== 13
          ? "rd"
          : "th";
  return `${position}${suffix} of ${total}`;
}
