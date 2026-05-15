import { NextRequest, NextResponse } from "next/server";
import { resetPasswordWithToken } from "@/lib/auth/local-db";

export const runtime = "nodejs";

type ResetPasswordPayload = {
  token?: string;
  password?: string;
};

export async function POST(request: NextRequest) {
  const payload = (await request.json().catch(() => null)) as ResetPasswordPayload | null;
  const token = payload?.token?.trim();
  const password = payload?.password;

  if (!token || !password) {
    return NextResponse.json(
      { error: "Reset token and new password are required." },
      { status: 400 },
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 },
    );
  }

  const updated = await resetPasswordWithToken(token, password);
  if (!updated) {
    return NextResponse.json(
      { error: "This reset link is invalid or has expired." },
      { status: 400 },
    );
  }

  return NextResponse.json({
    message: "Your password has been updated. You can sign in now.",
  });
}
