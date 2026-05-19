"use client";

import { useMemo, useState } from "react";
import {
  calculateSkinsForRound,
  formatSkinsHoleScore,
  formatSkinsPayout,
  SKINS_POT_DOLLARS,
  type SkinsCalculationResult,
} from "@/lib/skins";
import type { GolfCourseLayout } from "@/lib/golf-course";
import { TRIP_PLAYER_ALIASES } from "@/lib/trip-roster";
import { formatScheduleDate, type ScheduleItemLike } from "@/lib/schedule-utils";
import type { SavedScorecardLike } from "@/lib/scorecard-rows";

type RoundOption = {
  id: string;
  label: string;
  dateLabel: string;
  scorecard: SavedScorecardLike | null;
};

type SkinsGamePanelProps = {
  schedule: ScheduleItemLike[];
  scorecards: SavedScorecardLike[];
  golfCourses: GolfCourseLayout[];
  handicapsByPlayer: Record<string, number>;
};

function resolveCourseLayout(
  scorecard: SavedScorecardLike,
  golfCourses: GolfCourseLayout[],
) {
  const course =
    (scorecard.courseId
      ? golfCourses.find((entry) => entry.id === scorecard.courseId)
      : null) ??
    golfCourses.find(
      (entry) =>
        entry.name.trim().toLowerCase() === scorecard.course.trim().toLowerCase(),
    );

  if (!course) {
    return null;
  }

  return {
    holePars: course.holePars,
    strokeIndexes: course.strokeIndexes,
  };
}

function displayPlayerName(rosterName: string) {
  const aliases = TRIP_PLAYER_ALIASES[rosterName];
  if (aliases?.length) {
    return `${rosterName} (${aliases[0]})`;
  }
  return rosterName;
}

export function SkinsGamePanel({
  schedule,
  scorecards,
  golfCourses,
  handicapsByPlayer,
}: SkinsGamePanelProps) {
  const roundOptions = useMemo((): RoundOption[] => {
    return schedule
      .filter((item) => item.kind === "round")
      .sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title))
      .map((item) => {
        const scorecard =
          scorecards.find(
            (entry) =>
              entry.date === item.date &&
              entry.course.trim().toLowerCase() === item.course.trim().toLowerCase(),
          ) ?? null;

        return {
          id: scorecard?.id ?? `schedule-${item.id}`,
          label: `${item.title} · ${item.course}`,
          dateLabel: formatScheduleDate(item.date),
          scorecard,
        };
      });
  }, [schedule, scorecards]);

  const defaultRoundId =
    roundOptions.find((option) => option.scorecard)?.id ?? roundOptions[0]?.id ?? "";

  const [selectedRoundId, setSelectedRoundId] = useState(defaultRoundId);
  const [payoutSeed, setPayoutSeed] = useState(0);

  const activeRoundId = roundOptions.some((option) => option.id === selectedRoundId)
    ? selectedRoundId
    : defaultRoundId;

  const activeOption = roundOptions.find((option) => option.id === activeRoundId);

  const skinsResult = useMemo((): SkinsCalculationResult | null => {
    void payoutSeed;
    if (!activeOption?.scorecard) {
      return null;
    }
    return calculateSkinsForRound(activeOption.scorecard.players, {
      handicapsByPlayer,
      courseLayout: resolveCourseLayout(activeOption.scorecard, golfCourses),
    });
  }, [activeOption, payoutSeed, handicapsByPlayer, golfCourses]);

  function reshufflePayout() {
    setPayoutSeed((value) => value + 1);
  }

  if (roundOptions.length === 0) {
    return (
      <p className="text-sm text-stone-600">
        Add golf rounds to the schedule, then post a scorecard to see skins results.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="hidden sm:block">
        <label
          htmlFor="skins-round"
          className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-600"
        >
          Round
        </label>
        <select
          id="skins-round"
          value={activeRoundId}
          onChange={(event) => setSelectedRoundId(event.target.value)}
          className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm font-semibold text-stone-900 outline-none focus:border-emerald-700"
        >
          {roundOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label} — {option.dateLabel}
              {option.scorecard ? "" : " (no scorecard)"}
            </option>
          ))}
        </select>
      </div>

      <div className="sm:hidden">
        <div
          className="flex gap-2 overflow-x-auto overscroll-x-contain pb-1"
          role="tablist"
          aria-label="Skins round"
        >
          {roundOptions.map((option) => {
            const isActive = option.id === activeRoundId;
            return (
              <button
                key={option.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setSelectedRoundId(option.id)}
                className={`shrink-0 rounded-full border px-3 py-2 text-left transition ${
                  isActive
                    ? "border-emerald-700 bg-emerald-700 text-white"
                    : "border-stone-300 bg-white text-stone-800"
                }`}
              >
                <span className="block text-xs font-bold leading-tight">
                  {option.label.split(" · ")[0]}
                </span>
                <span
                  className={`mt-0.5 block text-[10px] leading-tight ${
                    isActive ? "text-emerald-100" : "text-stone-500"
                  }`}
                >
                  {option.dateLabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-sm text-stone-600">
        The one and only skins game!  Lowest score wins the skin. A ${SKINS_POT_DOLLARS} pot is split by skins won
        (whole dollars). Randomly spread out extra dollars to make the pot equal to the pot dollars.
      </p>

      {!activeOption?.scorecard ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          No scorecard posted for this round yet.
        </p>
      ) : skinsResult === "incomplete" ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          All four players need 18 hole scores on the scorecard to calculate skins.
        </p>
      ) : skinsResult === "no-course" ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Link this round to a course with handicap ranks (1–18) in the course library so net
          strokes can be calculated.
        </p>
      ) : skinsResult ? (
        <>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-800">
              Round totals · {skinsResult.totalSkins} skin
              {skinsResult.totalSkins === 1 ? "" : "s"}
            </p>
            <ul className="mt-3 space-y-2">
              {skinsResult.playerResults.map((entry) => (
                <li
                  key={entry.player}
                  className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2.5 text-sm"
                >
                  <span className="font-semibold text-stone-900">
                    {displayPlayerName(entry.player)}
                  </span>
                  <span className="tabular-nums text-stone-700">
                    {entry.skins} skin{entry.skins === 1 ? "" : "s"} ·{" "}
                    <span className="font-bold text-emerald-800">
                      {formatSkinsPayout(entry.payoutDollars)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-stone-600">
              Pot: {formatSkinsPayout(skinsResult.potDollars)} (
              {skinsResult.playerResults
                .map((entry) => formatSkinsPayout(entry.payoutDollars))
                .join(" + ")}{" "}
              = {formatSkinsPayout(
                skinsResult.playerResults.reduce((sum, entry) => sum + entry.payoutDollars, 0),
              )}
              )
            </p>
            <button
              type="button"
              onClick={reshufflePayout}
              className="mt-3 text-xs font-semibold text-emerald-800 underline-offset-2 hover:underline"
            >
              Re-roll dollar rounding
            </button>
          </div>

          <details className="rounded-xl border border-stone-200 bg-white">
            <summary className="cursor-pointer list-none px-3 py-2.5 text-sm font-semibold text-stone-800 marker:content-none [&::-webkit-details-marker]:hidden">
              Hole-by-hole skins
            </summary>
            <div className="max-h-64 overflow-y-auto border-t border-stone-100">
              <table className="min-w-full text-xs">
                <thead className="sticky top-0 bg-stone-50 text-left text-[10px] uppercase tracking-[0.1em] text-stone-500">
                  <tr>
                    <th className="px-2 py-1.5">Hole</th>
                    <th className="px-2 py-1.5">Skin</th>
                    <th className="px-2 py-1.5">Net (gross−strokes)</th>
                  </tr>
                </thead>
                <tbody>
                  {skinsResult.holes.map((hole) => (
                    <tr key={hole.hole} className="border-t border-stone-100">
                      <td className="px-2 py-1.5 font-semibold text-stone-900">{hole.hole}</td>
                      <td className="px-2 py-1.5 text-stone-800">
                        {hole.winner ? displayPlayerName(hole.winner) : hole.tied ? "Tie" : "—"}
                      </td>
                      <td className="px-2 py-1.5 text-stone-600">
                        {hole.scores.map((entry) => formatSkinsHoleScore(entry)).join(" · ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      ) : null}
    </div>
  );
}
