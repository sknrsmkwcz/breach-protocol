import { Link } from 'react-router-dom';
import { useFactions } from '@/hooks/useFactions';
import { useCards } from '@/hooks/useCards';
import { UserGroupIcon, ArrowRightIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from '@/components/common/LoadingSpinner';

export default function FactionsPage() {
  const { data: factions, isLoading: factionsLoading, error: factionsError } = useFactions();
  const { data: cards, isLoading: cardsLoading } = useCards();

  const isLoading = factionsLoading || cardsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (factionsError) {
    return (
      <div className="card bg-cyber-red/10 border-cyber-red/20">
        <p className="text-cyber-red">Failed to load factions</p>
      </div>
    );
  }

  const activeCards = (cards || []).filter(c => c.status === 'active');
  const counts = activeCards.reduce((acc, c) => { 
    acc[c.faction] = (acc[c.faction] || 0) + 1; 
    return acc; 
  }, {} as Record<string, number>);

  const phantomCount = counts['phantom'] || 0;
  const sentinelCount = counts['sentinel'] || 0;
  const imbalance = Math.abs(phantomCount - sentinelCount);
  const isImbalanced = imbalance > 3;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Factions</h1>
        <p className="text-gray-400 mt-1">Manage faction card distribution</p>
      </div>

      {isImbalanced && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-cyber-yellow/10 border border-cyber-yellow/30">
          <ExclamationTriangleIcon className="w-6 h-6 text-cyber-yellow flex-shrink-0" />
          <div>
            <p className="font-medium text-cyber-yellow">Card Imbalance Detected</p>
            <p className="text-sm text-gray-400">
              Phantom has {phantomCount} active cards, Sentinel has {sentinelCount}. 
              Consider adding {imbalance} cards to {phantomCount < sentinelCount ? 'Phantom' : 'Sentinel'}.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {factions?.map(faction => {
          const cardCount = counts[faction.id] || 0;
          const isPhantom = faction.id === 'phantom';
          
          return (
            <Link 
              key={faction.id} 
              to={`/factions/${faction.id}`} 
              className={`card border hover:scale-[1.02] transition-all group ${
                isPhantom ? 'border-cyber-pink/30 hover:border-cyber-pink' : 'border-cyber-cyan/30 hover:border-cyber-cyan'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${isPhantom ? 'bg-cyber-pink/20' : 'bg-cyber-cyan/20'}`}>
                    <UserGroupIcon className={`w-8 h-8 ${isPhantom ? 'text-cyber-pink' : 'text-cyber-cyan'}`} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">{faction.name}</h2>
                    <p className="text-gray-400 text-sm">{faction.description}</p>
                  </div>
                </div>
                <ArrowRightIcon className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
              </div>

              <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-gray-700">
                <div>
                  <p className="text-sm text-gray-500">Starting HP</p>
                  <p className={`text-2xl font-bold ${isPhantom ? 'text-cyber-pink' : 'text-cyber-cyan'}`}>
                    {faction.starting_hp}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Active Cards</p>
                  <p className={`text-2xl font-bold ${isPhantom ? 'text-cyber-pink' : 'text-cyber-cyan'}`}>
                    {cardCount}
                  </p>
                </div>
              </div>

              {cardCount === 0 && (
                <div className="mt-4 p-3 rounded-lg bg-cyber-yellow/10 border border-cyber-yellow/30">
                  <p className="text-sm text-cyber-yellow">⚠️ No active cards - faction unplayable</p>
                </div>
              )}
            </Link>
          );
        })}
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">Card Distribution</h3>
        <div className="space-y-4">
          {factions?.map(faction => {
            const count = counts[faction.id] || 0;
            const maxCount = Math.max(phantomCount, sentinelCount, 1);
            const percentage = (count / maxCount) * 100;
            const isPhantom = faction.id === 'phantom';
            
            return (
              <div key={faction.id}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">{faction.name}</span>
                  <span className="text-white">{count} active cards</span>
                </div>
                <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${isPhantom ? 'bg-cyber-pink' : 'bg-cyber-cyan'}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
