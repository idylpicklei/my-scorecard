export const TRIP_PLAYERS = [
  "MinJungKyu",
  "Dylpickle",
  "PigTank",
  "PaulHawk",
];

/** Names as they appear on paper scorecards → trip roster id. */
export const TRIP_PLAYER_ALIASES: Record<string, string[]> = {
  MinJungKyu: ["Darren"],
  Dylpickle: ["Dylan"],
  PaulHawk: ["Paul"],
  PigTank: ["Sam"],
};

/** Default 18-hole handicaps for trip scoring (editable in database). */
export const TRIP_PLAYER_HANDICAPS: Record<string, number> = {
  MinJungKyu: 8,
  Dylpickle: 14,
  PigTank: 18,
  PaulHawk: 11,
};

function normalizeNameKey(value: string) {
  return value.trim().toLowerCase();
}

/** Map a scorecard or display name to the canonical trip roster name. */
export function resolveNameToRosterName(rawName: string): string | null {
  const lower = normalizeNameKey(rawName);
  if (!lower) {
    return null;
  }

  for (const rosterName of TRIP_PLAYERS) {
    if (normalizeNameKey(rosterName) === lower) {
      return rosterName;
    }

    const aliases = TRIP_PLAYER_ALIASES[rosterName] ?? [];
    for (const alias of aliases) {
      const aliasLower = normalizeNameKey(alias);
      if (aliasLower === lower || lower.includes(aliasLower) || aliasLower.includes(lower)) {
        return rosterName;
      }
    }
  }

  return null;
}

/** Roster + scorecard aliases for Gemini prompts. */
export function formatRosterNamesForScorecardScan(): string {
  return TRIP_PLAYERS.map((rosterName) => {
    const aliases = TRIP_PLAYER_ALIASES[rosterName];
    if (!aliases.length) {
      return rosterName;
    }
    return `${rosterName} (on card: ${aliases.join(", ")})`;
  }).join("; ");
}
