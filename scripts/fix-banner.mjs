import { readFileSync, writeFileSync } from "node:fs";

const D = "motion".replace("motion", "div"); // div
const path = "app/dashboard-tabs.tsx";
let s = readFileSync(path, "utf8");
const crlf = s.includes("\r\n");
s = s.replace(/\r\n/g, "\n");

const tag = (attrs) => (attrs ? `<${D} className="${attrs}">` : `<${D}>`);
const end = `</${D}>`;

const broken = [
  `          ${tag("min-w-0")}`,
  `            ${tag()}`,
  '              <p className="truncate text-sm font-bold text-stone-900 sm:text-base">{activeWeekend.title}</p>',
  '              <p className="text-xs text-stone-600">',
  "                {activeWeekend.startDate}",
  '                {activeWeekend.endDate ? ` – ${activeWeekend.endDate}` : ""}',
  "              </p>",
  `            ${end}`,
  `            ${end}`,
  `          ${tag("shrink-0 text-right")}`,
  '              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500">Rounds left</p>',
  '              <p className="text-2xl font-black leading-none text-emerald-800 sm:text-3xl">{activeWeekend.roundsLeft}</p>',
  '              <p className="text-[10px] text-stone-500">{activeWeekend.roundsCompleted}/{activeWeekend.roundsScheduled}</p>',
  `            ${end}`,
].join("\n");

const fixed = [
  `          ${tag("min-w-0")}`,
  '            <p className="truncate text-sm font-bold text-stone-900 sm:text-base">{activeWeekend.title}</p>',
  '            <p className="text-xs text-stone-600">',
  "              {activeWeekend.startDate}",
  '              {activeWeekend.endDate ? ` – ${activeWeekend.endDate}` : ""}',
  "            </p>",
  `          ${end}`,
  `          ${tag("shrink-0 text-right")}`,
  '            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500">Rounds left</p>',
  '            <p className="text-2xl font-black leading-none text-emerald-800 sm:text-3xl">{activeWeekend.roundsLeft}</p>',
  '            <p className="text-[10px] text-stone-500">',
  "              {activeWeekend.roundsCompleted}/{activeWeekend.roundsScheduled}",
  "            </p>",
  `          ${end}`,
].join("\n");

if (!s.includes(broken)) {
  console.error("broken block not found");
  process.exit(1);
}
s = s.replace(broken, fixed);
if (crlf) s = s.replace(/\n/g, "\r\n");
writeFileSync(path, s);
console.log("banner fixed");
