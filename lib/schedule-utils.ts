export type ScheduleItemLike = {
  id: string;
  kind: "round" | "dinner";
  title: string;
  course: string;
  date: string;
  sortOrder?: number;
  notes?: string;
  createdAt?: string;
};

export type ScorecardRoundLike = {
  id?: string;
  date: string;
  course: string;
  scheduleEntryId?: string;
  createdAt?: string;
};

export function formatScheduleDate(date: string) {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }
  return parsed.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatScheduleDateFull(date: string) {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }
  return parsed.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function compareScheduleItems(a: ScheduleItemLike, b: ScheduleItemLike) {
  const byDate = a.date.localeCompare(b.date);
  if (byDate !== 0) {
    return byDate;
  }
  const byOrder = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  if (byOrder !== 0) {
    return byOrder;
  }
  return (a.createdAt ?? "").localeCompare(b.createdAt ?? "");
}

/** @deprecated Use compareScheduleItems */
export const compareScheduledRounds = compareScheduleItems;

export function roundsOnSameDayCount(schedule: ScheduleItemLike[], date: string) {
  return roundsOnSameDay(schedule, date).length;
}

export function canReorderScheduleRound(
  item: ScheduleItemLike,
  schedule: ScheduleItemLike[],
) {
  return item.kind === "round" && roundsOnSameDayCount(schedule, item.date) > 1;
}

export function listScheduledRounds(schedule: ScheduleItemLike[]): ScheduleItemLike[] {
  return schedule
    .filter((item) => item.kind === "round")
    .sort(compareScheduledRounds);
}

/** Primary line for a golf round in pickers and scorecards (course name). */
export function roundPrimaryLabel(round: ScheduleItemLike) {
  return round.kind === "round" ? round.course : round.title;
}

function roundsOnSameDay(schedule: ScheduleItemLike[], date: string) {
  return schedule.filter((item) => item.kind === "round" && item.date === date);
}

/** Whether to show the schedule title to distinguish multiple rounds on one day. */
export function shouldShowRoundTitle(
  round: ScheduleItemLike,
  schedule: ScheduleItemLike[],
) {
  const onDay = roundsOnSameDay(schedule, round.date);
  if (onDay.length <= 1) {
    return false;
  }
  return Boolean(round.title.trim());
}

/** Secondary line: weekday + date, plus title when multiple rounds share a day. */
export function roundSecondaryLabel(
  round: ScheduleItemLike,
  schedule: ScheduleItemLike[],
) {
  const datePart = formatScheduleDate(round.date);
  if (shouldShowRoundTitle(round, schedule)) {
    return `${datePart} · ${round.title}`;
  }
  return datePart;
}

export function roundSelectLabel(round: ScheduleItemLike, schedule: ScheduleItemLike[]) {
  return `${roundPrimaryLabel(round)} · ${roundSecondaryLabel(round, schedule)}`;
}

export function scorecardMatchKey(date: string, course: string) {
  return `${date}|${course.trim().toLowerCase()}`;
}

export function matchesScheduleRound(
  scorecard: ScorecardRoundLike,
  round: ScheduleItemLike,
): boolean {
  if (scorecard.scheduleEntryId && scorecard.scheduleEntryId === round.id) {
    return true;
  }
  if (scorecard.scheduleEntryId) {
    return false;
  }
  return (
    scorecard.date === round.date &&
    scorecard.course.trim().toLowerCase() === round.course.trim().toLowerCase()
  );
}

export function findScorecardForRound<T extends ScorecardRoundLike>(
  scorecards: T[],
  round: ScheduleItemLike,
): T | null {
  return scorecards.find((entry) => matchesScheduleRound(entry, round)) ?? null;
}

export function resolveScorecardRoundFromSchedule(
  round: ScheduleItemLike & { courseId?: string },
  golfCourses: Array<{ id: string; name: string }>,
): {
  scheduleEntryId: string;
  courseId: string;
  course: string;
  date: string;
} | null {
  if (round.kind !== "round") {
    return null;
  }

  const match =
    (round.courseId ? golfCourses.find((course) => course.id === round.courseId) : null) ??
    golfCourses.find(
      (course) => course.name.trim().toLowerCase() === round.course.trim().toLowerCase(),
    );

  if (!match) {
    return null;
  }

  return {
    scheduleEntryId: round.id,
    courseId: match.id,
    course: match.name,
    date: round.date,
  };
}

export function isRoundScored(
  round: ScheduleItemLike,
  scorecards: ScorecardRoundLike[],
): boolean {
  return scorecards.some((entry) => matchesScheduleRound(entry, round));
}

export function orderPostedScorecards<
  T extends ScorecardRoundLike & { id: string; players: unknown[]; createdAt: string },
>(schedule: ScheduleItemLike[], scorecards: T[]) {
  const rounds = listScheduledRounds(schedule);
  const used = new Set<string>();
  const ordered: Array<{ round: ScheduleItemLike | null; scorecard: T }> = [];

  for (const item of rounds) {
    const match = findScorecardForRound(scorecards, item);
    if (match && !used.has(match.id)) {
      used.add(match.id);
      ordered.push({ round: item, scorecard: match });
    }
  }

  const orphans = scorecards
    .filter((entry) => !used.has(entry.id))
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) || (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
    );

  for (const scorecard of orphans) {
    ordered.push({ round: null, scorecard });
  }

  return ordered;
}

export type ScheduledRoundOption = {
  scheduleId: string;
  id: string;
  label: string;
  dateLabel: string;
  selectLabel: string;
  chipTitle: string;
  chipSubtitle: string;
  hasScores: boolean;
  round: ScheduleItemLike;
};

export function buildScheduledRoundOptions(
  schedule: ScheduleItemLike[],
  scorecards: ScorecardRoundLike[],
): ScheduledRoundOption[] {
  const rounds = listScheduledRounds(schedule);

  return rounds.map((item) => {
    const scorecard = findScorecardForRound(scorecards, item);
    return {
      scheduleId: item.id,
      id: scorecard?.id ?? `schedule-${item.id}`,
      label: roundPrimaryLabel(item),
      dateLabel: roundSecondaryLabel(item, rounds),
      selectLabel: roundSelectLabel(item, rounds),
      chipTitle: roundPrimaryLabel(item),
      chipSubtitle: formatScheduleDate(item.date),
      hasScores: Boolean(scorecard),
      round: item,
    };
  });
}

export function findUpNext(
  schedule: ScheduleItemLike[],
  scorecards: ScorecardRoundLike[],
): ScheduleItemLike | null {
  const today = new Date().toISOString().slice(0, 10);
  const rounds = listScheduledRounds(schedule);

  if (rounds.length === 0) {
    return null;
  }

  const upcomingUnscored = rounds.find(
    (item) => item.date >= today && !isRoundScored(item, scorecards),
  );
  if (upcomingUnscored) {
    return upcomingUnscored;
  }

  const nextOnCalendar = rounds.find((item) => item.date >= today);
  if (nextOnCalendar) {
    return nextOnCalendar;
  }

  const anyUnscored = rounds.find((item) => !isRoundScored(item, scorecards));
  if (anyUnscored) {
    return anyUnscored;
  }

  return rounds[rounds.length - 1] ?? null;
}
