"use client";

import { useEffect, useMemo, useState } from "react";
import { handicapStrokesOnHole, scoreToPar } from "@/lib/golf-course";

export type ScorecardEntryPlayer = {
  playerName: string;
  holes: number[];
};

export type CourseLayout = {
  holePars: number[];
  strokeIndexes: number[];
};

type ScorecardEntryProps = {
  players: ScorecardEntryPlayer[];
  onChange: (players: ScorecardEntryPlayer[]) => void;
  courseLayout?: CourseLayout | null;
  playerHandicaps?: Record<string, number>;
};

function lookupHandicap(playerName: string, handicaps?: Record<string, number>) {
  if (!handicaps) {
    return 0;
  }
  const key = playerName.trim().toLowerCase();
  if (key in handicaps) {
    return handicaps[key];
  }
  const match = Object.entries(handicaps).find(
    ([name]) => name.toLowerCase() === key,
  );
  return match?.[1] ?? 0;
}

const QUICK_SCORES = [2, 3, 4, 5, 6, 7, 8, 9] as const;
const MIN_SCORE = 1;
const MAX_SCORE = 15;

function sumHoles(holes: number[], start: number, count: number) {
  return holes.slice(start, start + count).reduce((total, score) => total + (score > 0 ? score : 0), 0);
}

function firstOpenHole(holes: number[]) {
  const index = holes.findIndex((score) => score <= 0);
  return index === -1 ? 17 : index;
}

function nineLabel(index: number) {
  return index < 9 ? "Front 9" : "Back 9";
}

export function ScorecardEntry({
  players,
  onChange,
  courseLayout,
  playerHandicaps,
}: ScorecardEntryProps) {
  const [activePlayerIndex, setActivePlayerIndex] = useState(0);
  const [activeHole, setActiveHole] = useState(0);

  const safePlayerIndex = Math.min(activePlayerIndex, Math.max(players.length - 1, 0));
  const activePlayer = players[safePlayerIndex];

  useEffect(() => {
    if (activePlayerIndex !== safePlayerIndex) {
      setActivePlayerIndex(safePlayerIndex);
    }
  }, [activePlayerIndex, safePlayerIndex]);

  useEffect(() => {
    const player = players[safePlayerIndex];
    if (!player) {
      return;
    }
    setActiveHole(firstOpenHole(player.holes));
    // Only jump holes when switching players, not on each score tap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safePlayerIndex]);

  const frontTotal = useMemo(
    () => (activePlayer ? sumHoles(activePlayer.holes, 0, 9) : 0),
    [activePlayer],
  );
  const backTotal = useMemo(
    () => (activePlayer ? sumHoles(activePlayer.holes, 9, 9) : 0),
    [activePlayer],
  );
  const roundTotal = frontTotal + backTotal;

  function updatePlayers(next: ScorecardEntryPlayer[]) {
    onChange(next);
  }

  function updatePlayer(playerIndex: number, patch: Partial<ScorecardEntryPlayer>) {
    updatePlayers(
      players.map((player, index) =>
        index === playerIndex ? { ...player, ...patch } : player,
      ),
    );
  }

  function setHoleScore(playerIndex: number, holeIndex: number, score: number, advance = true) {
    const clamped = Math.min(MAX_SCORE, Math.max(MIN_SCORE, Math.round(score)));
    const holes = [...players[playerIndex].holes];
    holes[holeIndex] = clamped;
    updatePlayer(playerIndex, { holes });

    if (advance && holeIndex < 17) {
      setActiveHole(holeIndex + 1);
    }
  }

  function adjustActiveScore(delta: number) {
    if (!activePlayer) {
      return;
    }
    const defaultPar = courseLayout?.holePars[activeHole] ?? 4;
    const current = activePlayer.holes[activeHole] || defaultPar;
    setHoleScore(safePlayerIndex, activeHole, current + delta, false);
  }

  if (!activePlayer) {
    return null;
  }

  const currentScore = activePlayer.holes[activeHole];
  const filledCount = activePlayer.holes.filter((score) => score > 0).length;
  const holePar = courseLayout?.holePars[activeHole] ?? 0;
  const strokeIndex = courseLayout?.strokeIndexes[activeHole] ?? 0;
  const playingHandicap = Math.round(lookupHandicap(activePlayer.playerName, playerHandicaps));
  const strokesReceived =
    strokeIndex > 0 ? handicapStrokesOnHole(playingHandicap, strokeIndex) : 0;
  const toPar = holePar > 0 ? scoreToPar(currentScore, holePar) : null;

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {players.map((player, index) => {
          const isActive = index === safePlayerIndex;
          const done = player.holes.every((score) => score > 0);

          return (
            <button
              key={index}
              type="button"
              onClick={() => setActivePlayerIndex(index)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                isActive
                  ? "border-emerald-700 bg-emerald-700 text-white"
                  : done
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                    : "border-stone-300 bg-white text-stone-700"
              }`}
            >
              {player.playerName.trim() || `Player ${index + 1}`}
              {done ? " ✓" : ""}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => {
            updatePlayers([...players, { playerName: "", holes: Array(18).fill(0) }]);
            setActivePlayerIndex(players.length);
            setActiveHole(0);
          }}
          className="shrink-0 rounded-full border border-dashed border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-600"
        >
          + Add
        </button>
      </div>

      <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
        <label className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
          Player name
        </label>
        <input
          type="text"
          value={activePlayer.playerName}
          onChange={(event) => updatePlayer(safePlayerIndex, { playerName: event.target.value })}
          placeholder="Player name"
          className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-900 outline-none focus:border-emerald-700"
        />
      </div>

      <div className="rounded-2xl border border-emerald-200 bg-gradient-to-b from-emerald-50 to-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-800">
              {nineLabel(activeHole)}
            </p>
            <p className="text-2xl font-black text-stone-900">Hole {activeHole + 1}</p>
            {holePar > 0 ? (
              <p className="mt-0.5 text-sm font-semibold text-stone-700">
                Par {holePar}
                {strokesReceived > 0
                  ? ` · ${strokesReceived} stroke${strokesReceived === 1 ? "" : "s"}`
                  : ""}
              </p>
            ) : null}
            <p className="mt-1 text-xs text-stone-600">
              {filledCount}/18 logged · Tap a score to jump ahead
            </p>
          </div>
          <div className="text-right text-xs text-stone-600">
            <p>Out: {frontTotal || "—"}</p>
            <p>In: {backTotal || "—"}</p>
            <p className="font-semibold text-stone-900">Total: {roundTotal || "—"}</p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => adjustActiveScore(-1)}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-stone-300 bg-white text-xl font-bold text-stone-700 active:bg-stone-100"
            aria-label="Decrease score"
          >
            −
          </button>
          <div className="min-w-[4.5rem] text-center">
            <span className="text-4xl font-black tabular-nums text-emerald-800">
              {currentScore > 0 ? currentScore : "—"}
            </span>
            {toPar ? (
              <p className="mt-0.5 text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
                {toPar} to par
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => adjustActiveScore(1)}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-stone-300 bg-white text-xl font-bold text-stone-700 active:bg-stone-100"
            aria-label="Increase score"
          >
            +
          </button>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-8">
          {QUICK_SCORES.map((score) => {
            const isPar = holePar > 0 && score === holePar;
            return (
              <button
                key={score}
                type="button"
                onClick={() => setHoleScore(safePlayerIndex, activeHole, score)}
                className={`rounded-xl py-3 text-lg font-bold transition active:scale-95 ${
                  currentScore === score
                    ? "bg-emerald-700 text-white shadow-sm"
                    : isPar
                      ? "border-2 border-emerald-500 bg-emerald-50 text-emerald-900"
                      : "border border-stone-200 bg-white text-stone-900 hover:border-emerald-600"
                }`}
              >
                {score}
                {isPar ? (
                  <span className="mt-0.5 block text-[10px] font-semibold uppercase">Par</span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            disabled={activeHole === 0}
            onClick={() => setActiveHole((hole) => Math.max(0, hole - 1))}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-700 disabled:opacity-40"
          >
            ← Prev hole
          </button>
          <button
            type="button"
            onClick={() => setActiveHole(firstOpenHole(activePlayer.holes))}
            className="rounded-lg px-2 py-2 text-xs font-semibold text-emerald-800"
          >
            Next open
          </button>
          <button
            type="button"
            disabled={activeHole === 17}
            onClick={() => setActiveHole((hole) => Math.min(17, hole + 1))}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-700 disabled:opacity-40"
          >
            Next hole →
          </button>
        </div>

        <div className="mt-4 grid grid-cols-9 gap-1">
          {activePlayer.holes.map((score, holeIndex) => {
            const isActive = holeIndex === activeHole;
            const par = courseLayout?.holePars[holeIndex] ?? 0;
            const index = courseLayout?.strokeIndexes[holeIndex] ?? 0;
            const receivesStroke =
              index > 0 &&
              handicapStrokesOnHole(playingHandicap, index) > 0;

            return (
              <button
                key={holeIndex}
                type="button"
                onClick={() => setActiveHole(holeIndex)}
                className={`rounded-md py-1.5 text-center text-[11px] font-semibold tabular-nums transition ${
                  isActive
                    ? "bg-emerald-700 text-white ring-2 ring-emerald-300"
                    : score > 0
                      ? "bg-emerald-100 text-emerald-900"
                      : "bg-white text-stone-400 ring-1 ring-stone-200"
                }`}
                title={
                  par > 0
                    ? `Hole ${holeIndex + 1} · Par ${par}${receivesStroke ? " · Stroke hole" : ""}`
                    : `Hole ${holeIndex + 1}`
                }
              >
                <span className="block text-[9px] font-medium opacity-80">
                  {holeIndex + 1}
                  {receivesStroke ? "•" : ""}
                </span>
                {par > 0 ? (
                  <span className="block text-[8px] font-medium opacity-70">p{par}</span>
                ) : null}
                {score > 0 ? score : "·"}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
