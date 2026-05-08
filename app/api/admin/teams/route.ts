import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import {
  DashboardTeam,
  getAuthUserFromRequestToken,
  SESSION_COOKIE_NAME,
  setTeams,
} from "@/lib/auth/local-db";

export const runtime = "nodejs";

type TeamPayload = {
  teams?: Array<{
    id?: string;
    name?: string;
    players?: string[];
  }>;
};

export async function PUT(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = await getAuthUserFromRequestToken(token);

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  if (user.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const payload = (await request.json().catch(() => null)) as TeamPayload | null;

  if (!payload?.teams || payload.teams.length === 0) {
    return NextResponse.json({ error: "At least one team is required." }, { status: 400 });
  }

  const normalizedTeams: DashboardTeam[] = payload.teams
    .map((team) => ({
      id: (team.id ?? randomUUID()).trim(),
      name: team.name?.trim() ?? "",
      players: Array.isArray(team.players)
        ? team.players.map((player) => player.trim()).filter(Boolean)
        : [],
    }))
    .filter((team) => team.name.length > 0);

  if (normalizedTeams.length === 0) {
    return NextResponse.json({ error: "Invalid team payload." }, { status: 400 });
  }

  const updatedTeams = await setTeams(normalizedTeams);

  return NextResponse.json({ teams: updatedTeams });
}
