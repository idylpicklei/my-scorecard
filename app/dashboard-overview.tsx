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

type DashboardOverviewProps = {
  currentUser: { name: string; username: string; handicap: number };
  teams: Team[];
  scoreRows: ScoreRow[];
  handicapsByPlayer: Record<string, number>;
};

export function DashboardOverview({
  currentUser,
  teams,
  scoreRows,
  handicapsByPlayer,
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
      <p className="mt-1 hidden text-sm text-stone-600 sm:block">
        Net scores use each player&apos;s handicap subtracted from their gross 18-hole total for
        the active weekend.
      </p>

      <article className="mt-4 border-t border-emerald-200/80 pt-4 sm:mt-5 sm:rounded-2xl sm:border sm:border-emerald-200 sm:bg-gradient-to-br sm:from-emerald-50 sm:to-white sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-800">
          Your standing
        </p>
        <h3 className="mt-2 text-2xl font-black text-stone-900">{currentUser.name}</h3>

        {currentPlayer?.hasScores ? (
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4 sm:gap-4">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                Trip position
              </dt>
              <dd className="mt-1 text-xl font-bold text-emerald-800">
                {formatPosition(currentPlayer.position, TRIP_PLAYERS.length)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                Gross total
              </dt>
              <dd className="mt-1 text-xl font-bold text-stone-900">
                {currentPlayer.grossTotal}
              </dd>
            </div>
            <div className="sm:rounded-xl sm:border sm:border-white/80 sm:bg-white/90 sm:p-3">
              <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                Handicap
              </dt>
              <dd className="mt-1 text-xl font-bold text-stone-900">
                {currentPlayer.handicap}
              </dd>
            </div>
            <div className="sm:rounded-xl sm:border sm:border-white/80 sm:bg-white/90 sm:p-3">
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
            No scorecard posted yet for your round. Once scores are entered, your trip position
            and net total will appear here.
          </p>
        )}
      </article>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <article className="border-t border-stone-200 pt-4 sm:rounded-xl sm:border sm:bg-stone-50 sm:p-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-700">
            Team scores
          </h3>
          <div className="mt-3 divide-y divide-stone-200 sm:space-y-3 sm:divide-none">
            {teamStandings.map((team, index) => (
              <div
                key={team.id}
                className="py-3 first:pt-0 sm:rounded-xl sm:border sm:border-stone-200 sm:bg-white sm:p-4"
              >
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

        <article className="border-t border-stone-200 pt-4 sm:rounded-xl sm:border sm:bg-stone-50 sm:p-4">
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
