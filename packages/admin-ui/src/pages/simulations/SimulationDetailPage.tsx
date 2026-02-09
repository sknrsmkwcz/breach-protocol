import { useParams, Link } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useSimulation } from '@/hooks/useSimulations';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { formatDistanceToNow } from 'date-fns';

export default function SimulationDetailPage() {
  const { id } = useParams();
  const { data: sim, isLoading, error } = useSimulation(id);

  if (isLoading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>;

  if (error || !sim) {
    return (
      <div className="card bg-cyber-red/10 border-cyber-red/20">
        <p className="text-cyber-red mb-4">Simulation not found</p>
        <Link to="/simulations" className="btn-primary">Back to Simulations</Link>
      </div>
    );
  }

  const r = sim.results;
  const chartData = r ? [
    { name: sim.config.faction1, value: r.faction1Wins, color: '#ec4899' },
    { name: sim.config.faction2, value: r.faction2Wins, color: '#06b6d4' },
  ] : [];

  const winRate = r ? Math.round((r.faction1Wins / r.gamesPlayed) * 100) : null;
  const isBalanced = winRate !== null && Math.abs(winRate - 50) < 10;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/simulations" className="p-2 hover:bg-gray-800 rounded"><ArrowLeftIcon className="w-5 h-5 text-gray-400" /></Link>
        <div>
          <h1 className="text-2xl font-bold text-white capitalize">{sim.config.faction1} vs {sim.config.faction2}</h1>
          <p className="text-gray-400">{sim.games_total} games • {formatDistanceToNow(new Date(sim.created_at), { addSuffix: true })}</p>
        </div>
      </div>

      {(sim.status === 'running' || sim.status === 'pending') && (
        <div className="card border-cyber-cyan/30">
          <div className="flex justify-between mb-2">
            <span className="text-cyber-cyan">{sim.status === 'pending' ? 'Waiting...' : 'Running...'}</span>
            <span className="text-white">{sim.games_completed} / {sim.games_total}</span>
          </div>
          <div className="h-3 bg-gray-800 rounded-full"><div className="h-full bg-cyber-cyan rounded-full" style={{ width: `${(sim.games_completed / sim.games_total) * 100}%` }} /></div>
        </div>
      )}

      {sim.status === 'failed' && (
        <div className="card bg-cyber-red/10 border-cyber-red/20">
          <h3 className="text-cyber-red font-semibold">Simulation Failed</h3>
          <p className="text-gray-400 mt-2">An error occurred. Try again.</p>
        </div>
      )}

      {sim.status === 'completed' && r && (
        <>
          <div className={`card border ${isBalanced ? 'border-cyber-green/30' : 'border-cyber-yellow/30'}`}>
            <span className="text-2xl mr-3">{isBalanced ? '✅' : '⚠️'}</span>
            <span className={isBalanced ? 'text-cyber-green' : 'text-cyber-yellow'}>
              {isBalanced ? 'Balanced' : 'Imbalanced'} - {Math.abs(winRate! - 50)}% difference
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="font-semibold text-white mb-4">Win Distribution</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                      {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '0.5rem' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card">
              <h3 className="font-semibold text-white mb-4">Statistics</h3>
              <div className="space-y-3">
                <div className="flex justify-between p-3 bg-gray-800/50 rounded-lg"><span className="text-gray-400">Games</span><span className="text-white">{r.gamesPlayed}</span></div>
                <div className="flex justify-between p-3 bg-gray-800/50 rounded-lg"><span className="text-gray-400 capitalize">{sim.config.faction1} Wins</span><span className="text-cyber-pink">{r.faction1Wins} ({((r.faction1Wins / r.gamesPlayed) * 100).toFixed(1)}%)</span></div>
                <div className="flex justify-between p-3 bg-gray-800/50 rounded-lg"><span className="text-gray-400 capitalize">{sim.config.faction2} Wins</span><span className="text-cyber-cyan">{r.faction2Wins} ({((r.faction2Wins / r.gamesPlayed) * 100).toFixed(1)}%)</span></div>
                <div className="flex justify-between p-3 bg-gray-800/50 rounded-lg"><span className="text-gray-400">Avg Turns</span><span className="text-white">{r.averageTurns}</span></div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
