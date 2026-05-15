"use client";

import { buildTripOverview, formatPosition } from "@/lib/scoring";
import { TRIP_PLAYERS } from "@/lib/trip-roster";

type Team = {
  id: string;
  name: string;
  players: string[];
};

type ScoreRow = {
  player: string;
  front9: number;
  back9: number;
};

type ActiveWeekend = {
  title: string;
  startDate: string;
  endDate: string | null;
  roundsScheduled: number;
  roundsCompleted: number;
  roundsLeft: number;
};

type DashboardOverviewProps = {
  currentUser: { name: string; username: string; handicap: number };
  teams: Team[];
  scoreRows: ScoreRow[];
  handicapsByPlayer: Record<string, number>;
  activeWeekend: ActiveWeekend | null;
};

export function DashboardOverview({
  currentUser,
  teams,
  scoreRows,
  handicapsByPlayer,
  activeWeekend,
}: DashboardOverviewProps) {
  const overview = buildTripOverview({
    scoreRows,
    handicapsByPlayer,
    teams,
    currentUser,
  });

  const { currentPlayer, teamStandings, playerStandings } = overview;
  const scoredPlayers = playerStandings.filter((entry) => entry.hasScores);

  return (
    <section>
      <h2 className="text-lg font-bold text-stone-900">Weekend overview</h2>
      <p className="mt-1 text-sm text-stone-600">
        Net scores use each player&apos;s handicap subtracted from their gross 18-hole total for
        the active weekend.
      </p>

      {activeWeekend ? (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">
              Active weekend
            </p>
            <p className="mt-1 text-base font-bold text-stone-900">{activeWeekend.title}</p>
            <p className="mt-1 text-sm text-stone-600">
              {activeWeekend.startDate}
              {activeWeekend.endDate ? ` – ${activeWeekend.endDate}` : ""}
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

      <article className="mt-5 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-800">
          Your standing
        </p>
        <h3 className="mt-2 text-2xl font-black text-stone-900">{currentUser.name}</h3>

        {currentPlayer?.hasScores ? (
          <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-white/80 bg-white/90 p-3">
              <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                Trip position
              </dt>
              <dd className="mt-1 text-xl font-bold text-emerald-800">
                {formatPosition(currentPlayer.position, TRIP_PLAYERS.length)}
              </dd>
            </div>
            <div className="rounded-xl border border-white/80 bg-white/90 p-3">
              <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                Gross total
              </dt>
              <dd className="mt-1 text-xl font-bold text-stone-900">
                {currentPlayer.grossTotal}
              </dd>
            </div>
            <div className="rounded-xl border border-white/80 bg-white/90 p-3">
              <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                Handicap
              </dt>
              <dd className="mt-1 text-xl font-bold text-stone-900">
                {currentPlayer.handicap}
              </dd>
            </div>
            <div className="rounded-xl border border-white/80 bg-white/90 p-3">
              <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                Net total
              </dt>
              <dd className="mt-1 text-xl font-bold text-emerald-800">
                {currentPlayer.netTotal}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="mt-4 text-sm text-stone-600">
            No scorecard posted yet for your round. Upload scores on the Upload Scorecard tab
            to see your trip position and net total.
          </p>
        )}
      </article>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <article className="rounded-xl border border-stone-200 bg-stone-50 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-700">
            Team scores
          </h3>
          <div className="mt-3 space-y-3">
            {teamStandings.map((team, index) => (
              <div key={team.id} className="rounded-xl border border-stone-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-stone-900">{team.name}</p>
                    <p className="mt-1 text-xs text-stone-600">{team.players.join(" · ")}</p>
                  </div>
                  {team.hasScores && index === 0 ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-800">
                      Leading
                    </span>
                  ) : null}
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-stone-500">Gross</dt>
                    <dd className="font-semibold text-stone-900">
                      {team.hasScores ? team.grossTotal : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-stone-500">Net</dt>
                    <dd className="font-semibold text-emerald-800">
                      {team.hasScores ? team.netTotal : "—"}
                    </dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-xl border border-stone-200 bg-stone-50 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-700">
            Individual standings
          </h3>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-stone-500">
                  <th className="px-2 py-2">#</th>
                  <th className="px-2 py-2">Player</th>
                  <th className="px-2 py-2">Gross</th>
                  <th className="px-2 py-2">Hcp</th>
                  <th className="px-2 py-2">Net</th>
                </tr>
              </thead>
              <tbody>
                {playerStandings.map((row) => {
                  const isCurrentUser =
                    row.player.toLowerCase() === currentUser.name.toLowerCase() ||
                    row.player.toLowerCase() === currentUser.username.toLowerCase();

                  return (
                    <tr
                      key={row.player}
                      className={`border-t border-stone-200 ${
                        isCurrentUser ? "bg-emerald-50/80 font-semibold" : ""
                      }`}
                    >
                      <td className="px-2 py-2 text-stone-600">
                        {row.hasScores ? row.position : "—"}
                      </td>
                      <td className="px-2 py-2 text-stone-900">
                        {row.player}
                        {isCurrentUser ? (
                          <span className="ml-1 text-xs text-emerald-700">(you)</span>
                        ) : null}
                      </td>
                      <td className="px-2 py-2">
                        {row.hasScores ? row.grossTotal : "—"}
                      </td>
                      <td className="px-2 py-2">{row.handicap}</td>
                      <td className="px-2 py-2 text-emerald-800">
                        {row.hasScores ? row.netTotal : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {scoredPlayers.length === 0 ? (
            <p className="mt-3 text-xs text-stone-500">
              Standings update when the latest round is uploaded.
            </p>
          ) : null}
        </article>
      </div>
    </section>
  );
}
