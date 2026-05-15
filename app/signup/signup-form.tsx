"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type SignupState = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export function SignupForm() {
  const router = useRouter();
  const [form, setForm] = useState<SignupState>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setIsSubmitting(true);

    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        email: form.email,
        password: form.password,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? "Unable to create account. Please try again.");
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
          htmlFor="name"
          className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-700"
        >
          Name
        </label>
        <input
          id="name"
          type="text"
          value={form.name}
          onChange={(event) =>
            setForm((previous) => ({ ...previous, name: event.target.value }))
          }
          placeholder="Your name"
          autoComplete="name"
          className="w-full rounded-xl border border-emerald-800/20 bg-white/70 px-4 py-3 text-base text-stone-900 shadow-inner outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-400/30"
          required
        />
      </div>

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
            setForm((previous) => ({ ...previous, email: event.target.value }))
          }
          placeholder="you@example.com"
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
            setForm((previous) => ({ ...previous, password: event.target.value }))
          }
          placeholder="At least 8 characters"
          autoComplete="new-password"
          className="w-full rounded-xl border border-emerald-800/20 bg-white/70 px-4 py-3 text-base text-stone-900 shadow-inner outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-400/30"
          required
          minLength={8}
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="confirmPassword"
          className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-700"
        >
          Confirm password
        </label>
        <input
          id="confirmPassword"
          type="password"
          value={form.confirmPassword}
          onChange={(event) =>
            setForm((previous) => ({
              ...previous,
              confirmPassword: event.target.value,
            }))
          }
          placeholder="Re-enter your password"
          autoComplete="new-password"
          className="w-full rounded-xl border border-emerald-800/20 bg-white/70 px-4 py-3 text-base text-stone-900 shadow-inner outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-400/30"
          required
          minLength={8}
        />
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
        {isSubmitting ? "Creating account..." : "Create account"}
      </button>
    </form>
  );
}


