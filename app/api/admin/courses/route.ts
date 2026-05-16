import { NextRequest, NextResponse } from "next/server";
import {
  createGolfCourse,
  getAuthUserFromRequestToken,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/local-db";
import { normalizeHolePars, normalizeStrokeIndexes } from "@/lib/golf-course";

export const runtime = "nodejs";

type CoursePayload = {
  name?: string;
  holePars?: number[];
  strokeIndexes?: number[];
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

  const payload = (await request.json().catch(() => null)) as CoursePayload | null;
  const name = payload?.name?.trim();
  const holePars = normalizeHolePars(payload?.holePars);
  const strokeIndexes = normalizeStrokeIndexes(payload?.strokeIndexes);

  if (!name) {
    return NextResponse.json({ error: "Course name is required." }, { status: 400 });
  }

  if (!strokeIndexes) {
    return NextResponse.json(
      {
        error:
          "Assign handicap ranks 1–18 to each hole (1 = hardest). Each rank must be used once.",
      },
      { status: 400 },
    );
  }

  try {
    const course = await createGolfCourse({ name, holePars, strokeIndexes });
    return NextResponse.json({ course });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save course.";
    const status = message.includes("unique") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
