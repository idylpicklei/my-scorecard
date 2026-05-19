"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CourseSetupForm } from "@/app/course-setup-form";
import { DashboardOverview } from "@/app/dashboard-overview";
import { ScorecardEntry } from "@/app/scorecard-entry";
import { ScorecardScanUpload } from "@/app/scorecard-scan-upload";
import { SkinsGamePanel } from "@/app/skins-game-panel";
import { ScoreboardPanel } from "@/app/scoreboard-panel";
import { ScorecardsPanel, type SavedScorecard } from "@/app/scorecards-panel";
import { scorecardToRows } from "@/lib/scorecard-rows";
import {
  canReorderScheduleRound,
  compareScheduleItems,
  findUpNext,
  formatScheduleDate,
  formatScheduleDateFull,
  isRoundScored,
  resolveScorecardRoundFromSchedule,
  roundPrimaryLabel,
} from "@/lib/schedule-utils";
import type { GolfCourseLayout } from "@/lib/golf-course";
import { mergeScannedIntoEntryPlayers } from "@/lib/scorecard-scan";
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
  shortLabel: string;
};

const TABS: TabConfig[] = [
  { id: "schedule", label: "Schedule", shortLabel: "Schedule" },
  { id: "overview", label: "Overview", shortLabel: "Overview" },
  { id: "scoreboard", label: "Score Board", shortLabel: "Scores" },
  { id: "upload", label: "Upload Scorecard", shortLabel: "Upload" },
  { id: "games", label: "Games", shortLabel: "Games" },
  { id: "weekends", label: "Weekends", shortLabel: "Trips" },
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
  courseId?: string;
  date: string;
  sortOrder?: number;
  notes?: string;
  createdAt: string;
};

type ScorecardPlayer = {
  playerName: string;
  holes: number[];
};

function emptyScoreRows(): ScoreRow[] {
  return TRIP_PLAYERS.map((player) => ({
    player,
    front9: 0,
    back9: 0,
  }));
}

function defaultScorecardPlayers() {
  return TRIP_PLAYERS.map((playerName) => ({
    playerName,
    holes: Array(18).fill(0),
  }));
}

const GAMES = [
  {
    name: "Skin Game",
    details: "Lowest score wins the skin",
    status: "Active",
  },
  {
    name: "More Games coming soon...",
    details: "More games coming soon...",
    status: "Coming Soon",
  }
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
  scorecards: SavedScorecard[];
  courses: GolfCourseLayout[];
  handicapsByPlayer: Record<string, number>;
  activeWeekend: WeekendSummary | null;
  pastWeekends: WeekendSummary[];
};

type DashboardTabsProps = {
  userRole: UserRole;
  currentUser: { name: string; username: string; handicap: number };
};

export function DashboardTabs({ userRole, currentUser }: DashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<DashboardTab>("schedule");
  const [handicapsByPlayer, setHandicapsByPlayer] = useState<Record<string, number>>({});
  const [teams, setTeamsState] = useState<Team[]>([]);
  const [teamDraft, setTeamDraft] = useState<Team[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSavingTeams, setIsSavingTeams] = useState(false);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [reorderingScheduleId, setReorderingScheduleId] = useState<string | null>(null);
  const [isSavingScorecard, setIsSavingScorecard] = useState(false);
  const [savedScorecards, setSavedScorecards] = useState<SavedScorecard[]>([]);
  const [scoreRows, setScoreRows] = useState<ScoreRow[]>(emptyScoreRows);
  const [scoreCardPlayers, setScorecardPlayers] = useState(defaultScorecardPlayers);
  const [golfCourses, setGolfCourses] = useState<GolfCourseLayout[]>([]);
  const [showCourseSetup, setShowCourseSetup] = useState(false);
  const [scorecardForm, setScorecardForm] = useState({
    scheduleEntryId: "",
    courseId: "",
    course: "",
    date: "",
  });
  const [scheduleForm, setScheduleForm] = useState({
    kind: "round" as "round" | "dinner",
    title: "",
    courseId: "",
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

  async function loadDashboard(): Promise<DashboardResponse | null> {
    setIsLoading(true);
    setError(null);

    const response = await fetch("/api/dashboard", { cache: "no-store" });
    if (!response.ok) {
      setError("Unable to load weekend dashboard data.");
      setIsLoading(false);
      return null;
    }

    const payload = (await response.json()) as DashboardResponse;
    setTeamsState(payload.teams);
    setTeamDraft(payload.teams);
    setSchedule(payload.schedule);
    setGolfCourses(payload.courses ?? []);
    setHandicapsByPlayer(payload.handicapsByPlayer);
    setActiveWeekend(payload.activeWeekend);
    setPastWeekends(payload.pastWeekends ?? []);

    const scorecards = payload.scorecards ?? [];
    setSavedScorecards(scorecards);
    const latest = scorecards[0];
    if (latest) {
      setScoreRows(scorecardToRows(latest));
    } else {
      setScoreRows(emptyScoreRows());
    }

    setIsLoading(false);
    return payload;
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  const courseById = useMemo(() => {
    return new Map(golfCourses.map((course) => [course.id, course]));
  }, [golfCourses]);

  const sortedSchedule = useMemo(
    () => [...schedule].sort(compareScheduleItems),
    [schedule],
  );

  const roundsByDate = useMemo(() => {
    const map = new Map<string, ScheduleItem[]>();
    for (const item of schedule) {
      if (item.kind !== "round") {
        continue;
      }
      const list = map.get(item.date) ?? [];
      list.push(item);
      map.set(item.date, list);
    }
    for (const [date, list] of map) {
      map.set(date, [...list].sort(compareScheduleItems));
    }
    return map;
  }, [schedule]);

  const hasMultiRoundDays = useMemo(
    () => [...roundsByDate.values()].some((rounds) => rounds.length > 1),
    [roundsByDate],
  );

  const selectedUploadCourse = useMemo(() => {
    return golfCourses.find((course) => course.id === scorecardForm.courseId) ?? null;
  }, [golfCourses, scorecardForm.courseId]);

  const nextRoundForEntry = useMemo(
    () => findUpNext(schedule, savedScorecards),
    [schedule, savedScorecards],
  );

  const uploadRoundLabel = useMemo(() => {
    if (!nextRoundForEntry || nextRoundForEntry.kind !== "round") {
      return null;
    }
    const matchesNext =
      scorecardForm.date === nextRoundForEntry.date &&
      scorecardForm.course.trim().toLowerCase() ===
        nextRoundForEntry.course.trim().toLowerCase();
    if (!matchesNext) {
      return null;
    }
    return `Next round: ${roundPrimaryLabel(nextRoundForEntry)} · ${formatScheduleDate(nextRoundForEntry.date)}`;
  }, [nextRoundForEntry, scorecardForm.course, scorecardForm.date]);

  useEffect(() => {
    if (userRole !== "admin" || activeTab !== "upload") {
      return;
    }
    if (!nextRoundForEntry || nextRoundForEntry.kind !== "round") {
      return;
    }
    const resolved = resolveScorecardRoundFromSchedule(nextRoundForEntry, golfCourses);
    if (!resolved?.courseId) {
      return;
    }

    setScorecardForm((previous) => {
      if (previous.courseId && previous.scheduleEntryId) {
        const priorRound = schedule.find((item) => item.id === previous.scheduleEntryId);
        if (priorRound && !isRoundScored(priorRound, savedScorecards)) {
          return previous;
        }
      }
      return {
        scheduleEntryId: resolved.scheduleEntryId,
        courseId: resolved.courseId,
        course: resolved.course,
        date: resolved.date,
      };
    });
  }, [activeTab, userRole, nextRoundForEntry, golfCourses, savedScorecards]);

  const tabs = useMemo(() => {
    const visible = TABS.filter((tab) => userRole === "admin" || tab.id !== "upload");
    return visible.map((tab) =>
      tab.id === "upload"
        ? { ...tab, label: "Upload Scorecard", shortLabel: "Upload" }
        : tab,
    );
  }, [userRole]);

  useEffect(() => {
    if (userRole !== "admin" && activeTab === "upload") {
      setActiveTab("scoreboard");
    }
  }, [userRole, activeTab]);

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
    setSchedule((previous) =>
      [...previous, payload.entry].sort(compareScheduleItems),
    );
    setScheduleForm({
      kind: "round",
      title: "",
      courseId: "",
      course: "",
      date: "",
      notes: "",
    });
    setIsSavingSchedule(false);
  }

  async function handleReorderScheduleRound(entryId: string, direction: "up" | "down") {
    setReorderingScheduleId(entryId);
    setError(null);

    const response = await fetch("/api/admin/schedule", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: entryId, direction }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setError(payload?.error ?? "Unable to reorder rounds.");
      setReorderingScheduleId(null);
      return;
    }

    await loadDashboard();
    setReorderingScheduleId(null);
  }

  async function handleScorecardSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingScorecard(true);
    setError(null);

    if (!scorecardForm.courseId) {
      setError("Select a course with a saved scorecard (par and handicap ranks).");
      setIsSavingScorecard(false);
      return;
    }

    const response = await fetch("/api/scorecards", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        courseId: scorecardForm.courseId,
        scheduleEntryId: scorecardForm.scheduleEntryId || undefined,
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

    setScorecardPlayers(defaultScorecardPlayers());
    setIsSavingScorecard(false);
    const refreshed = await loadDashboard();
    const next =
      refreshed &&
      findUpNext(refreshed.schedule, refreshed.scorecards ?? []);
    if (next?.kind === "round") {
      const resolved = resolveScorecardRoundFromSchedule(
        next,
        refreshed?.courses ?? golfCourses,
      );
      if (resolved?.courseId) {
        setScorecardForm({
          scheduleEntryId: resolved.scheduleEntryId,
          courseId: resolved.courseId,
          course: resolved.course,
          date: resolved.date,
        });
      } else {
        setScorecardForm({ scheduleEntryId: "", courseId: "", course: "", date: "" });
      }
    } else {
      setScorecardForm({ scheduleEntryId: "", courseId: "", course: "", date: "" });
    }
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
      <p className="px-4 py-8 text-sm text-stone-600 sm:px-0">Loading weekend dashboard...</p>
    );
  }

  return (
    <div>
      {error ? (
        <p className="border-b border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 sm:mb-4 sm:rounded-lg sm:border sm:px-4 sm:py-3">
          {error}
        </p>
      ) : null}

      {activeWeekend ? (
        <div className="flex items-center justify-between gap-3 border-b border-emerald-200/80 bg-emerald-50/90 px-4 py-2.5 sm:mb-4 sm:rounded-xl sm:border sm:border-emerald-200 sm:px-4 sm:py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-stone-900 sm:text-base">{activeWeekend.title}</p>
            <p className="text-xs text-stone-600">
              {activeWeekend.startDate}
              {activeWeekend.endDate ? ` – ${activeWeekend.endDate}` : ""}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500">Rounds left</p>
            <p className="text-2xl font-black leading-none text-emerald-800 sm:text-3xl">{activeWeekend.roundsLeft}</p>
            <p className="text-[10px] text-stone-500">
              {activeWeekend.roundsCompleted}/{activeWeekend.roundsScheduled}
            </p>
          </div>
        </div>
      ) : (
        <p className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 sm:mb-4 sm:rounded-lg sm:border sm:px-4 sm:py-3">
          {userRole === "admin" ? "No active weekend — open Trips to start one." : "No active weekend yet."}
        </p>
      )}

      <nav className="sticky top-0 z-10 border-b border-stone-200 bg-white sm:static sm:border-0 sm:bg-transparent" aria-label="Dashboard sections">
        <div
          className={`-mb-px flex overflow-x-auto overscroll-x-contain sm:grid sm:gap-2 ${
            tabs.length >= 6 ? "sm:grid-cols-3 lg:grid-cols-6" : "sm:grid-cols-3 lg:grid-cols-5"
          }`}
        >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 border-b-2 px-4 py-3 text-xs font-semibold transition sm:rounded-xl sm:border sm:border-b-2 sm:px-3 sm:py-2.5 sm:text-sm ${
                isActive
                  ? "border-emerald-700 text-emerald-800 sm:border-emerald-700 sm:bg-emerald-700 sm:text-white"
                  : "border-transparent text-stone-600 sm:border-stone-300 sm:bg-white sm:text-stone-700"
              }`}
            >
              <span className="sm:hidden">{tab.shortLabel}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
        </div>
      </nav>

      <div className="px-4 py-4 sm:mt-6 sm:rounded-2xl sm:border sm:border-stone-200 sm:bg-white sm:p-6">
        {activeTab === "overview" ? (
          <DashboardOverview
            currentUser={currentUser}
            teams={teams}
            scoreRows={scoreRows}
            handicapsByPlayer={handicapsByPlayer}
            schedule={schedule}
            scorecards={savedScorecards}
          />
        ) : null}

        {activeTab === "scoreboard" ? (
          <section>
            <h2 className="text-lg font-bold text-stone-900">Score Board</h2>
            <p className="mt-1 hidden text-sm text-stone-600 sm:block">
              {userRole === "admin"
                ? "Upcoming round stroke holes at the top; gross and net totals by round below."
                : "Stroke guide, round totals, and posted hole-by-hole scorecards."}
            </p>

            <ScoreboardPanel
              schedule={schedule}
              scorecards={savedScorecards}
              teams={teams}
              golfCourses={golfCourses}
              handicapsByPlayer={handicapsByPlayer}
              currentUser={currentUser}
            />

            {userRole !== "admin" ? (
              <ScorecardsPanel
                scorecards={savedScorecards}
                schedule={schedule}
                golfCourses={golfCourses}
                handicapsByPlayer={handicapsByPlayer}
                currentUser={currentUser}
                showStrokePreview={false}
              />
            ) : null}

            {userRole === "admin" ? (
              <div className="mt-6 border-t border-stone-200 pt-4">
                <form className="space-y-4" onSubmit={handleTeamSave}>
                  <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-600">
                    Admin team editor
                  </h4>
                  {teamDraft.map((team, index) => (
                    <div key={team.id} className="border-b border-stone-200 py-3 last:border-b-0 sm:rounded-xl sm:border sm:bg-white sm:p-3">
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
              </div>
            ) : null}
          </section>
        ) : null}

        {activeTab === "schedule" ? (
          <section>
            <h2 className="text-lg font-bold text-stone-900">Weekend schedule</h2>
            <p className="mt-1 hidden text-sm text-stone-600 sm:block">
              Add golf rounds and dinner plans. Only golf rounds count toward &quot;rounds left&quot;
              on the dashboard.
            </p>

            {userRole === "admin" && hasMultiRoundDays ? (
              <p className="mt-2 text-xs text-stone-600">
                Two rounds share a day — use Earlier / Later so morning plays before afternoon
                everywhere (scoreboard, scorecards, upload).
              </p>
            ) : null}

            <div className="mt-4 sm:space-y-3">
              {sortedSchedule.map((item) => {
                const dayRounds =
                  item.kind === "round" ? (roundsByDate.get(item.date) ?? []) : [];
                const roundIndex = dayRounds.findIndex((round) => round.id === item.id);
                const showReorder =
                  userRole === "admin" &&
                  canReorderScheduleRound(item, schedule) &&
                  roundIndex >= 0;

                return (
                <article
                  key={item.id}
                  className={`border-b py-3 last:border-b-0 sm:rounded-xl sm:border sm:p-4 ${
                    item.kind === "dinner"
                      ? "border-amber-200/80 sm:border-amber-200 sm:bg-amber-50/80"
                      : "border-stone-200 sm:bg-stone-50"
                  }`}
                >
                  <div className="flex flex-wrap items-start gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                        item.kind === "dinner"
                          ? "bg-amber-200 text-amber-900"
                          : "bg-emerald-200 text-emerald-900"
                      }`}
                    >
                      {item.kind === "dinner" ? "Dinner" : "Golf round"}
                    </span>
                    <p className="text-sm font-bold text-stone-900">
                      {item.kind === "round" ? item.course : item.title}
                    </p>
                    {showReorder ? (
                      <div
                        className="ml-auto flex shrink-0 gap-1"
                        role="group"
                        aria-label="Reorder round"
                      >
                        <button
                          type="button"
                          disabled={roundIndex <= 0 || reorderingScheduleId !== null}
                          onClick={() => void handleReorderScheduleRound(item.id, "up")}
                          className="rounded-lg border border-stone-300 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-stone-700 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Earlier
                        </button>
                        <button
                          type="button"
                          disabled={
                            roundIndex >= dayRounds.length - 1 ||
                            reorderingScheduleId !== null
                          }
                          onClick={() => void handleReorderScheduleRound(item.id, "down")}
                          className="rounded-lg border border-stone-300 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-stone-700 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Later
                        </button>
                      </div>
                    ) : null}
                  </div>
                  {item.kind === "round" ? (
                    <p className="mt-1 text-xs text-stone-600">
                      {item.title}
                      {item.courseId ? (
                        <span>
                          {" "}
                          · Par {courseById.get(item.courseId)?.totalPar ?? "—"}
                        </span>
                      ) : null}
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-stone-700">
                      {item.course === "—" ? "Venue TBD" : item.course}
                    </p>
                  )}
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-800">
                    {formatScheduleDate(item.date)}
                  </p>
                  {item.notes ? (
                    <p className="mt-2 text-sm text-stone-600">{item.notes}</p>
                  ) : null}
                </article>
                );
              })}
            </div>

            {userRole === "admin" ? (
              <div className="mt-6 space-y-4 border-t border-stone-200 pt-4 sm:rounded-xl sm:border sm:bg-white sm:p-4">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-600">
                      Course library
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowCourseSetup((open) => !open)}
                      className="text-xs font-semibold text-emerald-800"
                    >
                      {showCourseSetup ? "Hide" : "New course"}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-stone-500">
                    Save par and handicap stroke ranks once per course, then reuse when scheduling
                    and logging rounds.
                  </p>
                  {golfCourses.length > 0 ? (
                    <ul className="mt-2 space-y-1 text-sm text-stone-700">
                      {golfCourses.map((course) => (
                        <li key={course.id}>
                          <span className="font-semibold">{course.name}</span>
                          <span className="text-stone-500"> · Par {course.totalPar}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-stone-500">No courses saved yet.</p>
                  )}
                  {showCourseSetup ? (
                    <div className="mt-4 border-t border-stone-200 pt-4">
                      <CourseSetupForm
                        onCreated={(course) => {
                          setGolfCourses((previous) =>
                            [...previous, course].sort((a, b) => a.name.localeCompare(b.name)),
                          );
                          setShowCourseSetup(false);
                        }}
                      />
                    </div>
                  ) : null}
                </div>

              <form className="space-y-3 border-t border-stone-200 pt-4" onSubmit={handleScheduleCreate}>
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
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-stone-600">
                    {scheduleForm.kind === "round" ? "Round date" : "Date"}
                  </label>
                  <input
                    type="date"
                    value={scheduleForm.date}
                    onChange={(event) =>
                      setScheduleForm((previous) => ({
                        ...previous,
                        date: event.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 outline-none transition focus:border-emerald-700"
                    required
                  />
                  {scheduleForm.date ? (
                    <p className="mt-1 text-xs text-stone-600">
                      {formatScheduleDateFull(scheduleForm.date)}
                    </p>
                  ) : null}
                </div>
                {scheduleForm.kind === "round" ? (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-stone-600">
                      Course
                    </label>
                    <select
                      value={scheduleForm.courseId}
                      onChange={(event) => {
                        const courseId = event.target.value;
                        const course = golfCourses.find((entry) => entry.id === courseId);
                        setScheduleForm((previous) => ({
                          ...previous,
                          courseId,
                          course: course?.name ?? "",
                        }));
                      }}
                      className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 outline-none transition focus:border-emerald-700"
                      required
                    >
                      <option value="">Select a saved course</option>
                      {golfCourses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.name} (Par {course.totalPar})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <input
                    type="text"
                    value={scheduleForm.course}
                    onChange={(event) =>
                      setScheduleForm((previous) => ({
                        ...previous,
                        course: event.target.value,
                      }))
                    }
                    placeholder="Restaurant or venue (optional)"
                    className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 outline-none transition focus:border-emerald-700"
                  />
                )}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-stone-600">
                    {scheduleForm.kind === "round" ? "Round label" : "Title"}
                  </label>
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
                        : "e.g. Morning round (for ordering when two rounds share a day)"
                    }
                    className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 outline-none transition focus:border-emerald-700"
                    required
                  />
                </div>
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
              </div>
            ) : null}
          </section>
        ) : null}

        {activeTab === "upload" && userRole === "admin" ? (
          <section>
            <h2 className="text-lg font-bold text-stone-900">Upload Scorecard</h2>
            <p className="mt-1 hidden text-sm text-stone-600 sm:block">
              Scan a photo to fill scores, or tap each hole manually. Review before saving.
            </p>

            <form className="mt-6 space-y-6" onSubmit={handleScorecardSubmit}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold text-stone-700">Course</label>
                  <select
                    value={scorecardForm.courseId}
                    onChange={(event) => {
                      const courseId = event.target.value;
                      const course = golfCourses.find((entry) => entry.id === courseId);
                      setScorecardForm((previous) => ({
                        ...previous,
                        courseId,
                        course: course?.name ?? "",
                        scheduleEntryId: "",
                      }));
                    }}
                    className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 outline-none transition focus:border-emerald-700"
                    required
                  >
                    <option value="">Select course</option>
                    {golfCourses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.name} (Par {course.totalPar})
                      </option>
                    ))}
                  </select>
                  {golfCourses.length === 0 ? (
                    <p className="mt-2 text-xs text-amber-800">
                      Add a course under Schedule → Course library before logging scores.
                    </p>
                  ) : null}
                </div>
                <div>
                  <label className="text-sm font-semibold text-stone-700">Round date</label>
                  <input
                    type="date"
                    value={scorecardForm.date}
                    onChange={(event) =>
                      setScorecardForm((previous) => ({
                        ...previous,
                        date: event.target.value,
                        scheduleEntryId: "",
                      }))
                    }
                    className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 outline-none transition focus:border-emerald-700"
                    required
                  />
                  {scorecardForm.date ? (
                    <p className="mt-1 text-xs text-stone-600">
                      {formatScheduleDateFull(scorecardForm.date)}
                    </p>
                  ) : null}
                </div>
              </div>

              <ScorecardScanUpload
                knownPlayers={TRIP_PLAYERS}
                disabled={isSavingScorecard}
                onApply={(scanned) => {
                  setScorecardPlayers((previous) =>
                    mergeScannedIntoEntryPlayers(previous, scanned),
                  );
                }}
              />

              <ScorecardEntry
                players={scoreCardPlayers}
                onChange={setScorecardPlayers}
                courseLayout={
                  selectedUploadCourse
                    ? {
                        holePars: selectedUploadCourse.holePars,
                        strokeIndexes: selectedUploadCourse.strokeIndexes,
                      }
                    : null
                }
                playerHandicaps={handicapsByPlayer}
                roundLabel={uploadRoundLabel ?? undefined}
              />

              <div className="flex gap-2">
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
            <p className="mt-1 hidden text-sm text-stone-600 sm:block">
              Manage the active weekend and browse past trips. Admins can end or start weekends
              below.
            </p>

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
                    className="border-b border-stone-200 py-3 last:border-b-0 sm:rounded-xl sm:border sm:bg-stone-50 sm:p-4"
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
              <div className="mt-6 space-y-3 border-t border-red-200/80 pt-4 sm:rounded-xl sm:border sm:border-red-100 sm:bg-red-50/50 sm:p-4">
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
                className="mt-6 space-y-3 border-t border-stone-200 pt-4 sm:rounded-xl sm:border sm:bg-white sm:p-4"
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

            <SkinsGamePanel
              schedule={schedule}
              scorecards={savedScorecards}
              golfCourses={golfCourses}
              handicapsByPlayer={handicapsByPlayer}
            />

            <div className="mt-8 space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-stone-600">
                More games
              </h3>
              {GAMES.map((game) => (
                <article
                  key={game.name}
                  className="border-b border-stone-200 py-3 last:border-b-0 sm:rounded-xl sm:border sm:bg-stone-50 sm:p-4"
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
