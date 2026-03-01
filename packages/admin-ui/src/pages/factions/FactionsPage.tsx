import { Link } from 'react-router-dom';
import { useFactions } from '@/hooks/useFactions';
import { useCards } from '@/hooks/useCards';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import type { Card } from '@/types/api';

interface Faction {
  id: string;
  name: string;
  description: string;
  color: string;
  starting_hp?: number;
}

export default function FactionsPage() {
  const { data: factions, isLoading: factionsLoading } = useFactions();
  const { data: cardsData, isLoading: cardsLoading } = useCards();
  
  const cards = (cardsData as Card[]) || [];

  if (factionsLoading || cardsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const activeCards = cards.filter((c: Card) => c.status === 'active');
  const counts = activeCards.reduce((acc: Record<string, number>, c: Card) => {
    acc[c.faction] = (acc[c.faction] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Factions</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {(factions || []).map((faction: Faction) => {
          const cardCount = counts[faction.id] || 0;
          const borderColor = faction.id === 'phantom' ? 'border-cyber-pink' : 
                             faction.id === 'sentinel' ? 'border-cyber-cyan' : 'border-gray-500';
          
          return (
            <Link
              key={faction.id}
              to={`/factions/${faction.id}`}
              className={`card border-l-4 ${borderColor} hover:bg-gray-800/50 transition-colors`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-semibold text-white capitalize">{faction.name}</h2>
                  <p className="text-gray-400 mt-1">{faction.description}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">{cardCount}</div>
                  <div className="text-sm text-gray-400">Active Cards</div>
                </div>
              </div>
              <div className="mt-4 flex gap-4 text-sm text-gray-400">
                <span>Starting HP: {faction.starting_hp || 20}</span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Summary */}
      <div className="card">
        <h2 className="text-lg font-semibold text-white mb-4">Card Distribution</h2>
        <div className="grid grid-cols-2 gap-4">
          {(factions || []).map((faction: Faction) => {
            const factionCards = cards.filter((c: Card) => c.faction === faction.id && c.status === 'active');
            const byCategory = factionCards.reduce((acc: Record<string, number>, c: Card) => {
              const cat = (c as unknown as { card_type?: string }).card_type || c.cardType || 'utility';
              acc[cat] = (acc[cat] || 0) + 1;
              return acc;
            }, {});

            return (
              <div key={faction.id} className="p-4 bg-gray-800 rounded-lg">
                <h3 className="font-medium text-white capitalize mb-2">{faction.name}</h3>
                <div className="space-y-1 text-sm">
                  {['attack', 'defense', 'utility'].filter(cat => byCategory[cat]).map(cat => (
                    <div key={cat} className="flex justify-between text-gray-400">
                      <span className="capitalize">{cat}</span>
                      <span>{byCategory[cat]}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
