import type { SimulationResults } from '@/types/simulation';

interface ResultsViewerProps {
  results: SimulationResults;
  faction1: string;
  faction2: string;
}

export default function ResultsViewer({ results, faction1, faction2 }: ResultsViewerProps) {
  const gamesPlayed = results.gamesPlayed || 0;
  const faction1Wins = results.faction1Wins || 0;
  const faction2Wins = results.faction2Wins || 0;
  const faction1WinRate = results.faction1WinRate ?? (gamesPlayed > 0 ? faction1Wins / gamesPlayed : 0);
  const faction2WinRate = results.faction2WinRate ?? (gamesPlayed > 0 ? faction2Wins / gamesPlayed : 0);
  const confidenceInterval95 = results.confidenceInterval95 || null;
  const averageTurns = results.averageTurns || 0;
  const cardStats = results.cardStats || {};
  const detailedStats = results.detailedStats;
  const deckInfo = results.deckInfo;
  const warnings = deckInfo?.warnings || [];

  const f1Color = faction1 === 'phantom' ? 'text-pink-400' : 'text-cyan-400';
  const f2Color = faction2 === 'phantom' ? 'text-pink-400' : 'text-cyan-400';
  const f1Bg = faction1 === 'phantom' ? 'bg-pink-500/20' : 'bg-cyan-500/20';
  const f2Bg = faction2 === 'phantom' ? 'bg-pink-500/20' : 'bg-cyan-500/20';

  const balance = Math.abs(faction1WinRate - 0.5);
  const balanceLabel = balance < 0.05 ? 'Balanced' : balance < 0.1 ? 'Slight edge' : balance < 0.2 ? 'Notable edge' : 'Dominant';
  const balanceColor = balance < 0.05 ? 'text-green-400' : balance < 0.1 ? 'text-yellow-400' : balance < 0.2 ? 'text-orange-400' : 'text-red-400';

  const sortedCards = Object.entries(cardStats).sort((a, b) => (b[1].timesPlayed || 0) - (a[1].timesPlayed || 0));

  return (
    <div className="space-y-6">
      {/* Deck Warnings */}
      {warnings.length > 0 && (
        <div className="card border-yellow-500/20 bg-yellow-500/5">
          <h3 className="text-sm font-semibold text-yellow-400 mb-2">Simulation Notes</h3>
          <ul className="space-y-1">
            {warnings.map((w, i) => (
              <li key={i} className="text-xs text-yellow-300/80">• {w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Win Rate Summary */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Win Rate Summary</h3>
          <span className={`text-sm font-medium ${balanceColor}`}>{balanceLabel}</span>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className={`p-4 rounded-lg ${f1Bg}`}>
            <div className={`text-3xl font-bold ${f1Color}`}>
              {(faction1WinRate * 100).toFixed(1)}%
            </div>
            <div className="text-white capitalize font-medium mt-1">{faction1}</div>
            <div className="text-sm text-gray-400">{faction1Wins.toLocaleString()} wins</div>
          </div>
          <div className={`p-4 rounded-lg ${f2Bg}`}>
            <div className={`text-3xl font-bold ${f2Color}`}>
              {(faction2WinRate * 100).toFixed(1)}%
            </div>
            <div className="text-white capitalize font-medium mt-1">{faction2}</div>
            <div className="text-sm text-gray-400">{faction2Wins.toLocaleString()} wins</div>
          </div>
        </div>

        {/* Win rate bar */}
        <div className="w-full h-3 rounded-full overflow-hidden bg-gray-700 mb-3">
          <div
            className={`h-full ${faction1 === 'phantom' ? 'bg-pink-500' : 'bg-cyan-500'}`}
            style={{ width: `${faction1WinRate * 100}%` }}
          />
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-sm text-gray-400">
          <div>
            <div className="text-white font-medium">{gamesPlayed.toLocaleString()}</div>
            <div>Games played</div>
          </div>
          <div>
            <div className="text-white font-medium">{averageTurns}</div>
            <div>Avg turns</div>
          </div>
          {confidenceInterval95 && (
            <div>
              <div className="text-white font-medium">
                {(confidenceInterval95.lower * 100).toFixed(1)}–{(confidenceInterval95.upper * 100).toFixed(1)}%
              </div>
              <div>95% CI ({faction1})</div>
            </div>
          )}
        </div>
      </div>

      {/* Deck Info */}
      {deckInfo && (
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-3">Deck Composition</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className={`p-3 rounded-lg ${f1Bg}`}>
              <div className={`font-medium capitalize ${f1Color} mb-1`}>{faction1}</div>
              <div className="text-gray-300">{deckInfo.faction1Cards} cards ({deckInfo.faction1UniqueCards} unique)</div>
            </div>
            <div className={`p-3 rounded-lg ${f2Bg}`}>
              <div className={`font-medium capitalize ${f2Color} mb-1`}>{faction2}</div>
              <div className="text-gray-300">{deckInfo.faction2Cards} cards ({deckInfo.faction2UniqueCards} unique)</div>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Stats */}
      {detailedStats && (
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Combat Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <StatBox label="Total Damage" value1={detailedStats.totalDamageDealt?.faction1 || 0} value2={detailedStats.totalDamageDealt?.faction2 || 0} f1Color={f1Color} f2Color={f2Color} faction1={faction1} faction2={faction2} />
            <StatBox label="Damage Blocked" value1={(detailedStats as Record<string, unknown> & { totalDamageBlocked?: { faction1: number; faction2: number } }).totalDamageBlocked?.faction1 || detailedStats.firewallDamageBlocked?.faction1 || 0} value2={(detailedStats as Record<string, unknown> & { totalDamageBlocked?: { faction1: number; faction2: number } }).totalDamageBlocked?.faction2 || detailedStats.firewallDamageBlocked?.faction2 || 0} f1Color={f1Color} f2Color={f2Color} faction1={faction1} faction2={faction2} />
            <StatBox label="Healing" value1={detailedStats.totalHealing?.faction1 || 0} value2={detailedStats.totalHealing?.faction2 || 0} f1Color={f1Color} f2Color={f2Color} faction1={faction1} faction2={faction2} />
            <StatBox label="Firewalls Deployed" value1={detailedStats.firewallsDeployed?.faction1 || 0} value2={detailedStats.firewallsDeployed?.faction2 || 0} f1Color={f1Color} f2Color={f2Color} faction1={faction1} faction2={faction2} />
            <StatBox label="Boosts Applied" value1={detailedStats.boostsApplied?.faction1 || 0} value2={detailedStats.boostsApplied?.faction2 || 0} f1Color={f1Color} f2Color={f2Color} faction1={faction1} faction2={faction2} />
            <StatBox label="Cards Drawn" value1={detailedStats.cardsDrawn?.faction1 || 0} value2={detailedStats.cardsDrawn?.faction2 || 0} f1Color={f1Color} f2Color={f2Color} faction1={faction1} faction2={faction2} />
          </div>
        </div>
      )}

      {/* Card Performance */}
      {sortedCards.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-1">Card Performance</h3>
          <p className="text-xs text-gray-500 mb-4">Sorted by times played across all {gamesPlayed.toLocaleString()} games</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-700">
                  <th className="text-left py-2 pr-4">Card</th>
                  <th className="text-right py-2 pr-3">Total Plays</th>
                  <th className="text-right py-2 pr-3">Avg/Game</th>
                  <th className={`text-right py-2 pr-3 capitalize ${f1Color}`}>{faction1}</th>
                  <th className={`text-right py-2 capitalize ${f2Color}`}>{faction2}</th>
                </tr>
              </thead>
              <tbody>
                {sortedCards.map(([cardName, stats]) => {
                  const total = stats.timesPlayed || 0;
                  const f1Count = stats.byFaction1 || 0;
                  const f2Count = stats.byFaction2 || 0;
                  const avgPerGame = gamesPlayed > 0 ? (total / gamesPlayed).toFixed(2) : '0.00';
                  const f1Pct = total > 0 ? Math.round((f1Count / total) * 100) : 0;
                  const f2Pct = 100 - f1Pct;

                  return (
                    <tr key={cardName} className="border-b border-gray-800 hover:bg-gray-800/30">
                      <td className="py-2 pr-4">
                        <span className="text-white font-medium">{cardName}</span>
                      </td>
                      <td className="text-right pr-3 text-gray-300">{total.toLocaleString()}</td>
                      <td className="text-right pr-3 text-gray-400">{avgPerGame}</td>
                      <td className="text-right pr-3">
                        <span className={f1Color}>{f1Count.toLocaleString()}</span>
                        <span className="text-gray-600 text-xs ml-1">({f1Pct}%)</span>
                      </td>
                      <td className="text-right">
                        <span className={f2Color}>{f2Count.toLocaleString()}</span>
                        <span className="text-gray-600 text-xs ml-1">({f2Pct}%)</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatBox({
  label, value1, value2, f1Color, f2Color, faction1, faction2,
}: {
  label: string; value1: number; value2: number;
  f1Color: string; f2Color: string; faction1: string; faction2: string;
}) {
  const total = value1 + value2;
  const f1Pct = total > 0 ? Math.round((value1 / total) * 100) : 50;

  return (
    <div className="bg-gray-800 rounded-lg p-3">
      <div className="text-gray-400 text-xs mb-2">{label}</div>
      <div className="flex justify-between mb-1.5">
        <span className={`font-medium ${f1Color}`}>{value1.toLocaleString()}</span>
        <span className={`font-medium ${f2Color}`}>{value2.toLocaleString()}</span>
      </div>
      <div className="w-full h-1.5 rounded-full overflow-hidden bg-gray-700">
        <div
          className={faction1 === 'phantom' ? 'h-full bg-pink-500' : 'h-full bg-cyan-500'}
          style={{ width: `${f1Pct}%` }}
        />
      </div>
    </div>
  );
}
