import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/app/logout-button";
import { DashboardTabs } from "@/app/dashboard-tabs";
import { getUserBySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/local-db";

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    redirect("/login");
  }

  const user = await getUserBySessionToken(token);

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(130deg,_#ecfdf5_0%,_#f0f9ff_55%,_#fff7ed_100%)] px-4 py-10">
      <section className="w-full max-w-5xl rounded-3xl border border-emerald-900/10 bg-white/80 p-8 shadow-2xl backdrop-blur-sm sm:p-12">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-700">
              2026 Spring Breakfast Balls Tournament
            </p>
            <h1 className="mt-3 text-3xl font-black text-stone-900 sm:text-4xl">
              The Breakfast Balls Tournament
            </h1>
          </div>
          <LogoutButton />
        </div>

        <div className="mt-8">
          <DashboardTabs
            userRole={user.role}
            currentUser={{
              name: user.name,
              username: user.username,
              handicap: user.handicap,
            }}
          />
        </div>
      </section>
    </main>
  );
}
