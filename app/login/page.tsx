import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/local-db";
import { LoginForm } from "@/app/login/login-form";

export default async function LoginPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    const user = await getUserBySessionToken(token);
    if (user) {
      redirect("/");
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,_#f5f5c8_0%,_#d2f5dc_45%,_#c7e1ff_100%)] px-4 py-10">
      <div className="pointer-events-none absolute -left-32 top-16 h-72 w-72 rounded-full bg-white/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-12 h-80 w-80 rounded-full bg-emerald-500/25 blur-3xl" />

      <section className="relative z-10 w-full max-w-md rounded-3xl border border-white/70 bg-white/80 p-8 shadow-2xl backdrop-blur-md sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-700">
          2026 Spring Breakfast Balls Tournament
        </p>
        <h1 className="mt-3 text-3xl font-black leading-tight text-stone-900 sm:text-4xl">
          Breakfast Balls Tournament
        </h1>
        <div className="mt-8">
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-sm text-stone-600">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-semibold text-emerald-800 hover:text-emerald-900">
            Sign up
          </Link>
        </p>
      </section>
    </main>
  );
}
