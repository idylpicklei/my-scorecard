import { NextRequest, NextResponse } from "next/server";
import {
  getAuthUserFromRequestToken,
  getScorecards,
  saveScorecard,
  SESSION_COOKIE_NAME,
  type PlayerScores,
} from "@/lib/auth/local-db";

export const runtime = "nodejs";

type ScorecardPayload = {
  course?: string;
  date?: string;
  players?: Array<{
    playerName?: string;
    holes?: number[];
  }>;
};

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = await getAuthUserFromRequestToken(token);

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const scorecards = await getScorecards();

  return NextResponse.json({ scorecards });
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = await getAuthUserFromRequestToken(token);

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as ScorecardPayload | null;

  const course = payload?.course?.trim();
  const date = payload?.date?.trim();
  const players = payload?.players;

  if (!course || !date || !players || players.length === 0) {
    return NextResponse.json(
      { error: "Course, date, and at least one player are required." },
      { status: 400 },
    );
  }

  const normalizedPlayers: PlayerScores[] = players
    .map((player) => ({
      playerName: player.playerName?.trim() ?? "",
      holes: Array.isArray(player.holes)
        ? player.holes.map((score) => Number(score) || 0).filter((score) => score > 0)
        : [],
    }))
    .filter((player) => player.playerName.length > 0 && player.holes.length === 18);

  if (normalizedPlayers.length === 0) {
    return NextResponse.json(
      { error: "Each player must have 18 hole scores entered." },
      { status: 400 },
    );
  }

  const created = await saveScorecard({
    course,
    date,
    players: normalizedPlayers,
  });

  return NextResponse.json({ scorecard: created });
}
