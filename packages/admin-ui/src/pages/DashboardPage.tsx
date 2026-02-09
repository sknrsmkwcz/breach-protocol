import { CreditCardIcon, CheckCircleIcon, BeakerIcon, ArrowPathIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useDashboardStats } from '@/hooks/useDashboard';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';

export default function DashboardPage() {
  const { data, isLoading, error, refetch, isFetching } = useDashboardStats();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card bg-cyber-red/10 border-cyber-red/20">
        <div className="flex items-center gap-3 mb-4">
          <ExclamationTriangleIcon className="w-6 h-6 text-cyber-red" />
          <h2 className="text-lg font-semibold text-white">Failed to load dashboard</h2>
        </div>
        <p className="text-gray-400 mb-4">{error instanceof Error ? error.message : 'Unknown error'}</p>
        <button onClick={() => refetch()} className="btn-primary">Try Again</button>
      </div>
    );
  }

  const testingCards = data?.totalCards ? data.totalCards - data.activeCards : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 mt-1">System overview and quick actions</p>
        </div>
        <button 
          onClick={() => refetch()} 
          disabled={isFetching}
          className="btn-ghost flex items-center gap-2"
        >
          <ArrowPathIcon className={`w-5 h-5 ${isFetching ? 'animate-spin' : ''}`} />
          {isFetching ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to="/cards" className="card hover:border-cyber-purple/50 transition-colors">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-400">Total Cards</p>
              <p className="text-3xl font-bold text-white mt-1">{data?.totalCards ?? 0}</p>
            </div>
            <div className="p-3 rounded-lg bg-cyber-purple/20">
              <CreditCardIcon className="w-6 h-6 text-cyber-purple" />
            </div>
          </div>
        </Link>

        <Link to="/cards?status=active" className="card hover:border-cyber-green/50 transition-colors">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-400">Active Cards</p>
              <p className="text-3xl font-bold text-white mt-1">{data?.activeCards ?? 0}</p>
            </div>
            <div className="p-3 rounded-lg bg-cyber-green/20">
              <CheckCircleIcon className="w-6 h-6 text-cyber-green" />
            </div>
          </div>
        </Link>

        {testingCards > 0 && (
          <Link to="/cards?status=testing" className="card hover:border-cyber-yellow/50 transition-colors border-cyber-yellow/30">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-cyber-yellow">Needs Review</p>
                <p className="text-3xl font-bold text-white mt-1">{testingCards}</p>
              </div>
              <div className="p-3 rounded-lg bg-cyber-yellow/20">
                <ExclamationTriangleIcon className="w-6 h-6 text-cyber-yellow" />
              </div>
            </div>
          </Link>
        )}

        <Link to="/simulations" className="card hover:border-cyber-cyan/50 transition-colors">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-400">Simulations</p>
              <p className="text-3xl font-bold text-white mt-1">{data?.totalSimulations ?? 0}</p>
            </div>
            <div className="p-3 rounded-lg bg-cyber-cyan/20">
              <BeakerIcon className="w-6 h-6 text-cyber-cyan" />
            </div>
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Simulations */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Recent Simulations</h3>
            <Link to="/simulations" className="text-sm text-cyber-purple hover:underline">View all</Link>
          </div>
          
          {!data?.recentSimulations?.length ? (
            <EmptyState
              icon="🧪"
              title="No simulations yet"
              description="Run a simulation to test game balance between factions"
              actionLabel="Run Simulation"
              actionHref="/simulations"
            />
          ) : (
            <div className="space-y-2">
              {data.recentSimulations.map(sim => {
                const winRate = sim.results 
                  ? Math.round((sim.results.faction1Wins / sim.results.gamesPlayed) * 100)
                  : null;
                
                return (
                  <Link 
                    key={sim.id} 
                    to={`/simulations/${sim.id}`} 
                    className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    <div>
                      <span className="text-white font-medium capitalize">
                        {sim.config.faction1} vs {sim.config.faction2}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        {sim.games_completed}/{sim.games_total} games • {formatDistanceToNow(new Date(sim.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="text-right">
                      {sim.status === 'completed' && winRate !== null && (
                        <span className={`text-sm font-medium ${
                          Math.abs(winRate - 50) < 10 ? 'text-cyber-green' : 'text-cyber-yellow'
                        }`}>
                          {winRate}% - {100 - winRate}%
                        </span>
                      )}
                      {sim.status === 'running' && (
                        <span className="badge bg-cyber-cyan/20 text-cyber-cyan">Running</span>
                      )}
                      {sim.status === 'pending' && (
                        <span className="badge bg-gray-700 text-gray-300">Pending</span>
                      )}
                      {sim.status === 'failed' && (
                        <span className="badge bg-cyber-red/20 text-cyber-red">Failed</span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Link
              to="/cards/new"
              className="flex items-center gap-4 p-4 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors"
            >
              <div className="p-3 rounded-lg bg-cyber-purple/20">
                <CreditCardIcon className="w-6 h-6 text-cyber-purple" />
              </div>
              <div>
                <p className="font-medium text-white">Create New Card</p>
                <p className="text-sm text-gray-400">Add a new card to the game</p>
              </div>
            </Link>
            
            <Link
              to="/simulations"
              className="flex items-center gap-4 p-4 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors"
            >
              <div className="p-3 rounded-lg bg-cyber-cyan/20">
                <BeakerIcon className="w-6 h-6 text-cyber-cyan" />
              </div>
              <div>
                <p className="font-medium text-white">Run Balance Test</p>
                <p className="text-sm text-gray-400">Simulate games to test faction balance</p>
              </div>
            </Link>

            <Link
              to="/factions"
              className="flex items-center gap-4 p-4 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors"
            >
              <div className="p-3 rounded-lg bg-cyber-pink/20">
                <CheckCircleIcon className="w-6 h-6 text-cyber-pink" />
              </div>
              <div>
                <p className="font-medium text-white">Review Factions</p>
                <p className="text-sm text-gray-400">Check card distribution per faction</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
