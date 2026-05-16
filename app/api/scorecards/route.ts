import { NextRequest, NextResponse } from "next/server";
import {
  getAuthUserFromRequestToken,
  getGolfCourseById,
  getScorecards,
  saveScorecard,
  SESSION_COOKIE_NAME,
  type PlayerScores,
} from "@/lib/auth/local-db";

export const runtime = "nodejs";

type ScorecardPayload = {
  course?: string;
  courseId?: string;
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

  if (user.role !== "admin") {
    return NextResponse.json({ error: "Only admins can upload scorecards." }, { status: 403 });
  }

  const payload = (await request.json().catch(() => null)) as ScorecardPayload | null;

  const courseId = payload?.courseId?.trim();
  const date = payload?.date?.trim();
  const players = payload?.players;
  let course = payload?.course?.trim() ?? "";

  if (courseId) {
    const template = await getGolfCourseById(courseId);
    if (!template) {
      return NextResponse.json({ error: "Selected course was not found." }, { status: 400 });
    }
    course = template.name;
  }

  if (!course || !date || !players || players.length === 0) {
    return NextResponse.json(
      { error: "Course, date, and at least one player are required." },
      { status: 400 },
    );
  }

  const normalizedPlayers: PlayerScores[] = players
    .map((player) => {
      const raw = Array.isArray(player.holes) ? player.holes : [];
      const holes = Array.from({ length: 18 }, (_, index) => {
        const score = Number(raw[index]);
        return Number.isFinite(score) && score > 0 ? score : 0;
      });
      return {
        playerName: player.playerName?.trim() ?? "",
        holes,
      };
    })
    .filter(
      (player) => player.playerName.length > 0 && player.holes.every((score) => score > 0),
    );

  if (normalizedPlayers.length === 0) {
    return NextResponse.json(
      { error: "Each player must have 18 hole scores entered." },
      { status: 400 },
    );
  }

  const created = await saveScorecard({
    course,
    courseId: courseId || undefined,
    date,
    players: normalizedPlayers,
  });

  return NextResponse.json({ scorecard: created });
}
