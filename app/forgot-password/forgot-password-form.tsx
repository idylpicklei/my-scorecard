"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export function ForgotPasswordForm() {
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setMessage(null);
    setResetUrl(null);

    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { message?: string; resetUrl?: string; error?: string }
      | null;

    if (!response.ok) {
      setError(payload?.error ?? "Unable to process request. Please try again.");
      setIsSubmitting(false);
      return;
    }

    setMessage(payload?.message ?? "Check your email for reset instructions.");
    if (payload?.resetUrl) {
      setResetUrl(payload.resetUrl);
    }
    setIsSubmitting(false);
  }

  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      <div className="space-y-2">
        <label
          htmlFor="username"
          className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-700"
        >
          Username
        </label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="MinJungKyu"
          autoComplete="username"
          className="w-full rounded-xl border border-emerald-800/20 bg-white/70 px-4 py-3 text-base text-stone-900 shadow-inner outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-400/30"
          required
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

      {resetUrl ? (
        <p className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Development reset link:{" "}
          <Link href={resetUrl} className="font-semibold underline break-all">
            {resetUrl}
          </Link>
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-emerald-700/60"
      >
        {isSubmitting ? "Sending..." : "Send reset link"}
      </button>
    </form>
  );
}
