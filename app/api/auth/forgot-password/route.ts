import { NextRequest, NextResponse } from "next/server";
import { createPasswordResetToken } from "@/lib/auth/local-db";

export const runtime = "nodejs";

type ForgotPasswordPayload = {
  email?: string;
};

export async function POST(request: NextRequest) {
  const payload = (await request.json().catch(() => null)) as ForgotPasswordPayload | null;
  const email = payload?.email?.trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const reset = await createPasswordResetToken(email);
  const origin = request.nextUrl.origin;
  const body: { message: string; resetUrl?: string } = {
    message:
      "If an account exists for that email, password reset instructions have been generated.",
  };

  if (reset && process.env.NODE_ENV !== "production") {
    body.resetUrl = `${origin}/reset-password?token=${reset.token}`;
  }

  return NextResponse.json(body);
}
