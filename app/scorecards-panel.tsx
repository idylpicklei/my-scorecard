"use client";

import { useMemo } from "react";
import { NextRoundStrokePreview } from "@/app/next-round-stroke-preview";
import type { GolfCourseLayout } from "@/lib/golf-course";
import type { ScheduleItemLike } from "@/lib/schedule-utils";

export type ScorecardPlayer = {
  playerName: string;
  holes: number[];
};

export type SavedScorecard = {
  id: string;
  course: string;
  courseId?: string;
  date: string;
  players: ScorecardPlayer[];
  createdAt: string;
};

function holeTotal(holes: number[]) {
  return holes.reduce((sum, score) => sum + score, 0);
}

function formatDate(date: string) {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type ScorecardsPanelProps = {
  scorecards: SavedScorecard[];
  schedule: ScheduleItemLike[];
  golfCourses: GolfCourseLayout[];
  handicapsByPlayer: Record<string, number>;
  currentUser: { name: string; username: string };
};

export function ScorecardsPanel({
  scorecards,
  schedule,
  golfCourses,
  handicapsByPlayer,
  currentUser,
}: ScorecardsPanelProps) {
  const byCourse = useMemo(() => {
    const map = new Map<string, SavedScorecard[]>();

    for (const scorecard of scorecards) {
      const existing = map.get(scorecard.course);
      if (existing) {
        existing.push(scorecard);
      } else {
        map.set(scorecard.course, [scorecard]);
      }
    }

    return [...map.entries()]
      .sort(([courseA], [courseB]) => courseA.localeCompare(courseB))
      .map(([course, rounds]) => ({
        course,
        rounds: [...rounds].sort((a, b) => {
          const byDate = b.date.localeCompare(a.date);
          if (byDate !== 0) {
            return byDate;
          }
          return b.createdAt.localeCompare(a.createdAt);
        }),
      }));
  }, [scorecards]);

  return (
    <div className="mt-4 space-y-6">
      <NextRoundStrokePreview
        schedule={schedule}
        scorecards={scorecards}
        golfCourses={golfCourses}
        handicapsByPlayer={handicapsByPlayer}
        currentUser={currentUser}
      />

      {scorecards.length === 0 ? (
        <p className="text-sm text-stone-600">
          No completed scorecards yet. After the round, hole-by-hole scores will appear below.
        </p>
      ) : (
    <div className="space-y-2">
      {byCourse.map(({ course, rounds }) => (
        <details
          key={course}
          className="group border-b border-stone-200 py-1 last:border-b-0 sm:rounded-xl sm:border sm:border-stone-200 sm:bg-stone-50 sm:py-0"
        >
          <summary className="cursor-pointer list-none py-3 pr-8 text-sm font-bold text-stone-900 marker:content-none sm:px-4 [&::-webkit-details-marker]:hidden">
            <span className="flex items-center justify-between gap-3">
              <span>{course}</span>
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
                {rounds.length} round{rounds.length === 1 ? "" : "s"}
              </span>
            </span>
          </summary>

          <div className="space-y-4 border-t border-stone-200 pb-4 pt-2 sm:px-4">
            {rounds.map((scorecard) => (
              <div key={scorecard.id} className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-800">
                  {formatDate(scorecard.date)}
                </p>

                {scorecard.players.map((player) => {
                  const total = holeTotal(player.holes);
                  const front9 = player.holes.slice(0, 9);
                  const back9 = player.holes.slice(9, 18);

                  return (
                    <details
                      key={`${scorecard.id}-${player.playerName}`}
                      className="rounded-lg border border-stone-200 bg-white"
                    >
                      <summary className="cursor-pointer list-none px-3 py-2.5 text-sm marker:content-none [&::-webkit-details-marker]:hidden">
                        <span className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-stone-900">{player.playerName}</span>
                          <span className="text-xs text-stone-500">
                            {total > 0 ? `Total ${total}` : "No scores"}
                          </span>
                        </span>
                      </summary>

                      {total > 0 ? (
                        <div className="border-t border-stone-100 px-3 pb-3 pt-2">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500">
                            Front 9
                          </p>
                          <ol className="mt-1 grid grid-cols-9 gap-1 text-center text-xs">
                            {front9.map((score, index) => (
                              <li key={index} className="rounded bg-stone-50 py-1">
                                <span className="block text-[10px] text-stone-500">H{index + 1}</span>
                                <span className="font-semibold text-stone-900">{score || "—"}</span>
                              </li>
                            ))}
                          </ol>
                          <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500">
                            Back 9
                          </p>
                          <ol className="mt-1 grid grid-cols-9 gap-1 text-center text-xs">
                            {back9.map((score, index) => (
                              <li key={index} className="rounded bg-stone-50 py-1">
                                <span className="block text-[10px] text-stone-500">H{index + 10}</span>
                                <span className="font-semibold text-stone-900">{score || "—"}</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      ) : (
                        <p className="border-t border-stone-100 px-3 py-2 text-xs text-stone-500">
                          No hole scores recorded.
                        </p>
                      )}
                    </details>
                  );
                })}
              </div>
            ))}
          </div>
        </details>
      ))}
    </div>
      )}
    </div>
  );
}
