"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type ResetPasswordFormProps = {
  token: string;
};

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!token) {
      setError("Missing reset token. Use the link from your reset email.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setIsSubmitting(true);

    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { message?: string; error?: string }
      | null;

    if (!response.ok) {
      setError(payload?.error ?? "Unable to reset password. Please try again.");
      setIsSubmitting(false);
      return;
    }

    setMessage(payload?.message ?? "Password updated.");
    setIsSubmitting(false);
    router.push("/login");
    router.refresh();
  }

  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      {!token ? (
        <p className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          This page needs a reset token. Request a new link from the forgot password page.
        </p>
      ) : null}

      <div className="space-y-2">
        <label
          htmlFor="password"
          className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-700"
        >
          New password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
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
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
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

      {message ? (
        <p className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting || !token}
        className="w-full rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-emerald-700/60"
      >
        {isSubmitting ? "Updating..." : "Update password"}
      </button>
    </form>
  );
}
