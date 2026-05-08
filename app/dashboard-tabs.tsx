"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type DashboardTab = "scoreboard" | "upload" | "schedule" | "games";

type UserRole = "admin" | "member";

type TabConfig = {
  id: DashboardTab;
  label: string;
};

const TABS: TabConfig[] = [
  { id: "scoreboard", label: "Score Board" },
  { id: "upload", label: "Upload Scorecard" },
  { id: "schedule", label: "Schedule" },
  { id: "games", label: "Games" },
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
  title: string;
  course: string;
  date: string;
  notes?: string;
  createdAt: string;
};

const SCORE_ROWS: ScoreRow[] = [
  { player: "Kody", front9: 43, back9: 41 },
  { player: "Mitch", front9: 46, back9: 44 },
  { player: "Ty", front9: 45, back9: 46 },
  { player: "Ryan", front9: 48, back9: 45 },
];

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

type DashboardResponse = {
  teams: Team[];
  schedule: ScheduleItem[];
};

type DashboardTabsProps = {
  userRole: UserRole;
};

export function DashboardTabs({ userRole }: DashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<DashboardTab>("scoreboard");
  const [teams, setTeamsState] = useState<Team[]>([]);
  const [teamDraft, setTeamDraft] = useState<Team[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSavingTeams, setIsSavingTeams] = useState(false);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [isSavingScorecard, setIsSavingScorecard] = useState(false);
  const [scoreCardPlayers, setScorecardPlayers] = useState<Array<{
    playerName: string;
    holes: number[];
  }>>([
    { playerName: "", holes: Array(18).fill(0) },
    { playerName: "", holes: Array(18).fill(0) },
  ]);
  const [scorecardForm, setScorecardForm] = useState({
    course: "",
    date: "",
  });
  const [scheduleForm, setScheduleForm] = useState({
    title: "",
    course: "",
    date: "",
    notes: "",
  });

  useEffect(() => {
    async function loadDashboard() {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/dashboard", { cache: "no-store" });
      if (!response.ok) {
        setError("Unable to load team and schedule data.");
        setIsLoading(false);
        return;
      }

      const payload = (await response.json()) as DashboardResponse;
      setTeamsState(payload.teams);
      setTeamDraft(payload.teams);
      setSchedule(payload.schedule);
      setIsLoading(false);
    }

    void loadDashboard();
  }, []);

  const leaderboard = useMemo(() => {
    return [...SCORE_ROWS]
      .map((entry) => ({
        ...entry,
        total: entry.front9 + entry.back9,
      }))
      .sort((a, b) => a.total - b.total);
  }, []);

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
      return merged.sort((a, b) => a.date.localeCompare(b.date));
    });
    setScheduleForm({
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

    setScorecardForm({ course: "", date: "" });
    setScorecardPlayers([
      { playerName: "", holes: Array(18).fill(0) },
      { playerName: "", holes: Array(18).fill(0) },
    ]);
    setIsSavingScorecard(false);
  }

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-6 text-sm text-stone-600">
        Loading trip dashboard...
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

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
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
                  {leaderboard.map((row, index) => (
                    <tr key={row.player} className="rounded-xl bg-stone-50 text-stone-800">
                      <td className="px-3 py-3 font-semibold">
                        {index === 0 ? "Leader - " : ""}
                        {row.player}
                      </td>
                      <td className="px-3 py-3">{row.front9}</td>
                      <td className="px-3 py-3">{row.back9}</td>
                      <td className="px-3 py-3 font-bold">{row.total}</td>
                    </tr>
                  ))}
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
            <h2 className="text-lg font-bold text-stone-900">Upcoming Schedule</h2>
            <p className="mt-1 text-sm text-stone-600">
              Trip rounds and tee times.
            </p>

            <div className="mt-4 space-y-3">
              {schedule.map((item) => (
                <article key={item.id} className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                  <p className="text-sm font-bold text-stone-900">{item.title}</p>
                  <p className="mt-1 text-sm text-stone-700">{item.course}</p>
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
                  Admin: Add Schedule Item
                </h4>
                <input
                  type="text"
                  value={scheduleForm.title}
                  onChange={(event) =>
                    setScheduleForm((previous) => ({
                      ...previous,
                      title: event.target.value,
                    }))
                  }
                  placeholder="Round title"
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
                  placeholder="Course name"
                  className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 outline-none transition focus:border-emerald-700"
                  required
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
                  placeholder="Optional notes"
                  className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 outline-none transition focus:border-emerald-700"
                  rows={3}
                />
                <button
                  type="submit"
                  disabled={isSavingSchedule}
                  className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSavingSchedule ? "Adding..." : "Add to Schedule"}
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
                        placeholder="e.g., Kody"
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

        {activeTab === "games" ? (
          <section>
            <h2 className="text-lg font-bold text-stone-900">Games</h2>
            <p className="mt-1 text-sm text-stone-600">
              Active and recent games for this trip.
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
