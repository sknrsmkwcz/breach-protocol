import { useParams, Link } from 'react-router-dom';
import { ArrowLeftIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useFactionCards } from '@/hooks/useFactions';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';

const typeIcons: Record<string, string> = { 
  exploit: '⚔️', payload: '📦', zeroday: '💀', siphon: '🔋', 
  firewall: '🛡️', patch: '💊', purge: '💥' 
};

export default function FactionDetailPage() {
  const { id } = useParams();
  const { data, isLoading, error } = useFactionCards(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="card bg-cyber-red/10 border-cyber-red/20">
        <p className="text-cyber-red mb-4">Failed to load faction details</p>
        <Link to="/factions" className="btn-primary">Back to Factions</Link>
      </div>
    );
  }

  const { faction, cards } = data;
  const isPhantom = faction.id === 'phantom';
  
  const activeCards = cards.filter(c => c.status === 'active');
  const testingCards = cards.filter(c => c.status === 'testing');

  const byType = activeCards.reduce((acc, c) => { 
    acc[c.type] = [...(acc[c.type] || []), c]; 
    return acc; 
  }, {} as Record<string, typeof cards>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/factions" className="p-2 hover:bg-gray-800 rounded transition-colors">
            <ArrowLeftIcon className="w-5 h-5 text-gray-400" />
          </Link>
          <div>
            <h1 className={`text-2xl font-bold ${isPhantom ? 'text-cyber-pink' : 'text-cyber-cyan'}`}>
              {faction.name}
            </h1>
            <p className="text-gray-400">{faction.description}</p>
          </div>
        </div>
        <Link to={`/cards/new`} className="btn-primary flex items-center gap-2">
          <PlusIcon className="w-5 h-5" />Add Card
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-sm text-gray-500">Starting HP</p>
          <p className={`text-2xl font-bold ${isPhantom ? 'text-cyber-pink' : 'text-cyber-cyan'}`}>
            {faction.starting_hp}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Active Cards</p>
          <p className="text-2xl font-bold text-cyber-green">{activeCards.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Testing</p>
          <p className="text-2xl font-bold text-cyber-yellow">{testingCards.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Card Types</p>
          <p className="text-2xl font-bold text-gray-400">{Object.keys(byType).length}</p>
        </div>
      </div>

      {activeCards.length === 0 ? (
        <EmptyState
          icon="🎴"
          title="No active cards"
          description={`${faction.name} has no active cards. Add cards to make this faction playable.`}
          actionLabel="Create Card"
          actionHref="/cards/new"
        />
      ) : (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-white">Active Cards by Type</h2>
          
          {Object.entries(byType).map(([type, typeCards]) => (
            <div key={type} className="card">
              <h3 className="font-semibold text-white capitalize mb-4 flex items-center gap-2">
                <span className="text-xl">{typeIcons[type]}</span>
                {type} ({typeCards.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {typeCards.map(card => (
                  <Link 
                    key={card.id} 
                    to={`/cards/${card.id}`}
                    className="p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    <p className="font-medium text-white">{card.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{card.description || 'No description'}</p>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {testingCards.length > 0 && (
        <div className="card border-cyber-yellow/30">
          <h3 className="font-semibold text-cyber-yellow mb-4">Cards in Testing ({testingCards.length})</h3>
          <div className="flex flex-wrap gap-2">
            {testingCards.map(card => (
              <Link 
                key={card.id} 
                to={`/cards/${card.id}`}
                className="px-3 py-2 bg-cyber-yellow/10 rounded-lg text-sm text-white hover:bg-cyber-yellow/20"
              >
                {typeIcons[card.type]} {card.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
