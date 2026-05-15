import Link from "next/link";
import { ResetPasswordForm } from "@/app/reset-password/reset-password-form";

type ResetPasswordPageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const { token } = await searchParams;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,_#f5f5c8_0%,_#d2f5dc_45%,_#c7e1ff_100%)] px-4 py-10">
      <section className="relative z-10 w-full max-w-md rounded-3xl border border-white/70 bg-white/80 p-8 shadow-2xl backdrop-blur-md sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-700">
          My Scorecard
        </p>
        <h1 className="mt-3 text-3xl font-black leading-tight text-stone-900">
          Set a new password
        </h1>
        <p className="mt-3 text-sm text-stone-600">
          Choose a new password for your account. Reset links expire after one hour.
        </p>

        <div className="mt-8">
          <ResetPasswordForm token={token ?? ""} />
        </div>

        <p className="mt-6 text-center text-sm text-stone-600">
          <Link href="/login" className="font-semibold text-emerald-800 hover:text-emerald-900">
            Back to sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
