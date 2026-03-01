import { useParams, Link } from 'react-router-dom';
import { useFaction, useFactionCards } from '@/hooks/useFactions';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import type { Card } from '@/types/api';

const categoryIcons: Record<string, string> = {
  attack: '⚔️', defense: '🛡️', utility: '🔧',
};

export default function FactionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: faction, isLoading: factionLoading } = useFaction(id);
  const { data: cards = [], isLoading: cardsLoading } = useFactionCards(id);

  if (factionLoading || cardsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!faction) {
    return (
      <div className="card">
        <p className="text-red-400">Faction not found</p>
        <Link to="/factions" className="btn-secondary mt-4">Back to Factions</Link>
      </div>
    );
  }

  const activeCards = cards.filter((c: Card) => c.status === 'active');
  const testingCards = cards.filter((c: Card) => c.status === 'testing');

  const byCategory = activeCards.reduce((acc: Record<string, Card[]>, c: Card) => {
    const cat = (c as unknown as { card_type?: string }).card_type || c.cardType || 'utility';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(c);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/factions" className="text-gray-400 hover:text-white">
          ← Back
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white capitalize">{faction.name}</h1>
          <p className="text-gray-400">{faction.description}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card">
          <div className="text-2xl font-bold text-white">{activeCards.length}</div>
          <div className="text-sm text-gray-400">Active Cards</div>
        </div>
        <div className="card">
          <div className="text-2xl font-bold text-white">{testingCards.length}</div>
          <div className="text-sm text-gray-400">Testing Cards</div>
        </div>
        <div className="card">
          <div className="text-2xl font-bold text-white">{faction.starting_hp || 20}</div>
          <div className="text-sm text-gray-400">Starting HP</div>
        </div>
      </div>

      {/* Active Cards by Category */}
      <div className="card">
        <h2 className="text-lg font-semibold text-white mb-4">Active Cards</h2>
        {Object.keys(byCategory).length === 0 ? (
          <p className="text-gray-400">No active cards</p>
        ) : (
          <div className="space-y-4">
            {['attack', 'defense', 'utility'].filter(cat => byCategory[cat]?.length > 0).map(cat => (
              <div key={cat}>
                <h3 className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                  <span>{categoryIcons[cat] || '🎴'}</span>
                  <span className="capitalize">{cat}</span>
                  <span>({byCategory[cat].length})</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {byCategory[cat].map((card: Card) => (
                    <Link
                      key={card.id}
                      to={`/cards/${card.id}`}
                      className="p-2 bg-gray-800 rounded hover:bg-gray-700 transition-colors"
                    >
                      <div className="font-medium text-white">{card.name}</div>
                      {card.base_value !== null && (
                        <div className="text-xs text-gray-400">Value: {card.base_value}</div>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Testing Cards */}
      {testingCards.length > 0 && (
        <div className="card border-yellow-500/20">
          <h2 className="text-lg font-semibold text-yellow-400 mb-4">Testing Cards</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {testingCards.map((card: Card) => (
              <Link
                key={card.id}
                to={`/cards/${card.id}`}
                className="p-2 bg-gray-800 rounded hover:bg-gray-700 transition-colors"
              >
                <div className="font-medium text-white">{card.name}</div>
                <div className="text-xs text-gray-400 capitalize">{(card as unknown as { card_type?: string }).card_type || card.cardType || 'utility'}</div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
