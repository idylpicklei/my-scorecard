import { readFileSync, writeFileSync } from "node:fs";

const path = "app/dashboard-overview.tsx";
let s = readFileSync(path, "utf8");
const crlf = s.includes("\r\n");
s = s.replace(/\r\n/g, "\n");

const removeWeekendCards = `      {activeWeekend ? (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">
              Active weekend
            </p>
            <p className="mt-1 text-base font-bold text-stone-900">{activeWeekend.title}</p>
            <p className="mt-1 text-sm text-stone-600">
              {activeWeekend.startDate}
              {activeWeekend.endDate ? \` – \${activeWeekend.endDate}\` : ""}
            </p>
          </div>
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 sm:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-600">
              Rounds remaining
            </p>
            <p className="mt-1 text-3xl font-black text-emerald-800">{activeWeekend.roundsLeft}</p>
            <p className="mt-1 text-sm text-stone-600">
              {activeWeekend.roundsCompleted} of {activeWeekend.roundsScheduled} scheduled rounds
              have scorecards on file.
            </p>
          </div>
        </div>
      ) : null}

`;

if (s.includes(removeWeekendCards)) {
  s = s.replace(removeWeekendCards, "");
} else if (!s.includes(removeWeekendCards.replaceAll("</motion>", "</div>"))) {
  console.warn("weekend cards block already removed or not found");
} else {
  s = s.replace(removeWeekendCards.replaceAll("</motion>", "</div>"), "");
}

s = s.replace(
  '<p className="mt-1 text-sm text-stone-600">',
  '<p className="mt-1 hidden text-sm text-stone-600 sm:block">',
);

s = s.replace(
  '<article className="mt-5 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 sm:p-6">',
  '<article className="mt-4 border-t border-emerald-200/80 pt-4 sm:mt-5 sm:rounded-2xl sm:border sm:border-emerald-200 sm:bg-gradient-to-br sm:from-emerald-50 sm:to-white sm:p-6">',
);

s = s.replaceAll(
  'className="rounded-xl border border-white/80 bg-white/90 p-3"',
  'className="sm:rounded-xl sm:border sm:border-white/80 sm:bg-white/90 sm:p-3"',
);

if (crlf) s = s.replace(/\n/g, "\r\n");
writeFileSync(path, s);
console.log("overview patched");
