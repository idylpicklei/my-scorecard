import { NextRequest, NextResponse } from "next/server";
import {
  createSessionForUser,
  findUserByLogin,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/local-db";
import { verifyPassword } from "@/lib/auth/password";

export const runtime = "nodejs";

type LoginPayload = {
  username?: string;
  email?: string;
  password?: string;
};

export async function POST(request: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      console.error("Login failed: DATABASE_URL is not configured.");
      return NextResponse.json(
        { error: "Server database is not configured." },
        { status: 503 },
      );
    }

    const payload = (await request.json().catch(() => null)) as LoginPayload | null;

    const login = (payload?.username ?? payload?.email)?.trim();
    const password = payload?.password;

    if (!login || !password) {
      return NextResponse.json(
        { error: "Username and password are required." },
        { status: 400 },
      );
    }

    const user = await findUserByLogin(login);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json(
        { error: "Invalid username or password." },
        { status: 401 },
      );
    }

    const { token, expiresAt } = await createSessionForUser(user.id);
    const response = NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        handicap: user.handicap,
        role: user.role,
      },
    });

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
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Unable to sign in right now. Please try again." },
      { status: 500 },
    );
  }
}
