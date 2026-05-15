import { NextRequest, NextResponse } from "next/server";
import {
  addScheduleEntry,
  getAuthUserFromRequestToken,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/local-db";

export const runtime = "nodejs";

type SchedulePayload = {
  title?: string;
  course?: string;
  date?: string;
  notes?: string;
  kind?: string;
};

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = await getAuthUserFromRequestToken(token);

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  if (user.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const payload = (await request.json().catch(() => null)) as SchedulePayload | null;

  const title = payload?.title?.trim();
  const courseRaw = payload?.course?.trim();
  const date = payload?.date?.trim();
  const notes = payload?.notes?.trim();
  const kind = payload?.kind === "dinner" ? "dinner" : "round";

  if (!title || !date) {
    return NextResponse.json(
      { error: "Title and date are required." },
      { status: 400 },
    );
  }

  if (kind === "round" && !courseRaw) {
    return NextResponse.json(
      { error: "Course name is required for golf rounds." },
      { status: 400 },
    );
  }

  const course = kind === "dinner" ? courseRaw || "—" : courseRaw!;

  const created = await addScheduleEntry({
    title,
    course,
    date,
    notes,
    kind,
  });

  return NextResponse.json({ entry: created });
}
