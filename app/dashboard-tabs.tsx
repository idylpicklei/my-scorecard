"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { DashboardOverview } from "@/app/dashboard-overview";
import { TRIP_PLAYERS } from "@/lib/trip-roster";

type DashboardTab =
  | "overview"
  | "scoreboard"
  | "upload"
  | "schedule"
  | "games"
  | "weekends";

type UserRole = "admin" | "member";

type TabConfig = {
  id: DashboardTab;
  label: string;
};

const TABS: TabConfig[] = [
  { id: "overview", label: "Overview" },
  { id: "scoreboard", label: "Score Board" },
  { id: "upload", label: "Upload Scorecard" },
  { id: "schedule", label: "Schedule" },
  { id: "games", label: "Games" },
  { id: "weekends", label: "Weekends" },
];

type ScoreRow = {
  player: string;
  front9: number;
  back9: number;
};


type Team = {
  id: string;
  name: string;
  players: string[];
};

type ScheduleItem = {
  id: string;
  kind: "round" | "dinner";
  title: string;
  course: string;
  date: string;
  notes?: string;
  createdAt: string;
};

type ScorecardPlayer = {
  playerName: string;
  holes: number[];
};

type SavedScorecard = {
  id: string;
  course: string;
  date: string;
  players: ScorecardPlayer[];
  createdAt: string;
};

function emptyScoreRows(): ScoreRow[] {
  return TRIP_PLAYERS.map((player) => ({
    player,
    front9: 0,
    back9: 0,
  }));
}

function scorecardToRows(scorecard: SavedScorecard): ScoreRow[] {
  const rowByPlayer = new Map<string, ScoreRow>();

  for (const entry of scorecard.players) {
    const front9 = entry.holes.slice(0, 9).reduce((sum, score) => sum + score, 0);
    const back9 = entry.holes.slice(9, 18).reduce((sum, score) => sum + score, 0);
    rowByPlayer.set(entry.playerName.trim().toLowerCase(), {
      player: entry.playerName.trim(),
      front9,
      back9,
    });
  }

  return TRIP_PLAYERS.map((player) => {
    const match = rowByPlayer.get(player.toLowerCase());
    if (!match) {
      return { player, front9: 0, back9: 0 };
    }
    return { player, front9: match.front9, back9: match.back9 };
  });
}

function defaultScorecardPlayers() {
  return TRIP_PLAYERS.map((playerName) => ({
    playerName,
    holes: Array(18).fill(0),
  }));
}

const GAMES = [
  {
    name: "Skins",
    details: "$5 per hole, ties carry over to next hole",
    status: "Active",
  },
  {
    name: "Nassau",
    details: "Front 9, Back 9, and Overall bets",
    status: "Queued",
  },
  {
    name: "Closest to Pin",
    details: "Par 3 side game for all players",
    status: "Completed",
  },
];

type WeekendSummary = {
  id: string;
  title: string;
  startDate: string;
  endDate: string | null;
  status: "active" | "completed";
  roundsScheduled: number;
  roundsCompleted: number;
  roundsLeft: number;
  createdAt: string;
};

type DashboardResponse = {
  user: { name: string; username: string; handicap: number };
  teams: Team[];
  schedule: ScheduleItem[];
  handicapsByPlayer: Record<string, number>;
  activeWeekend: WeekendSummary | null;
  pastWeekends: WeekendSummary[];
};

type DashboardTabsProps = {
  userRole: UserRole;
  currentUser: { name: string; username: string; handicap: number };
};

export function DashboardTabs({ userRole, currentUser }: DashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const [handicapsByPlayer, setHandicapsByPlayer] = useState<Record<string, number>>({});
  const [teams, setTeamsState] = useState<Team[]>([]);
  const [teamDraft, setTeamDraft] = useState<Team[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSavingTeams, setIsSavingTeams] = useState(false);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [isSavingScorecard, setIsSavingScorecard] = useState(false);
  const [scoreRows, setScoreRows] = useState<ScoreRow[]>(emptyScoreRows);
  const [scoreCardPlayers, setScorecardPlayers] = useState(defaultScorecardPlayers);
  const [scorecardForm, setScorecardForm] = useState({
    course: "",
    date: "",
  });
  const [scheduleForm, setScheduleForm] = useState({
    kind: "round" as "round" | "dinner",
    title: "",
    course: "",
    date: "",
    notes: "",
  });
  const [activeWeekend, setActiveWeekend] = useState<WeekendSummary | null>(null);
  const [pastWeekends, setPastWeekends] = useState<WeekendSummary[]>([]);
  const [isStartingWeekend, setIsStartingWeekend] = useState(false);
  const [isEndingWeekend, setIsEndingWeekend] = useState(false);
  const [weekendForm, setWeekendForm] = useState({
    title: "",
    startDate: "",
    endDate: "",
  });
  const [endWeekendDate, setEndWeekendDate] = useState("");

  async function loadDashboard() {
    setIsLoading(true);
    setError(null);

    const response = await fetch("/api/dashboard", { cache: "no-store" });
    if (!response.ok) {
      setError("Unable to load weekend dashboard data.");
      setIsLoading(false);
      return;
    }

    const payload = (await response.json()) as DashboardResponse;
    setTeamsState(payload.teams);
    setTeamDraft(payload.teams);
    setSchedule(payload.schedule);
    setHandicapsByPlayer(payload.handicapsByPlayer);
    setActiveWeekend(payload.activeWeekend);
    setPastWeekends(payload.pastWeekends ?? []);

    const scorecardsResponse = await fetch("/api/scorecards", { cache: "no-store" });
    if (scorecardsResponse.ok) {
      const scorecardsPayload = (await scorecardsResponse.json()) as {
        scorecards: SavedScorecard[];
      };
      const latest = scorecardsPayload.scorecards[0];
      if (latest) {
        setScoreRows(scorecardToRows(latest));
      }
    }

    setIsLoading(false);
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  const leaderboard = useMemo(() => {
    return [...scoreRows]
      .map((entry) => ({
        ...entry,
        total: entry.front9 + entry.back9,
        hasScores: entry.front9 > 0 || entry.back9 > 0,
      }))
      .sort((a, b) => {
        if (a.hasScores && !b.hasScores) return -1;
        if (!a.hasScores && b.hasScores) return 1;
        if (!a.hasScores && !b.hasScores) {
          return TRIP_PLAYERS.indexOf(a.player as (typeof TRIP_PLAYERS)[number])
            - TRIP_PLAYERS.indexOf(b.player as (typeof TRIP_PLAYERS)[number]);
        }
        return a.total - b.total;
      });
  }, [scoreRows]);

  const teamScores = useMemo(() => {
    const scoreByPlayer = new Map(
      leaderboard.map((entry) => [entry.player, entry.total]),
    );

    return teams.map((team) => {
      const total = team.players.reduce((sum, player) => {
        return sum + (scoreByPlayer.get(player) ?? 0);
      }, 0);

      return {
        ...team,
        total,
      };
    });
  }, [leaderboard, teams]);

  async function handleTeamSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingTeams(true);
    setError(null);

    const response = await fetch("/api/admin/teams", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ teams: teamDraft }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setError(payload?.error ?? "Unable to save team assignments.");
      setIsSavingTeams(false);
      return;
    }

    const payload = (await response.json()) as { teams: Team[] };
    setTeamsState(payload.teams);
    setTeamDraft(payload.teams);
    setIsSavingTeams(false);
  }

  async function handleScheduleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingSchedule(true);
    setError(null);

    const response = await fetch("/api/admin/schedule", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(scheduleForm),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setError(payload?.error ?? "Unable to add schedule item.");
      setIsSavingSchedule(false);
      return;
    }

    const payload = (await response.json()) as { entry: ScheduleItem };
    setSchedule((previous) => {
      const merged = [...previous, payload.entry];
      return merged.sort((a, b) => {
        const byDate = a.date.localeCompare(b.date);
        if (byDate !== 0) {
          return byDate;
        }
        return a.createdAt.localeCompare(b.createdAt);
      });
    });
    setScheduleForm({
      kind: "round",
      title: "",
      course: "",
      date: "",
      notes: "",
    });
    setIsSavingSchedule(false);
  }

  async function handleScorecardSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingScorecard(true);
    setError(null);

    const response = await fetch("/api/scorecards", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        course: scorecardForm.course,
        date: scorecardForm.date,
        players: scoreCardPlayers.filter((p) => p.playerName.trim().length > 0),
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setError(payload?.error ?? "Unable to save scorecard.");
      setIsSavingScorecard(false);
      return;
    }

    const payload = (await response.json()) as { scorecard: SavedScorecard };
    setScoreRows(scorecardToRows(payload.scorecard));

    setScorecardForm({ course: "", date: "" });
    setScorecardPlayers(defaultScorecardPlayers());
    setIsSavingScorecard(false);
    await loadDashboard();
  }

  async function handleEndWeekend() {
    if (!activeWeekend) {
      return;
    }

    const confirmed = window.confirm(
      `End "${activeWeekend.title}"? Scores stay saved; you can start a new weekend when ready.`,
    );
    if (!confirmed) {
      return;
    }

    setIsEndingWeekend(true);
    setError(null);

    const response = await fetch("/api/admin/weekends", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endDate: endWeekendDate || undefined,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? "Unable to end the weekend.");
      setIsEndingWeekend(false);
      return;
    }

    setEndWeekendDate("");
    setScoreRows(emptyScoreRows());
    await loadDashboard();
    setActiveTab("weekends");
    setIsEndingWeekend(false);
  }

  async function handleStartWeekend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsStartingWeekend(true);
    setError(null);

    const response = await fetch("/api/admin/weekends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(weekendForm),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? "Unable to start a new weekend.");
      setIsStartingWeekend(false);
      return;
    }

    setWeekendForm({ title: "", startDate: "", endDate: "" });
    setScoreRows(emptyScoreRows());
    await loadDashboard();
    setActiveTab("schedule");
    setIsStartingWeekend(false);
  }

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-6 text-sm text-stone-600">
        Loading weekend dashboard...
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4 sm:p-6">
      {error ? (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {activeWeekend ? (
        <div className="mb-4 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-white px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-800">
            Active weekend
          </p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-stone-900">{activeWeekend.title}</h2>
              <p className="mt-1 text-sm text-stone-600">
                {activeWeekend.startDate}
                {activeWeekend.endDate ? ` – ${activeWeekend.endDate}` : ""}
              </p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-white px-5 py-3 text-center sm:min-w-[140px]">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                Rounds left
              </p>
              <p className="text-3xl font-black text-emerald-800">{activeWeekend.roundsLeft}</p>
              <p className="text-xs text-stone-500">
                {activeWeekend.roundsCompleted} / {activeWeekend.roundsScheduled} played
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-sm font-semibold text-amber-900">No active weekend</p>
          <p className="mt-1 text-sm text-amber-800">
            {userRole === "admin"
              ? "Use the Weekends tab to end the current trip or start the next one."
              : "Ask an admin to start the next golf weekend."}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-xl border px-4 py-3 text-sm font-semibold uppercase tracking-[0.15em] transition ${
                isActive
                  ? "border-emerald-700 bg-emerald-700 text-white"
                  : "border-stone-300 bg-white text-stone-700 hover:border-emerald-700 hover:text-emerald-800"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
        {activeTab === "overview" ? (
          <DashboardOverview
            currentUser={currentUser}
            teams={teams}
            scoreRows={scoreRows}
            handicapsByPlayer={handicapsByPlayer}
            activeWeekend={activeWeekend}
          />
        ) : null}

        {activeTab === "scoreboard" ? (
          <section>
            <h2 className="text-lg font-bold text-stone-900">Score Board</h2>
            <p className="mt-1 text-sm text-stone-600">
              Current round leaderboard for your foursome.
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-2 text-sm">
                <thead>
                  <tr className="text-left text-stone-500">
                    <th className="px-3 py-2">Player</th>
                    <th className="px-3 py-2">Front 9</th>
                    <th className="px-3 py-2">Back 9</th>
                    <th className="px-3 py-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((row, index) => {
                    const showLeader =
                      row.hasScores && index === 0 && leaderboard.some((entry) => entry.hasScores);

                    return (
                      <tr key={row.player} className="rounded-xl bg-stone-50 text-stone-800">
                        <td className="px-3 py-3 font-semibold">
                          {showLeader ? "Leader - " : ""}
                          {row.player}
                        </td>
                        <td className="px-3 py-3">{row.hasScores ? row.front9 : "—"}</td>
                        <td className="px-3 py-3">{row.hasScores ? row.back9 : "—"}</td>
                        <td className="px-3 py-3 font-bold">{row.hasScores ? row.total : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-6 rounded-xl border border-stone-200 bg-stone-50 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-700">
                Teams
              </h3>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {teamScores.map((team) => (
                  <article
                    key={team.name}
                    className="rounded-xl border border-stone-200 bg-white p-4"
                  >
                    <p className="text-sm font-bold text-stone-900">{team.name}</p>
                    <p className="mt-1 text-sm text-stone-600">
                      Players: {team.players.join(", ")}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-emerald-800">
                      Team Total: {team.total}
                    </p>
                  </article>
                ))}
              </div>

              {userRole === "admin" ? (
                <form className="mt-5 space-y-4" onSubmit={handleTeamSave}>
                  <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-600">
                    Admin team editor
                  </h4>
                  {teamDraft.map((team, index) => (
                    <div key={team.id} className="rounded-xl border border-stone-200 bg-white p-3">
                      <label className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-600">
                        {team.name}
                      </label>
                      <input
                        type="text"
                        value={team.players.join(", ")}
                        onChange={(event) => {
                          const next = [...teamDraft];
                          next[index] = {
                            ...next[index],
                            players: event.target.value
                              .split(",")
                              .map((value) => value.trim())
                              .filter(Boolean),
                          };
                          setTeamDraft(next);
                        }}
                        placeholder="Player 1, Player 2"
                        className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 outline-none transition focus:border-emerald-700"
                      />
                    </div>
                  ))}

                  <button
                    type="submit"
                    disabled={isSavingTeams}
                    className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSavingTeams ? "Saving teams..." : "Save Teams"}
                  </button>
                </form>
              ) : null}
            </div>
          </section>
        ) : null}

        {activeTab === "schedule" ? (
          <section>
            <h2 className="text-lg font-bold text-stone-900">Weekend schedule</h2>
            <p className="mt-1 text-sm text-stone-600">
              Add golf rounds and dinner plans. Only golf rounds count toward &quot;rounds left&quot;
              on the dashboard.
            </p>

            <div className="mt-4 space-y-3">
              {schedule.map((item) => (
                <article
                  key={item.id}
                  className={`rounded-xl border p-4 ${
                    item.kind === "dinner"
                      ? "border-amber-200 bg-amber-50/80"
                      : "border-stone-200 bg-stone-50"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                        item.kind === "dinner"
                          ? "bg-amber-200 text-amber-900"
                          : "bg-emerald-200 text-emerald-900"
                      }`}
                    >
                      {item.kind === "dinner" ? "Dinner" : "Golf round"}
                    </span>
                    <p className="text-sm font-bold text-stone-900">{item.title}</p>
                  </div>
                  <p className="mt-1 text-sm text-stone-700">
                    {item.kind === "dinner"
                      ? item.course === "—"
                        ? "Venue TBD"
                        : item.course
                      : item.course}
                  </p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-800">
                    {item.date}
                  </p>
                  {item.notes ? (
                    <p className="mt-2 text-sm text-stone-600">{item.notes}</p>
                  ) : null}
                </article>
              ))}
            </div>

            {userRole === "admin" ? (
              <form className="mt-6 space-y-3 rounded-xl border border-stone-200 bg-white p-4" onSubmit={handleScheduleCreate}>
                <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-600">
                  Admin: Add to schedule
                </h4>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-stone-600">
                    Type
                  </label>
                  <select
                    value={scheduleForm.kind}
                    onChange={(event) =>
                      setScheduleForm((previous) => ({
                        ...previous,
                        kind: event.target.value as "round" | "dinner",
                      }))
                    }
                    className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 outline-none transition focus:border-emerald-700"
                  >
                    <option value="round">Golf round</option>
                    <option value="dinner">Dinner plan</option>
                  </select>
                </div>
                <input
                  type="text"
                  value={scheduleForm.title}
                  onChange={(event) =>
                    setScheduleForm((previous) => ({
                      ...previous,
                      title: event.target.value,
                    }))
                  }
                  placeholder={
                    scheduleForm.kind === "dinner"
                      ? "e.g. Saturday team dinner"
                      : "Round title"
                  }
                  className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 outline-none transition focus:border-emerald-700"
                  required
                />
                <input
                  type="text"
                  value={scheduleForm.course}
                  onChange={(event) =>
                    setScheduleForm((previous) => ({
                      ...previous,
                      course: event.target.value,
                    }))
                  }
                  placeholder={
                    scheduleForm.kind === "dinner"
                      ? "Restaurant or venue (optional)"
                      : "Course name"
                  }
                  className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 outline-none transition focus:border-emerald-700"
                  required={scheduleForm.kind === "round"}
                />
                <input
                  type="date"
                  value={scheduleForm.date}
                  onChange={(event) =>
                    setScheduleForm((previous) => ({
                      ...previous,
                      date: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 outline-none transition focus:border-emerald-700"
                  required
                />
                <textarea
                  value={scheduleForm.notes}
                  onChange={(event) =>
                    setScheduleForm((previous) => ({
                      ...previous,
                      notes: event.target.value,
                    }))
                  }
                  placeholder={
                    scheduleForm.kind === "dinner"
                      ? "Time, reservations, menu notes…"
                      : "Optional notes (tee time, format, etc.)"
                  }
                  className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 outline-none transition focus:border-emerald-700"
                  rows={3}
                />
                <button
                  type="submit"
                  disabled={isSavingSchedule}
                  className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSavingSchedule ? "Adding..." : "Add to schedule"}
                </button>
              </form>
            ) : null}
          </section>
        ) : null}

        {activeTab === "upload" ? (
          <section>
            <h2 className="text-lg font-bold text-stone-900">Upload Scorecard</h2>
            <p className="mt-1 text-sm text-stone-600">
              Manually enter hole-by-hole scores for each player.
            </p>

            <form className="mt-6 space-y-6" onSubmit={handleScorecardSubmit}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold text-stone-700">Course Name</label>
                  <input
                    type="text"
                    value={scorecardForm.course}
                    onChange={(event) =>
                      setScorecardForm((previous) => ({
                        ...previous,
                        course: event.target.value,
                      }))
                    }
                    placeholder="e.g., Timberline Golf Club"
                    className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 outline-none transition focus:border-emerald-700"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-stone-700">Round Date</label>
                  <input
                    type="date"
                    value={scorecardForm.date}
                    onChange={(event) =>
                      setScorecardForm((previous) => ({
                        ...previous,
                        date: event.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 outline-none transition focus:border-emerald-700"
                    required
                  />
                </div>
              </div>

              <div className="space-y-4">
                {scoreCardPlayers.map((player, playerIndex) => (
                  <div
                    key={playerIndex}
                    className="rounded-xl border border-stone-200 bg-stone-50 p-4"
                  >
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-semibold text-stone-700">Player Name</label>
                      <input
                        type="text"
                        value={player.playerName}
                        onChange={(event) => {
                          const next = [...scoreCardPlayers];
                          next[playerIndex] = { ...next[playerIndex], playerName: event.target.value };
                          setScorecardPlayers(next);
                        }}
                        placeholder="e.g., MinJungKyu"
                        className="flex-1 rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 outline-none transition focus:border-emerald-700"
                      />
                    </div>

                    <div className="mt-3 grid grid-cols-9 gap-2 sm:grid-cols-9">
                      {player.holes.map((score, holeIndex) => (
                        <div key={holeIndex} className="flex flex-col">
                          <label className="text-xs font-semibold text-stone-600">H{holeIndex + 1}</label>
                          <input
                            type="number"
                            min="0"
                            max="13"
                            value={score === 0 ? "" : score}
                            onChange={(event) => {
                              const next = [...scoreCardPlayers];
                              const nextHoles = [...next[playerIndex].holes];
                              nextHoles[holeIndex] = event.target.value ? Number(event.target.value) : 0;
                              next[playerIndex] = {
                                ...next[playerIndex],
                                holes: nextHoles,
                              };
                              setScorecardPlayers(next);
                            }}
                            className="mt-1 rounded border border-stone-300 bg-white px-2 py-1 text-center text-sm text-stone-800 outline-none transition focus:border-emerald-700"
                            placeholder="-"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setScorecardPlayers((previous) => [
                      ...previous,
                      { playerName: "", holes: Array(18).fill(0) },
                    ]);
                  }}
                  className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition hover:border-emerald-700 hover:text-emerald-800"
                >
                  Add Player
                </button>
                <button
                  type="submit"
                  disabled={isSavingScorecard}
                  className="flex-1 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold uppercase tracking-[0.15em] text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSavingScorecard ? "Saving..." : "Save Scorecard"}
                </button>
              </div>
            </form>
          </section>
        ) : null}

        {activeTab === "weekends" ? (
          <section>
            <h2 className="text-lg font-bold text-stone-900">Weekends</h2>
            <p className="mt-1 text-sm text-stone-600">
              Manage the active weekend and browse past trips. Admins can end or start weekends
              below.
            </p>

            {activeWeekend ? (
              <article className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">
                  Current
                </p>
                <p className="mt-1 text-base font-bold text-stone-900">{activeWeekend.title}</p>
                <p className="mt-1 text-sm text-stone-600">
                  {activeWeekend.startDate}
                  {activeWeekend.endDate ? ` – ${activeWeekend.endDate}` : ""} ·{" "}
                  {activeWeekend.roundsLeft} round
                  {activeWeekend.roundsLeft === 1 ? "" : "s"} left
                </p>
              </article>
            ) : null}

            <div className="mt-4 space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-stone-600">
                Past weekends
              </h3>
              {pastWeekends.length === 0 ? (
                <p className="text-sm text-stone-500">No completed weekends yet.</p>
              ) : (
                pastWeekends.map((weekend) => (
                  <article
                    key={weekend.id}
                    className="rounded-xl border border-stone-200 bg-stone-50 p-4"
                  >
                    <p className="text-sm font-bold text-stone-900">{weekend.title}</p>
                    <p className="mt-1 text-sm text-stone-600">
                      {weekend.startDate}
                      {weekend.endDate ? ` – ${weekend.endDate}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-stone-500">
                      {weekend.roundsCompleted} of {weekend.roundsScheduled} rounds played
                    </p>
                  </article>
                ))
              )}
            </div>

            {userRole === "admin" && activeWeekend ? (
              <div className="mt-6 space-y-3 rounded-xl border border-red-100 bg-red-50/50 p-4">
                <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-red-800">
                  End weekend
                </h4>
                <p className="text-sm text-stone-600">
                  Archive &quot;{activeWeekend.title}&quot; without starting another. Scores and
                  schedule move to Past weekends.
                </p>
                <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-stone-600">
                  End date (optional)
                </label>
                <input
                  type="date"
                  value={endWeekendDate}
                  onChange={(event) => setEndWeekendDate(event.target.value)}
                  className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 outline-none transition focus:border-emerald-700"
                />
                <button
                  type="button"
                  onClick={() => void handleEndWeekend()}
                  disabled={isEndingWeekend}
                  className="w-full rounded-xl border border-red-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-red-800 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isEndingWeekend ? "Ending..." : "End weekend"}
                </button>
              </div>
            ) : null}

            {userRole === "admin" ? (
              <form
                className="mt-6 space-y-3 rounded-xl border border-stone-200 bg-white p-4"
                onSubmit={handleStartWeekend}
              >
                <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-600">
                  Start new weekend
                </h4>
                <p className="text-sm text-stone-500">
                  Creates a new active weekend with default teams (Idaho vs Oregon). If one is
                  still active, end it first or this will replace it in one step.
                </p>
                <input
                  type="text"
                  value={weekendForm.title}
                  onChange={(event) =>
                    setWeekendForm((previous) => ({
                      ...previous,
                      title: event.target.value,
                    }))
                  }
                  placeholder="Weekend title (e.g. Memorial Day 2026)"
                  className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 outline-none transition focus:border-emerald-700"
                  required
                />
                <input
                  type="date"
                  value={weekendForm.startDate}
                  onChange={(event) =>
                    setWeekendForm((previous) => ({
                      ...previous,
                      startDate: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 outline-none transition focus:border-emerald-700"
                  required
                />
                <input
                  type="date"
                  value={weekendForm.endDate}
                  onChange={(event) =>
                    setWeekendForm((previous) => ({
                      ...previous,
                      endDate: event.target.value,
                    }))
                  }
                  placeholder="Optional end date"
                  className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 outline-none transition focus:border-emerald-700"
                />
                <button
                  type="submit"
                  disabled={isStartingWeekend}
                  className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isStartingWeekend ? "Starting..." : "Start new weekend"}
                </button>
              </form>
            ) : null}
          </section>
        ) : null}

        {activeTab === "games" ? (
          <section>
            <h2 className="text-lg font-bold text-stone-900">Games</h2>
            <p className="mt-1 text-sm text-stone-600">
              Active and recent side games for this weekend.
            </p>

            <div className="mt-4 space-y-3">
              {GAMES.map((game) => (
                <article
                  key={game.name}
                  className="rounded-xl border border-stone-200 bg-stone-50 p-4"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="text-base font-semibold text-stone-900">{game.name}</h3>
                    <span className="rounded-full border border-stone-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-stone-600">
                      {game.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-stone-600">{game.details}</p>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
