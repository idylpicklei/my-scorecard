import { readFileSync, writeFileSync } from "node:fs";

const path = "app/dashboard-tabs.tsx";
let s = readFileSync(path, "utf8");
const crlf = s.includes("\r\n");
s = s.replace(/\r\n/g, "\n");

const reps = [
  [
    `<p className="mt-1 text-sm text-stone-600">
              Current round leaderboard for your foursome.
            </p>`,
    `<p className="mt-1 hidden text-sm text-stone-600 sm:block">
              Current round leaderboard for your foursome.
            </p>`,
  ],
  [
    `className="mt-6 rounded-xl border border-stone-200 bg-stone-50 p-4"`,
    `className="mt-6 border-t border-stone-200 pt-4 sm:rounded-xl sm:border sm:bg-stone-50 sm:p-4"`,
  ],
  [
    `className="rounded-xl border border-stone-200 bg-white p-4"
                  >
                    <p className="text-sm font-bold text-stone-900">{team.name}</p>`,
    `className="border-b border-stone-200 py-3 last:border-b-0 sm:rounded-xl sm:border sm:bg-white sm:p-4"
                  >
                    <p className="text-sm font-bold text-stone-900">{team.name}</p>`,
  ],
  [
    `className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2"`,
    `className="mt-3 divide-y divide-stone-200 sm:grid sm:grid-cols-2 sm:gap-3 sm:divide-none"`,
  ],
  [
    `className="rounded-xl border border-stone-200 bg-white p-3"`,
    `className="border-b border-stone-200 py-3 last:border-b-0 sm:rounded-xl sm:border sm:bg-white sm:p-3"`,
  ],
  [
    `<p className="mt-1 text-sm text-stone-600">
              Add golf rounds and dinner plans. Only golf rounds count toward &quot;rounds left&quot;
              on the dashboard.
            </p>`,
    `<p className="mt-1 hidden text-sm text-stone-600 sm:block">
              Add golf rounds and dinner plans. Only golf rounds count toward &quot;rounds left&quot;
              on the dashboard.
            </p>`,
  ],
  [
    `                  className={\`rounded-xl border p-4 $\{
                    item.kind === "dinner"
                      ? "border-amber-200 bg-amber-50/80"
                      : "border-stone-200 bg-stone-50"
                  }\`}`,
    `                  className={\`border-b py-3 last:border-b-0 sm:rounded-xl sm:border sm:p-4 $\{
                    item.kind === "dinner"
                      ? "border-amber-200/80 sm:border-amber-200 sm:bg-amber-50/80"
                      : "border-stone-200 sm:bg-stone-50"
                  }\`}`,
  ],
  [
    `className="mt-4 space-y-3"`,
    `className="mt-4 sm:space-y-3"`,
  ],
  [
    `className="mt-6 space-y-3 rounded-xl border border-stone-200 bg-white p-4" onSubmit={handleScheduleCreate}`,
    `className="mt-6 space-y-3 border-t border-stone-200 pt-4 sm:rounded-xl sm:border sm:bg-white sm:p-4" onSubmit={handleScheduleCreate}`,
  ],
  [
    `className="rounded-xl border border-stone-200 bg-stone-50 p-4"
                  >
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-semibold text-stone-700">Player Name</label>`,
    `className="border-t border-stone-200 pt-4 first:border-t-0 first:pt-0 sm:rounded-xl sm:border sm:bg-stone-50 sm:p-4"
                  >
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-semibold text-stone-700">Player Name</label>`,
  ],
  [
    `<p className="mt-1 text-sm text-stone-600">
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
                  {activeWeekend.endDate ? \` – \${activeWeekend.endDate}\` : ""} ·{" "}
                  {activeWeekend.roundsLeft} round
                  {activeWeekend.roundsLeft === 1 ? "" : "s"} left
                </p>
              </article>
            ) : null}

`,
    `<p className="mt-1 hidden text-sm text-stone-600 sm:block">
              Manage the active weekend and browse past trips. Admins can end or start weekends
              below.
            </p>

`,
  ],
  [
    `className="rounded-xl border border-stone-200 bg-stone-50 p-4"
                  >
                    <p className="text-sm font-bold text-stone-900">{weekend.title}</p>`,
    `className="border-b border-stone-200 py-3 last:border-b-0 sm:rounded-xl sm:border sm:bg-stone-50 sm:p-4"
                  >
                    <p className="text-sm font-bold text-stone-900">{weekend.title}</p>`,
  ],
  [
    `className="mt-6 space-y-3 rounded-xl border border-red-100 bg-red-50/50 p-4"`,
    `className="mt-6 space-y-3 border-t border-red-200/80 pt-4 sm:rounded-xl sm:border sm:border-red-100 sm:bg-red-50/50 sm:p-4"`,
  ],
  [
    `className="mt-6 space-y-3 rounded-xl border border-stone-200 bg-white p-4"
                onSubmit={handleStartWeekend}`,
    `className="mt-6 space-y-3 border-t border-stone-200 pt-4 sm:rounded-xl sm:border sm:bg-white sm:p-4"
                onSubmit={handleStartWeekend}`,
  ],
  [
    `className="rounded-xl border border-stone-200 bg-stone-50 p-4"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="text-base font-semibold text-stone-900">{game.name}</h3>`,
    `className="border-b border-stone-200 py-3 last:border-b-0 sm:rounded-xl sm:border sm:bg-stone-50 sm:p-4"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="text-base font-semibold text-stone-900">{game.name}</h3>`,
  ],
];

for (const [from, to] of reps) {
  if (!s.includes(from)) {
    console.warn("missing:", from.slice(0, 60));
  } else {
    s = s.replace(from, to);
  }
}

if (crlf) s = s.replace(/\n/g, "\r\n");
writeFileSync(path, s);
console.log("tabs patched");
