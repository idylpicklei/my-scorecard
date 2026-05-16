"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  DEFAULT_HOLE_PARS,
  DEFAULT_STROKE_INDEXES,
  normalizeHolePars,
  normalizeStrokeIndexes,
  totalPar,
  type GolfCourseLayout,
} from "@/lib/golf-course";

type CourseSetupFormProps = {
  onCreated: (course: GolfCourseLayout) => void;
};

export function CourseSetupForm({ onCreated }: CourseSetupFormProps) {
  const [name, setName] = useState("");
  const [holePars, setHolePars] = useState<number[]>([...DEFAULT_HOLE_PARS]);
  const [strokeIndexes, setStrokeIndexes] = useState<number[]>([...DEFAULT_STROKE_INDEXES]);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const validationError = useMemo(() => {
    if (!normalizeStrokeIndexes(strokeIndexes)) {
      return "Each hole needs a unique handicap rank from 1 (hardest) to 18 (easiest).";
    }
    return null;
  }, [strokeIndexes]);

  const parTotal = useMemo(() => totalPar(holePars), [holePars]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);
    setError(null);

    const response = await fetch("/api/admin/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        holePars: normalizeHolePars(holePars),
        strokeIndexes,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? "Unable to save course.");
      setIsSaving(false);
      return;
    }

    const payload = (await response.json()) as { course: GolfCourseLayout };
    setName("");
    setHolePars([...DEFAULT_HOLE_PARS]);
    setStrokeIndexes([...DEFAULT_STROKE_INDEXES]);
    onCreated(payload.course);
    setIsSaving(false);
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div>
        <label className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-600">
          Course name
        </label>
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Timberline Golf Club"
          className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 outline-none focus:border-emerald-700"
          required
        />
      </div>

      <p className="text-xs text-stone-600">
        Set par for each hole and handicap stroke rank (1 = hardest hole, 18 = easiest). These
        drive par and stroke hints when logging rounds.
      </p>

      <p className="text-sm font-semibold text-stone-800">Course par: {parTotal}</p>

      <div className="max-h-80 overflow-y-auto rounded-xl border border-stone-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 bg-stone-50 text-left text-xs uppercase tracking-[0.12em] text-stone-500">
            <tr>
              <th className="px-3 py-2">Hole</th>
              <th className="px-3 py-2">Par</th>
              <th className="px-3 py-2">Handicap rank</th>
            </tr>
          </thead>
          <tbody>
            {holePars.map((par, index) => (
              <tr key={index} className="border-t border-stone-100">
                <td className="px-3 py-2 font-semibold text-stone-800">{index + 1}</td>
                <td className="px-3 py-2">
                  <select
                    value={par}
                    onChange={(event) => {
                      const next = [...holePars];
                      next[index] = Number(event.target.value);
                      setHolePars(next);
                    }}
                    className="w-full rounded-lg border border-stone-300 bg-white px-2 py-1 text-sm"
                  >
                    {[3, 4, 5, 6].map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <select
                    value={strokeIndexes[index]}
                    onChange={(event) => {
                      const next = [...strokeIndexes];
                      next[index] = Number(event.target.value);
                      setStrokeIndexes(next);
                    }}
                    className="w-full rounded-lg border border-stone-300 bg-white px-2 py-1 text-sm"
                  >
                    {Array.from({ length: 18 }, (_, rank) => rank + 1).map((rank) => (
                      <option key={rank} value={rank}>
                        {rank}
                        {rank === 1 ? " (hardest)" : rank === 18 ? " (easiest)" : ""}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {validationError ? (
        <p className="text-sm text-amber-800">{validationError}</p>
      ) : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <button
        type="submit"
        disabled={isSaving}
        className="w-full rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-emerald-800 disabled:opacity-70"
      >
        {isSaving ? "Saving course..." : "Save course scorecard"}
      </button>
    </form>
  );
}
