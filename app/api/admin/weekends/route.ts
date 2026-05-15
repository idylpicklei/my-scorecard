import { NextRequest, NextResponse } from "next/server";
import {
  endActiveWeekend,
  getAuthUserFromRequestToken,
  SESSION_COOKIE_NAME,
  startNewWeekend,
} from "@/lib/auth/local-db";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = await getAuthUserFromRequestToken(token);

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  if (user.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as { endDate?: string };

  try {
    const weekend = await endActiveWeekend(body.endDate);
    return NextResponse.json({ weekend });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to end weekend.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = await getAuthUserFromRequestToken(token);

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  if (user.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const body = (await request.json()) as {
    title?: string;
    startDate?: string;
    endDate?: string;
  };

  const title = body.title?.trim();
  const startDate = body.startDate?.trim();

  if (!title || !startDate) {
    return NextResponse.json(
      { error: "Title and start date are required." },
      { status: 400 },
    );
  }

  try {
    const weekend = await startNewWeekend({
      title,
      startDate,
      endDate: body.endDate?.trim() || undefined,
    });

    return NextResponse.json({ weekend });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to start weekend.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
