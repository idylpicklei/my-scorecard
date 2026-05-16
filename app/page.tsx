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
    <main className="min-h-dvh bg-stone-100 sm:bg-[linear-gradient(130deg,_#ecfdf5_0%,_#f0f9ff_55%,_#fff7ed_100%)] sm:flex sm:items-start sm:justify-center sm:px-4 sm:py-8">
      <section className="mx-auto w-full max-w-5xl bg-white sm:rounded-2xl sm:border sm:border-emerald-900/10 sm:bg-white/90 sm:p-8 sm:shadow-xl sm:backdrop-blur-sm lg:p-10">
        <header className="flex items-start justify-between gap-3 border-b border-stone-200 px-4 py-3 sm:border-0 sm:px-0 sm:py-0">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-700 sm:text-xs sm:tracking-[0.3em]">
              2026 Spring Breakfast Balls
            </p>
            <h1 className="mt-1 text-xl font-black leading-tight text-stone-900 sm:mt-3 sm:text-3xl lg:text-4xl">
              Breakfast Balls Tournament
            </h1>
          </div>
          <LogoutButton />
        </header>

        <div className="sm:mt-8">
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
