"use client";

import { useMemo } from "react";
import {
  buildHoleStrokePlan,
  lookupPlayerHandicap,
  lowestHandicapInGroup,
  relativePlayingHandicap,
  resolveRosterPlayerName,
  strokeAllocationForPlayer,
  type CourseLayout,
  type GolfCourseLayout,
} from "@/lib/golf-course";
import {
  findUpNext,
  formatScheduleDate,
  isRoundScored,
  resolveScorecardRoundFromSchedule,
  type ScheduleItemLike,
} from "@/lib/schedule-utils";
import { TRIP_PLAYERS } from "@/lib/trip-roster";

type SavedScorecardLike = {
  date: string;
  course: string;
};

type NextRoundStrokePreviewProps = {
  schedule: ScheduleItemLike[];
  scorecards: SavedScorecardLike[];
  golfCourses: GolfCourseLayout[];
  handicapsByPlayer: Record<string, number>;
  currentUser: { name: string; username: string };
  groupPlayers?: string[];
};

function HoleGrid({
  label,
  holes,
  allocation,
  highlight,
}: {
  label: string;
  holes: { par: number; strokeIndex: number }[];
  allocation: number[];
  highlight?: boolean;
}) {
  const front = holes.slice(0, 9);
  const back = holes.slice(9, 18);
  const frontStrokes = allocation.slice(0, 9);
  const backStrokes = allocation.slice(9, 18);

  function renderNine(
    slice: { par: number; strokeIndex: number }[],
    strokes: number[],
    startHole: number,
  ) {
    return (
      <ol className="mt-1 grid grid-cols-9 gap-1 text-center text-xs">
        {slice.map((hole, index) => {
          const strokeCount = strokes[index] ?? 0;
          const receives = strokeCount > 0;
          return (
            <li
              key={startHole + index}
              className={`rounded py-1 ${
                receives
                  ? highlight
                    ? "bg-emerald-100 ring-1 ring-emerald-500"
                    : "bg-amber-50 ring-1 ring-amber-300"
                  : "bg-stone-50"
              }`}
            >
              <span className="block text-[10px] text-stone-500">H{startHole + index}</span>
              <span className="block text-[10px] text-stone-400">P{hole.par || "—"}</span>
              {receives ? (
                <span className="mt-0.5 block text-sm font-bold text-emerald-800">
                  {strokeCount > 1 ? `+${strokeCount}` : "●"}
                </span>
              ) : (
                <span className="mt-0.5 block text-sm text-stone-300">—</span>
              )}
            </li>
          );
        })}
      </ol>
    );
  }

  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500">
        {label}
      </p>
      {renderNine(front, frontStrokes, 1)}
      <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500">
        Back 9
      </p>
      {renderNine(back, backStrokes, 10)}
    </div>
  );
}

export function NextRoundStrokePreview({
  schedule,
  scorecards,
  golfCourses,
  handicapsByPlayer,
  currentUser,
  groupPlayers = TRIP_PLAYERS,
}: NextRoundStrokePreviewProps) {
  const preview = useMemo(() => {
    const nextRound = findUpNext(schedule, scorecards);
    if (!nextRound || nextRound.kind !== "round") {
      return null;
    }
    if (isRoundScored(nextRound.date, nextRound.course, scorecards)) {
      return null;
    }

    const resolved = resolveScorecardRoundFromSchedule(nextRound, golfCourses);
    if (!resolved?.courseId) {
      return { round: nextRound, course: null as null, layout: null as null };
    }

    const course =
      golfCourses.find((entry) => entry.id === resolved.courseId) ?? null;
    const layout: CourseLayout | null = course
      ? { holePars: course.holePars, strokeIndexes: course.strokeIndexes }
      : null;

    return { round: nextRound, course, layout };
  }, [schedule, scorecards, golfCourses]);

  if (!preview) {
    return null;
  }

  const { round, course, layout } = preview;
  const rosterPlayer = resolveRosterPlayerName(currentUser, groupPlayers);
  const lowestHcp = lowestHandicapInGroup(groupPlayers, handicapsByPlayer);
  const holeStrokePlan =
    layout && layout.strokeIndexes.some((index) => index > 0)
      ? buildHoleStrokePlan(layout, groupPlayers, handicapsByPlayer)
      : [];

  const personalAllocation =
    rosterPlayer && layout
      ? strokeAllocationForPlayer(
          rosterPlayer,
          groupPlayers,
          handicapsByPlayer,
          layout,
        )
      : null;

  const personalStrokeCount = personalAllocation
    ? personalAllocation.reduce((sum, count) => sum + count, 0)
    : 0;

  return (
    <section className="rounded-xl border border-sky-200 bg-sky-50/80 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-800">
        Upcoming round
      </p>
      <h3 className="mt-1 text-base font-bold text-stone-900">
        {round.title} · {round.course}
      </h3>
      <p className="text-sm text-stone-600">{formatScheduleDate(round.date)}</p>

      {!course || !layout ? (
        <p className="mt-3 text-sm text-amber-900">
          Course template not linked yet. An admin needs to pick this course in the schedule
          library before stroke holes can be shown.
        </p>
      ) : holeStrokePlan.length === 0 ? (
        <p className="mt-3 text-sm text-amber-900">
          This course is missing handicap ranks (1–18). Ask an admin to finish the course setup.
        </p>
      ) : (
        <>
          <p className="mt-3 text-xs text-stone-600">
            Lowest handicap in the group is{" "}
            <span className="font-semibold text-stone-900">{lowestHcp}</span> (scratch). Strokes
            apply on the hardest holes (rank 1 = hardest).
          </p>

          {rosterPlayer && personalAllocation ? (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-white p-3">
              <p className="text-sm font-semibold text-stone-900">
                Your strokes — {rosterPlayer}
              </p>
              <p className="mt-0.5 text-xs text-stone-600">
                {lookupPlayerHandicap(rosterPlayer, handicapsByPlayer)} handicap ·{" "}
                {relativePlayingHandicap(rosterPlayer, groupPlayers, handicapsByPlayer) > 0
                  ? `${personalStrokeCount} stroke${personalStrokeCount === 1 ? "" : "s"} this round`
                  : "playing scratch (lowest in group)"}
              </p>
              <div className="mt-3">
                <HoleGrid
                  label="Front 9 — ● = stroke hole"
                  holes={holeStrokePlan.map((hole) => ({
                    par: hole.par,
                    strokeIndex: hole.strokeIndex,
                  }))}
                  allocation={personalAllocation}
                  highlight
                />
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-stone-600">
              Sign in with your trip player name to see your personal stroke holes highlighted.
            </p>
          )}

          <details className="mt-4 rounded-lg border border-stone-200 bg-white">
            <summary className="cursor-pointer list-none px-3 py-2.5 text-sm font-semibold text-stone-800 marker:content-none [&::-webkit-details-marker]:hidden">
              Full group — strokes by hole
            </summary>
            <div className="max-h-56 overflow-y-auto border-t border-stone-100 px-1 pb-2">
              <table className="min-w-full text-xs">
                <thead className="sticky top-0 bg-stone-50 text-left text-[10px] uppercase tracking-[0.1em] text-stone-500">
                  <tr>
                    <th className="px-2 py-1.5">Hole</th>
                    <th className="px-2 py-1.5">Par</th>
                    <th className="px-2 py-1.5">Rank</th>
                    <th className="px-2 py-1.5">Stroke</th>
                  </tr>
                </thead>
                <tbody>
                  {holeStrokePlan.map((hole) => (
                    <tr key={hole.holeIndex} className="border-t border-stone-100">
                      <td className="px-2 py-1.5 font-semibold text-stone-900">
                        {hole.holeIndex + 1}
                      </td>
                      <td className="px-2 py-1.5 tabular-nums text-stone-700">
                        {hole.par || "—"}
                      </td>
                      <td className="px-2 py-1.5 tabular-nums text-stone-500">
                        {hole.strokeIndex || "—"}
                      </td>
                      <td className="px-2 py-1.5 text-stone-800">
                        {hole.receivers.length > 0 ? hole.receivers.join(", ") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="border-t border-stone-100 px-3 py-2 text-xs text-stone-600">
              {groupPlayers.map((name) => {
                const hcp = lookupPlayerHandicap(name, handicapsByPlayer);
                const relative = Math.max(0, Math.round(hcp - lowestHcp));
                const isYou =
                  rosterPlayer?.toLowerCase() === name.toLowerCase();
                return (
                  <li key={name} className={isYou ? "font-semibold text-emerald-900" : ""}>
                    {name} · {hcp} hcp
                    {relative > 0
                      ? ` · ${relative} stroke${relative === 1 ? "" : "s"}`
                      : " · scratch"}
                  </li>
                );
              })}
            </ul>
          </details>
        </>
      )}
    </section>
  );
}
