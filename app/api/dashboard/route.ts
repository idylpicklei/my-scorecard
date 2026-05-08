import { NextRequest, NextResponse } from "next/server";
import {
  getAuthUserFromRequestToken,
  getDashboardConfiguration,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/local-db";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = await getAuthUserFromRequestToken(token);

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const dashboard = await getDashboardConfiguration();

  return NextResponse.json({
    user,
    ...dashboard,
  });
}
