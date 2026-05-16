import { readFileSync, writeFileSync } from "node:fs";

const path = "app/dashboard-tabs.tsx";
let s = readFileSync(path, "utf8");
const crlf = s.includes("\r\n");
s = s.replace(/\r\n/g, "\n");

function rep(oldBlock, newBlock) {
  if (!s.includes(oldBlock)) {
    console.error("Missing:", oldBlock.slice(0, 100));
    process.exit(1);
  }
  s = s.replace(oldBlock, newBlock);
}

rep(
  '        <div className="mb-4 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-white px-5 py-4">\n          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-800">\n            Active weekend\n          </p>\n          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">'.replaceAll("<div", "<div").replaceAll("</div>", "</div>"),
  `        <div className="flex items-center justify-between gap-3 border-b border-emerald-200/80 bg-emerald-50/90 px-4 py-2.5 sm:mb-4 sm:rounded-xl sm:border sm:border-emerald-200 sm:px-4 sm:py-3">\n          <div className="min-w-0">`,
);

rep(
  `              <h2 className="text-xl font-bold text-stone-900">{activeWeekend.title}</h2>\n              <p className="mt-1 text-sm text-stone-600">`,
  `              <p className="truncate text-sm font-bold text-stone-900 sm:text-base">{activeWeekend.title}</p>\n              <p className="text-xs text-stone-600">`,
);

rep(
  `            <div className="rounded-xl border border-emerald-200 bg-white px-5 py-3 text-center sm:min-w-[140px]">\n              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">\n                Rounds left\n              </p>\n              <p className="text-3xl font-black text-emerald-800">{activeWeekend.roundsLeft}</p>\n              <p className="text-xs text-stone-500">\n                {activeWeekend.roundsCompleted} / {activeWeekend.roundsScheduled} played\n              </p>\n            </div>\n          </div>\n        </div>`.replaceAll("<div", "<div").replaceAll("</div>", "</div>"),
  `            </div>\n          <div className="shrink-0 text-right">\n              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500">Rounds left</p>\n              <p className="text-2xl font-black leading-none text-emerald-800 sm:text-3xl">{activeWeekend.roundsLeft}</p>\n              <p className="text-[10px] text-stone-500">{activeWeekend.roundsCompleted}/{activeWeekend.roundsScheduled}</p>\n            </div>\n        </div>`.replaceAll("<div", "<div").replaceAll("</div>", "</div>"),
);

rep(
  `        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">\n          <p className="text-sm font-semibold text-amber-900">No active weekend</p>\n          <p className="mt-1 text-sm text-amber-800">\n            {userRole === "admin"\n              ? "Use the Weekends tab to end the current trip or start the next one."\n              : "Ask an admin to start the next golf weekend."}\n          </p>\n        </div>`,
  `        <p className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 sm:mb-4 sm:rounded-lg sm:border sm:px-4 sm:py-3">\n          {userRole === "admin" ? "No active weekend — open Trips to start one." : "No active weekend yet."}\n        </p>`,
);

rep(
  `      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">`,
  `      <nav className="sticky top-0 z-10 border-b border-stone-200 bg-white sm:static sm:border-0 sm:bg-transparent" aria-label="Dashboard sections">\n        <div className="-mb-px flex overflow-x-auto overscroll-x-contain sm:grid sm:grid-cols-3 sm:gap-2 lg:grid-cols-6">`,
);

rep(
  `              {tab.label}\n            </button>\n          );\n        })}\n      </div>\n\n      <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">`,
  `              <span className="sm:hidden">{tab.shortLabel}</span>\n              <span className="hidden sm:inline">{tab.label}</span>\n            </button>\n          );\n        })}\n        </div>\n      </nav>\n\n      <div className="px-4 py-4 sm:mt-6 sm:rounded-2xl sm:border sm:border-stone-200 sm:bg-white sm:p-6">`.replaceAll("<div", "<div").replaceAll("</div>", "</div>"),
);

rep(
  "className={`rounded-xl border px-4 py-3 text-sm font-semibold uppercase tracking-[0.15em] transition ${",
  "className={`shrink-0 border-b-2 px-4 py-3 text-xs font-semibold transition sm:rounded-xl sm:border sm:border-b-2 sm:px-3 sm:py-2.5 sm:text-sm ${",
);

rep(
  '? "border-emerald-700 bg-emerald-700 text-white"\n                  : "border-stone-300 bg-white text-stone-700 hover:border-emerald-700 hover:text-emerald-800"',
  '? "border-emerald-700 text-emerald-800 sm:border-emerald-700 sm:bg-emerald-700 sm:text-white"\n                  : "border-transparent text-stone-600 sm:border-stone-300 sm:bg-white sm:text-stone-700"',
);

if (crlf) s = s.replace(/\n/g, "\r\n");
writeFileSync(path, s);
console.log("done");
