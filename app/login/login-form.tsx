"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type LoginState = {
  email: string;
  password: string;
};

export function LoginForm() {
  const router = useRouter();
  const [form, setForm] = useState<LoginState>({
    email: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setError(payload?.error ?? "Unable to sign in. Please try again.");
      setIsSubmitting(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      <div className="space-y-2">
        <label
          htmlFor="email"
          className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-700"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          value={form.email}
          onChange={(event) =>
            setForm((previous) => ({
              ...previous,
              email: event.target.value,
            }))
          }
          placeholder="friends@myscorecard.local"
          autoComplete="email"
          className="w-full rounded-xl border border-emerald-800/20 bg-white/70 px-4 py-3 text-base text-stone-900 shadow-inner outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-400/30"
          required
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="password"
          className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-700"
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          value={form.password}
          onChange={(event) =>
            setForm((previous) => ({
              ...previous,
              password: event.target.value,
            }))
          }
          placeholder="Enter your password"
          autoComplete="current-password"
          className="w-full rounded-xl border border-emerald-800/20 bg-white/70 px-4 py-3 text-base text-stone-900 shadow-inner outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-400/30"
          required
        />
        <p className="text-right">
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-emerald-800 hover:text-emerald-900"
          >
            Forgot password?
          </Link>
        </p>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-emerald-700/60"
      >
        {isSubmitting ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
