import type { SimulationResults } from '@/types/simulation';

interface ResultsViewerProps {
  results: SimulationResults;
  faction1: string;
  faction2: string;
}

export default function ResultsViewer({ results, faction1, faction2 }: ResultsViewerProps) {
  // Handle potentially missing or differently named fields
  const gamesPlayed = results.gamesPlayed || 0;
  const faction1Wins = results.faction1Wins || 0;
  const faction2Wins = results.faction2Wins || 0;
  const faction1WinRate = results.faction1WinRate ?? (gamesPlayed > 0 ? faction1Wins / gamesPlayed : 0);
  const faction2WinRate = results.faction2WinRate ?? (gamesPlayed > 0 ? faction2Wins / gamesPlayed : 0);
  const confidenceInterval95 = results.confidenceInterval95 || { lower: 0, upper: 1 };
  const averageTurns = results.averageTurns || 0;
  const cardStats = results.cardStats || {};
  const detailedStats = results.detailedStats || {
    totalDamageDealt: { faction1: 0, faction2: 0 },
    totalDamageBlocked: { faction1: 0, faction2: 0 },
    totalHealing: { faction1: 0, faction2: 0 },
    firewallsDeployed: { faction1: 0, faction2: 0 },
    boostsApplied: { faction1: 0, faction2: 0 },
  };

  const warnings = results.deckInfo?.warnings || [];

  return (
    <div className="space-y-6">
      {/* Deck Warnings */}
      {warnings.length > 0 && (
        <div className="card border-yellow-500/20 bg-yellow-500/5">
          <h3 className="text-sm font-semibold text-yellow-400 mb-2">Deck Warnings</h3>
          <ul className="space-y-1">
            {warnings.map((w, i) => (
              <li key={i} className="text-xs text-yellow-300/80">• {w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Win Rate Summary */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">Win Rate Summary</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className={`p-4 rounded-lg ${faction1 === 'phantom' ? 'bg-pink-500/20' : 'bg-cyan-500/20'}`}>
            <div className="text-2xl font-bold text-white">
              {(faction1WinRate * 100).toFixed(1)}%
            </div>
            <div className="text-sm text-gray-400 capitalize">{faction1}</div>
            <div className="text-sm text-gray-500">{faction1Wins} wins</div>
          </div>
          <div className={`p-4 rounded-lg ${faction2 === 'phantom' ? 'bg-pink-500/20' : 'bg-cyan-500/20'}`}>
            <div className="text-2xl font-bold text-white">
              {(faction2WinRate * 100).toFixed(1)}%
            </div>
            <div className="text-sm text-gray-400 capitalize">{faction2}</div>
            <div className="text-sm text-gray-500">{faction2Wins} wins</div>
          </div>
        </div>
        {confidenceInterval95 && (
          <div className="mt-4 text-sm text-gray-400">
            95% Confidence Interval: [{(confidenceInterval95.lower * 100).toFixed(1)}%, {(confidenceInterval95.upper * 100).toFixed(1)}%]
          </div>
        )}
        <div className="text-sm text-gray-500">
          Based on {gamesPlayed.toLocaleString()} games • Avg {averageTurns} turns
        </div>
      </div>

      {/* Detailed Stats */}
      {detailedStats && (
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Detailed Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <StatBox
              label="Total Damage"
              value1={detailedStats.totalDamageDealt?.faction1 || 0}
              value2={detailedStats.totalDamageDealt?.faction2 || 0}
              faction1={faction1}
              faction2={faction2}
            />
            <StatBox
              label="Damage Blocked"
              value1={detailedStats.totalDamageBlocked?.faction1 || 0}
              value2={detailedStats.totalDamageBlocked?.faction2 || 0}
              faction1={faction1}
              faction2={faction2}
            />
            <StatBox
              label="Healing"
              value1={detailedStats.totalHealing?.faction1 || 0}
              value2={detailedStats.totalHealing?.faction2 || 0}
              faction1={faction1}
              faction2={faction2}
            />
            <StatBox
              label="Firewalls Deployed"
              value1={detailedStats.firewallsDeployed?.faction1 || 0}
              value2={detailedStats.firewallsDeployed?.faction2 || 0}
              faction1={faction1}
              faction2={faction2}
            />
            <StatBox
              label="Boosts Applied"
              value1={detailedStats.boostsApplied?.faction1 || 0}
              value2={detailedStats.boostsApplied?.faction2 || 0}
              faction1={faction1}
              faction2={faction2}
            />
          </div>
        </div>
      )}

      {/* Card Performance */}
      {Object.keys(cardStats).length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Card Performance</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-700">
                  <th className="text-left py-2">Card</th>
                  <th className="text-right py-2">Times Played</th>
                  <th className="text-right py-2 capitalize">{faction1}</th>
                  <th className="text-right py-2 capitalize">{faction2}</th>
                  <th className="text-right py-2">Damage</th>
                  <th className="text-right py-2">Blocked</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(cardStats)
                  .sort((a, b) => (b[1].timesPlayed || 0) - (a[1].timesPlayed || 0))
                  .map(([cardType, stats]) => (
                    <tr key={cardType} className="border-b border-gray-800">
                      <td className="py-2 capitalize">{cardType}</td>
                      <td className="text-right text-gray-300">{(stats.timesPlayed || 0).toLocaleString()}</td>
                      <td className="text-right text-gray-400">{(stats.byFaction1 || 0).toLocaleString()}</td>
                      <td className="text-right text-gray-400">{(stats.byFaction2 || 0).toLocaleString()}</td>
                      <td className="text-right text-red-400">{(stats.totalDamageDealt || 0).toLocaleString()}</td>
                      <td className="text-right text-cyan-400">{(stats.totalDamageBlocked || 0).toLocaleString()}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatBox({
  label,
  value1,
  value2,
  faction1,
  faction2,
}: {
  label: string;
  value1: number;
  value2: number;
  faction1: string;
  faction2: string;
}) {
  return (
    <div className="bg-gray-800 rounded-lg p-3">
      <div className="text-gray-400 text-xs mb-1">{label}</div>
      <div className="flex justify-between">
        <span className={faction1 === 'phantom' ? 'text-pink-400' : 'text-cyan-400'}>
          {value1.toLocaleString()}
        </span>
        <span className={faction2 === 'phantom' ? 'text-pink-400' : 'text-cyan-400'}>
          {value2.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
