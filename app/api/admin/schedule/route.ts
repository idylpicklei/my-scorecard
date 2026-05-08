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
  const course = payload?.course?.trim();
  const date = payload?.date?.trim();
  const notes = payload?.notes?.trim();

  if (!title || !course || !date) {
    return NextResponse.json(
      { error: "Title, course, and date are required." },
      { status: 400 },
    );
  }

  const created = await addScheduleEntry({
    title,
    course,
    date,
    notes,
  });

  return NextResponse.json({ entry: created });
}
