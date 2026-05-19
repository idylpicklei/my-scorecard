import { NextRequest, NextResponse } from "next/server";
import {
  getAuthUserFromRequestToken,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/local-db";
import { parseScorecardImageWithGemini } from "@/lib/scorecard-scan";
import { TRIP_PLAYERS } from "@/lib/trip-roster";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = await getAuthUserFromRequestToken(token);

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  if (user.role !== "admin") {
    return NextResponse.json({ error: "Only admins can scan scorecards." }, { status: 403 });
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }

  const image = formData.get("image");
  if (!(image instanceof File)) {
    return NextResponse.json({ error: "Photo is required." }, { status: 400 });
  }

  let knownPlayers: string[] = [...TRIP_PLAYERS];
  const rosterRaw = formData.get("knownPlayers");
  if (typeof rosterRaw === "string" && rosterRaw.trim()) {
    try {
      const parsed = JSON.parse(rosterRaw) as unknown;
      if (Array.isArray(parsed)) {
        const names = parsed
          .map((value) => (typeof value === "string" ? value.trim() : ""))
          .filter(Boolean);
        if (names.length > 0) {
          knownPlayers = names;
        }
      }
    } catch {
      // keep default roster
    }
  }

  const mimeType = image.type || "image/jpeg";
  const buffer = Buffer.from(await image.arrayBuffer());

  try {
    const players = await parseScorecardImageWithGemini(buffer, mimeType, knownPlayers);
    return NextResponse.json({ players });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to scan the scorecard image.";
    const status = message.includes("GEMINI_API_KEY") ? 503 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
