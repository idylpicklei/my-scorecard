import { NextRequest, NextResponse } from "next/server";
import {
  addScheduleEntry,
  getAuthUserFromRequestToken,
  getGolfCourseById,
  reorderScheduleEntry,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/local-db";

export const runtime = "nodejs";

type SchedulePayload = {
  title?: string;
  course?: string;
  courseId?: string;
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

  const courseId = payload?.courseId?.trim() || undefined;
  let course = kind === "dinner" ? courseRaw || "—" : courseRaw ?? "";

  if (kind === "round") {
    if (courseId) {
      const template = await getGolfCourseById(courseId);
      if (!template) {
        return NextResponse.json({ error: "Selected course was not found." }, { status: 400 });
      }
      course = template.name;
    }

    if (!course) {
      return NextResponse.json(
        { error: "Select a course with a saved scorecard for golf rounds." },
        { status: 400 },
      );
    }
  }

  const created = await addScheduleEntry({
    title,
    course,
    courseId: kind === "round" ? courseId : undefined,
    date,
    notes,
    kind,
  });

  return NextResponse.json({ entry: created });
}

type ReorderPayload = {
  id?: string;
  direction?: string;
};

export async function PATCH(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = await getAuthUserFromRequestToken(token);

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  if (user.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const payload = (await request.json().catch(() => null)) as ReorderPayload | null;
  const id = payload?.id?.trim();
  const direction = payload?.direction === "down" ? "down" : payload?.direction === "up" ? "up" : null;

  if (!id || !direction) {
    return NextResponse.json(
      { error: "Round id and direction (up or down) are required." },
      { status: 400 },
    );
  }

  const reordered = await reorderScheduleEntry(id, direction);
  if (!reordered) {
    return NextResponse.json(
      { error: "Unable to reorder this round." },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
