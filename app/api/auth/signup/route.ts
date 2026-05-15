import { NextRequest, NextResponse } from "next/server";
import {
  createSessionForUser,
  createUser,
  findUserByEmail,
  findUserByUsername,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/local-db";
import { isValidUsername, normalizeUsername } from "@/lib/auth/username";

export const runtime = "nodejs";

type SignupPayload = {
  username?: string;
  name?: string;
  email?: string;
  password?: string;
};

export async function POST(request: NextRequest) {
  const payload = (await request.json().catch(() => null)) as SignupPayload | null;

  const username = payload?.username?.trim();
  const name = payload?.name?.trim();
  const email = payload?.email?.trim().toLowerCase();
  const password = payload?.password;

  if (!username || !name || !email || !password) {
    return NextResponse.json(
      { error: "Username, name, email, and password are required." },
      { status: 400 },
    );
  }

  if (!isValidUsername(username)) {
    return NextResponse.json(
      {
        error:
          "Username must be 3–32 characters and use only letters, numbers, or underscores.",
      },
      { status: 400 },
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 },
    );
  }

  if (await findUserByUsername(normalizeUsername(username))) {
    return NextResponse.json(
      { error: "That username is already taken." },
      { status: 409 },
    );
  }

  if (await findUserByEmail(email)) {
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 },
    );
  }

  const user = await createUser({ username, email, name, password });
  if (!user) {
    return NextResponse.json(
      { error: "Unable to create account. Please try again." },
      { status: 400 },
    );
  }

  const { token, expiresAt } = await createSessionForUser(user.id);
  const response = NextResponse.json({ user });

  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt),
  });

  return response;
}
