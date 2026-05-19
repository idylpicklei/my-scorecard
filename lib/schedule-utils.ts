export type ScheduleItemLike = {
  id: string;
  kind: "round" | "dinner";
  title: string;
  course: string;
  date: string;
  notes?: string;
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

export function scorecardMatchKey(date: string, course: string) {
  return `${date}|${course.trim().toLowerCase()}`;
}

export function resolveScorecardRoundFromSchedule(
  round: ScheduleItemLike & { courseId?: string },
  golfCourses: Array<{ id: string; name: string }>,
): { courseId: string; course: string; date: string } | null {
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
    courseId: match.id,
    course: match.name,
    date: round.date,
  };
}

export function isRoundScored(
  date: string,
  course: string,
  scorecards: Array<{ date: string; course: string }>,
): boolean {
  const key = scorecardMatchKey(date, course);
  return scorecards.some((entry) => scorecardMatchKey(entry.date, entry.course) === key);
}

export function listScheduledRounds(schedule: ScheduleItemLike[]): ScheduleItemLike[] {
  return schedule
    .filter((item) => item.kind === "round")
    .sort((a, b) => {
      const byDate = a.date.localeCompare(b.date);
      if (byDate !== 0) {
        return byDate;
      }
      return a.title.localeCompare(b.title);
    });
}

export function findUpNext(
  schedule: ScheduleItemLike[],
  scorecards: Array<{ date: string; course: string }>,
): ScheduleItemLike | null {
  const today = new Date().toISOString().slice(0, 10);
  const rounds = listScheduledRounds(schedule);

  if (rounds.length === 0) {
    return null;
  }

  const scored = new Set(scorecards.map((entry) => scorecardMatchKey(entry.date, entry.course)));

  const upcomingUnscored = rounds.find(
    (item) => item.date >= today && !scored.has(scorecardMatchKey(item.date, item.course)),
  );
  if (upcomingUnscored) {
    return upcomingUnscored;
  }

  const nextOnCalendar = rounds.find((item) => item.date >= today);
  if (nextOnCalendar) {
    return nextOnCalendar;
  }

  const anyUnscored = rounds.find(
    (item) => !scored.has(scorecardMatchKey(item.date, item.course)),
  );
  if (anyUnscored) {
    return anyUnscored;
  }

  return rounds[rounds.length - 1] ?? null;
}
