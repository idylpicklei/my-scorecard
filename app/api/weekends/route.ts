import { NextRequest, NextResponse } from "next/server";
import {
  getAuthUserFromRequestToken,
  getWeekendDashboardData,
  listWeekends,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/local-db";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = await getAuthUserFromRequestToken(token);

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const weekendId = request.nextUrl.searchParams.get("id");

  if (weekendId) {
    const weekends = await listWeekends();
    const weekend = weekends.find((entry) => entry.id === weekendId);
    if (!weekend) {
      return NextResponse.json({ error: "Weekend not found." }, { status: 404 });
    }

    const data = await getWeekendDashboardData(weekendId);
    return NextResponse.json({ weekend, ...data });
  }

  const weekends = await listWeekends();
  const activeWeekend = weekends.find((entry) => entry.status === "active") ?? null;
  const pastWeekends = weekends.filter((entry) => entry.status === "completed");

  return NextResponse.json({ activeWeekend, pastWeekends, weekends });
}
