"use client";

import { useMemo, useState } from "react";
import { buildCumulativeTripOverview, buildTripOverview } from "@/lib/scoring";
import { scorecardToRows, type SavedScorecardLike } from "@/lib/scorecard-rows";
import { NextRoundStrokePreview } from "@/app/next-round-stroke-preview";
import type { GolfCourseLayout } from "@/lib/golf-course";
import { formatScheduleDate, type ScheduleItemLike } from "@/lib/schedule-utils";

type Team = {
  id: string;
  name: string;
  players: string[];
};

type ScoreboardPanelProps = {
  schedule: ScheduleItemLike[];
  scorecards: SavedScorecardLike[];
  teams: Team[];
  golfCourses: GolfCourseLayout[];
  handicapsByPlayer: Record<string, number>;
  currentUser: { name: string; username: string };
};

const ALL_ROUNDS_ID = "all-rounds";

type RoundOption = {
  id: string;
  label: string;
  dateLabel: string;
  hasScores: boolean;
};

export function ScoreboardPanel({
  schedule,
  scorecards,
  teams,
  golfCourses,
  handicapsByPlayer,
  currentUser,
}: ScoreboardPanelProps) {
  const roundOptions = useMemo(() => {
    const options: RoundOption[] = schedule
      .filter((item) => item.kind === "round")
      .sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title))
      .map((item) => {
        const scorecard = scorecards.find(
          (entry) =>
            entry.date === item.date &&
            entry.course.trim().toLowerCase() === item.course.trim().toLowerCase(),
        );
        return {
          id: scorecard?.id ?? `schedule-${item.id}`,
          label: `${item.title} · ${item.course}`,
          dateLabel: formatScheduleDate(item.date),
          hasScores: Boolean(scorecard),
        };
      });

    if (scorecards.length > 1) {
      options.unshift({
        id: ALL_ROUNDS_ID,
        label: "All rounds (weekend total)",
        dateLabel: `${scorecards.length} rounds`,
        hasScores: true,
      });
    }

    return options;
  }, [schedule, scorecards]);

  const defaultRoundId =
    roundOptions.find((option) => option.hasScores && option.id !== ALL_ROUNDS_ID)?.id ??
    roundOptions[0]?.id ??
    "";

  const [selectedRoundId, setSelectedRoundId] = useState(defaultRoundId);

  const activeRoundId = roundOptions.some((option) => option.id === selectedRoundId)
    ? selectedRoundId
    : defaultRoundId;

  const overview = useMemo(() => {
    if (activeRoundId === ALL_ROUNDS_ID) {
      return buildCumulativeTripOverview({
        scorecards,
        handicapsByPlayer,
        teams,
        currentUser,
      });
    }

    const scorecard = scorecards.find((entry) => entry.id === activeRoundId);
    const scoreRows = scorecard ? scorecardToRows(scorecard) : [];

    return buildTripOverview({
      scoreRows,
      handicapsByPlayer,
      teams,
      currentUser,
    });
  }, [activeRoundId, scorecards, handicapsByPlayer, teams, currentUser]);

  const selectedOption = roundOptions.find((option) => option.id === activeRoundId);
  const hasScores = overview.playerStandings.some((entry) => entry.hasScores);

  if (roundOptions.length === 0) {
    return (
      <div className="mt-4 space-y-4">
        <NextRoundStrokePreview
          schedule={schedule}
          scorecards={scorecards}
          golfCourses={golfCourses}
          handicapsByPlayer={handicapsByPlayer}
          currentUser={currentUser}
        />
        <p className="text-sm text-stone-600">
          Add golf rounds to the schedule to see scoreboard totals here.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      <NextRoundStrokePreview
        schedule={schedule}
        scorecards={scorecards}
        golfCourses={golfCourses}
        handicapsByPlayer={handicapsByPlayer}
        currentUser={currentUser}
      />

      <div>
        <label
          htmlFor="scoreboard-round"
          className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-600"
        >
          Round
        </label>
        <select
          id="scoreboard-round"
          value={activeRoundId}
          onChange={(event) => setSelectedRoundId(event.target.value)}
          className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm font-semibold text-stone-900 outline-none focus:border-emerald-700"
        >
          {roundOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label} — {option.dateLabel}
              {option.hasScores ? "" : " (no scores yet)"}
            </option>
          ))}
        </select>
      </div>

      {!hasScores ? (
        <p className="text-sm text-stone-600">
          No scores posted for this round yet.
          {selectedOption && !selectedOption.hasScores ? " Check back after the scorecard is uploaded." : null}
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-[0.12em] text-stone-500">
                  <th className="py-2 pr-3">Player</th>
                  <th className="py-2 px-3 text-right">Gross</th>
                  <th className="py-2 pl-3 text-right">Net</th>
                </tr>
              </thead>
              <tbody>
                {overview.playerStandings.map((row, index) => {
                  const isCurrentUser =
                    row.player.toLowerCase() === currentUser.name.toLowerCase() ||
                    row.player.toLowerCase() === currentUser.username.toLowerCase();
                  const showLeader =
                    row.hasScores && index === 0 && hasScores;

                  return (
                    <tr
                      key={row.player}
                      className={`border-b border-stone-100 ${
                        isCurrentUser ? "bg-emerald-50/80" : ""
                      }`}
                    >
                      <td className="py-3 pr-3 font-semibold text-stone-900">
                        {showLeader ? "★ " : ""}
                        {row.player}
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums text-stone-800">
                        {row.hasScores ? row.grossTotal : "—"}
                      </td>
                      <td className="py-3 pl-3 text-right tabular-nums font-semibold text-emerald-800">
                        {row.hasScores ? row.netTotal : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="border-t border-stone-200 pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-600">
              Team totals
            </h3>
            <ul className="mt-2 divide-y divide-stone-200">
              {overview.teamStandings.map((team, index) => (
                <li
                  key={team.id}
                  className="flex items-center justify-between gap-3 py-2.5 first:pt-0"
                >
                  <div>
                    <p className="text-sm font-bold text-stone-900">{team.name}</p>
                    {team.hasScores && index === 0 ? (
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
                        Leading
                      </p>
                    ) : null}
                  </div>
                  <div className="text-right text-sm tabular-nums">
                    <p className="text-stone-700">
                      {team.hasScores ? `${team.grossTotal} gross` : "—"}
                    </p>
                    <p className="font-semibold text-emerald-800">
                      {team.hasScores ? `${team.netTotal} net` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
