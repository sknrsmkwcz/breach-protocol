import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useCards, useUpdateCardStatus } from '@/hooks/useCards';
import { MagnifyingGlassIcon, PlusIcon, PencilIcon } from '@heroicons/react/24/outline';
import { Switch } from '@headlessui/react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';
import { useToast } from '@/contexts/ToastContext';
import type { CardStatus } from '@/types/api';

const icons: Record<string, string> = { 
  exploit: '⚔️', payload: '📦', zeroday: '💀', siphon: '🔋', 
  firewall: '🛡️', patch: '💊', purge: '💥' 
};

const cardTypes = ['exploit', 'payload', 'zeroday', 'siphon', 'firewall', 'patch', 'purge'];
const factions = ['phantom', 'sentinel', 'neutral'];
const statuses = ['active', 'disabled', 'testing'];

export default function CardsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: cards, isLoading, error } = useCards();
  const updateStatus = useUpdateCardStatus();
  const { showToast } = useToast();
  
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [filterType, setFilterType] = useState(searchParams.get('type') || '');
  const [filterFaction, setFilterFaction] = useState(searchParams.get('faction') || '');
  const [filterStatus, setFilterStatus] = useState(searchParams.get('status') || '');

  const handleStatusToggle = async (id: string, currentStatus: CardStatus, name: string) => {
    const newStatus = currentStatus === 'active' ? 'disabled' : 'active';
    try {
      await updateStatus.mutateAsync({ id, status: newStatus });
      showToast(`${name} ${newStatus === 'active' ? 'enabled' : 'disabled'}`, 'success');
    } catch (err) {
      showToast(`Failed to update ${name}`, 'error');
    }
  };

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
        <p className="text-cyber-red mb-4">Failed to load cards: {error instanceof Error ? error.message : 'Unknown error'}</p>
        <button onClick={() => window.location.reload()} className="btn-primary">Reload</button>
      </div>
    );
  }

  const filtered = (cards || []).filter(c =>
    (!search || c.name.toLowerCase().includes(search.toLowerCase()) || c.description?.toLowerCase().includes(search.toLowerCase())) &&
    (!filterType || c.type === filterType) &&
    (!filterFaction || c.faction === filterFaction) &&
    (!filterStatus || c.status === filterStatus)
  );

  // Count cards per filter for badges
  const typeCounts = (cards || []).reduce((acc, c) => { acc[c.type] = (acc[c.type] || 0) + 1; return acc; }, {} as Record<string, number>);
  const factionCounts = (cards || []).reduce((acc, c) => { acc[c.faction] = (acc[c.faction] || 0) + 1; return acc; }, {} as Record<string, number>);
  const statusCounts = (cards || []).reduce((acc, c) => { acc[c.status] = (acc[c.status] || 0) + 1; return acc; }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Cards</h1>
          <p className="text-gray-400 mt-1">{cards?.length || 0} cards total</p>
        </div>
        <Link to="/cards/new" className="btn-primary flex items-center gap-2">
          <PlusIcon className="w-5 h-5" />New Card
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input 
            placeholder="Search by name or description..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            className="input pl-10" 
          />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="input w-auto">
          <option value="">All Types ({cards?.length || 0})</option>
          {cardTypes.map(t => <option key={t} value={t}>{t} ({typeCounts[t] || 0})</option>)}
        </select>
        <select value={filterFaction} onChange={e => setFilterFaction(e.target.value)} className="input w-auto">
          <option value="">All Factions</option>
          {factions.map(f => <option key={f} value={f}>{f} ({factionCounts[f] || 0})</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input w-auto">
          <option value="">All Statuses</option>
          {statuses.map(s => <option key={s} value={s}>{s} ({statusCounts[s] || 0})</option>)}
        </select>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <EmptyState
          icon="🎴"
          title={cards?.length === 0 ? "No cards yet" : "No cards match filters"}
          description={cards?.length === 0 
            ? "Create your first card to get started" 
            : "Try adjusting your search or filter criteria"}
          actionLabel={cards?.length === 0 ? "Create First Card" : undefined}
          actionHref={cards?.length === 0 ? "/cards/new" : undefined}
        >
          {cards?.length !== 0 && (
            <button 
              onClick={() => { setSearch(''); setFilterType(''); setFilterFaction(''); setFilterStatus(''); }}
              className="btn-secondary mt-4"
            >
              Clear Filters
            </button>
          )}
        </EmptyState>
      ) : (
        <>
          <p className="text-sm text-gray-400">
            Showing {filtered.length} of {cards?.length} cards
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(card => (
              <div 
                key={card.id} 
                className={`card border-l-4 ${
                  card.faction === 'phantom' ? 'border-cyber-pink' : 
                  card.faction === 'sentinel' ? 'border-cyber-cyan' : 
                  'border-gray-500'
                } ${card.status === 'disabled' ? 'opacity-60' : ''}`}
              >
                <div className="flex justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{icons[card.type] || '🎴'}</span>
                      <h3 className="font-semibold text-white truncate">{card.name}</h3>
                    </div>
                    <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                      {card.description || 'No description'}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <span className="badge bg-gray-700 text-gray-300">{card.type}</span>
                      <span className="badge bg-gray-700 text-gray-300">{card.faction}</span>
                      {card.base_value !== null && (
                        <span className="badge bg-gray-700 text-gray-300">Val: {card.base_value}</span>
                      )}
                      <span className={`badge ${
                        card.status === 'active' ? 'bg-cyber-green/20 text-cyber-green' :
                        card.status === 'testing' ? 'bg-cyber-yellow/20 text-cyber-yellow' :
                        'bg-gray-600 text-gray-400'
                      }`}>
                        {card.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-3 ml-3">
                    <Link 
                      to={`/cards/${card.id}`} 
                      className="p-2 hover:bg-gray-700 rounded transition-colors"
                      title="Edit card"
                    >
                      <PencilIcon className="w-4 h-4 text-gray-400" />
                    </Link>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={card.status === 'active'}
                        onChange={() => handleStatusToggle(card.id, card.status, card.name)}
                        disabled={updateStatus.isPending}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          card.status === 'active' ? 'bg-cyber-green' : 'bg-gray-700'
                        } ${updateStatus.isPending ? 'opacity-50' : ''}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                          card.status === 'active' ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </Switch>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
