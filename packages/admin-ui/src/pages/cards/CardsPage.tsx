import { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useCards, useUpdateCardStatus, useDuplicateCard, useDeleteCard } from '@/hooks/useCards';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  PencilIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { Switch } from '@headlessui/react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';
import { useToast } from '@/contexts/ToastContext';
import type { Card, CardStatus } from '@/types/api';

const icons: Record<string, string> = {
  exploit: '⚔️', payload: '📦', zeroday: '💀', siphon: '🔋',
  firewall: '🛡️', patch: '💊', purge: '💥',
  // Card type icons
  attack: '⚔️', defense: '🛡️', utility: '🔧'
};

const factionColors: Record<string, string> = {
  phantom: 'border-pink-500',
  sentinel: 'border-cyan-500',
  neutral: 'border-gray-500',
};

const cardTypeOrder = ['attack', 'defense', 'utility'];
const factions = ['phantom', 'sentinel', 'neutral'];
const statuses: CardStatus[] = ['active', 'disabled', 'testing'];

// Group cards: Faction → CardType (attack/defense/utility) → CardName
interface CardGroup {
  name: string;
  type: string;
  cardType: string;
  baseValue: number | null;
  description: string | null;
  cards: Card[];
  activeCount: number;
}

interface CardTypeGroup {
  cardType: string;
  cardGroups: CardGroup[];
  activeCount: number;
  totalCount: number;
}

interface FactionGroup {
  faction: string;
  cardTypeGroups: CardTypeGroup[];
  activeCount: number;
  totalCount: number;
}

function groupCardsByFactionTypeAndName(cards: Card[]): FactionGroup[] {
  const factionMap = new Map<string, FactionGroup>();

  for (const card of cards) {
    const faction = card.faction;
    const cardType = card.card_type || card.cardType || 'utility';
    const cardName = card.name;

    // Get or create faction group
    if (!factionMap.has(faction)) {
      factionMap.set(faction, {
        faction,
        cardTypeGroups: [],
        activeCount: 0,
        totalCount: 0,
      });
    }
    const factionGroup = factionMap.get(faction)!;

    // Get or create card type group
    let cardTypeGroup = factionGroup.cardTypeGroups.find(g => g.cardType === cardType);
    if (!cardTypeGroup) {
      cardTypeGroup = {
        cardType,
        cardGroups: [],
        activeCount: 0,
        totalCount: 0,
      };
      factionGroup.cardTypeGroups.push(cardTypeGroup);
    }

    // Get or create card name group (unique by name + type + baseValue)
    const groupKey = `${cardName}-${card.type}-${card.base_value ?? 'null'}`;
    let cardGroup = cardTypeGroup.cardGroups.find(g => 
      g.name === cardName && g.type === card.type && g.baseValue === card.base_value
    );
    if (!cardGroup) {
      cardGroup = {
        name: cardName,
        type: card.type,
        cardType,
        baseValue: card.base_value,
        description: card.description,
        cards: [],
        activeCount: 0,
      };
      cardTypeGroup.cardGroups.push(cardGroup);
    }

    // Add card to group
    cardGroup.cards.push(card);
    if (card.status === 'active') {
      cardGroup.activeCount++;
      cardTypeGroup.activeCount++;
      factionGroup.activeCount++;
    }
    cardTypeGroup.totalCount++;
    factionGroup.totalCount++;
  }

  // Sort
  const result = Array.from(factionMap.values());
  result.sort((a, b) => factions.indexOf(a.faction) - factions.indexOf(b.faction));
  
  for (const faction of result) {
    faction.cardTypeGroups.sort((a, b) => 
      cardTypeOrder.indexOf(a.cardType) - cardTypeOrder.indexOf(b.cardType)
    );
    for (const typeGroup of faction.cardTypeGroups) {
      typeGroup.cardGroups.sort((a, b) => a.name.localeCompare(b.name));
    }
  }

  return result;
}

export default function CardsPage() {
  const [searchParams] = useSearchParams();
  const { data: cards = [], isLoading, error } = useCards();
  const updateStatus = useUpdateCardStatus();
  const duplicateCard = useDuplicateCard();
  const deleteCard = useDeleteCard();
  const { showToast } = useToast();

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [filterFaction, setFilterFaction] = useState(searchParams.get('faction') || '');
  const [filterStatus, setFilterStatus] = useState(searchParams.get('status') || '');
  const [expandedFactions, setExpandedFactions] = useState<Set<string>>(new Set(['phantom', 'sentinel']));
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const handleStatusToggle = async (id: string, currentStatus: CardStatus, name: string) => {
    const newStatus: CardStatus = currentStatus === 'active' ? 'disabled' : 'active';
    try {
      await updateStatus.mutateAsync({ id, status: newStatus });
      showToast(`${name} ${newStatus === 'active' ? 'activated' : 'deactivated'}`, 'success');
    } catch {
      showToast(`Failed to update ${name}`, 'error');
    }
  };

  const handleDuplicate = async (id: string, name: string) => {
    try {
      await duplicateCard.mutateAsync(id);
      showToast(`${name} duplicated`, 'success');
    } catch {
      showToast(`Failed to duplicate ${name}`, 'error');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await deleteCard.mutateAsync(id);
      showToast(`${name} deleted`, 'success');
    } catch {
      showToast(`Failed to delete ${name}`, 'error');
    }
  };

  const toggleFaction = (faction: string) => {
    const newSet = new Set(expandedFactions);
    newSet.has(faction) ? newSet.delete(faction) : newSet.add(faction);
    setExpandedFactions(newSet);
  };

  const toggleType = (key: string) => {
    const newSet = new Set(expandedTypes);
    newSet.has(key) ? newSet.delete(key) : newSet.add(key);
    setExpandedTypes(newSet);
  };

  const toggleCard = (key: string) => {
    const newSet = new Set(expandedCards);
    newSet.has(key) ? newSet.delete(key) : newSet.add(key);
    setExpandedCards(newSet);
  };

  const filtered = useMemo(() => {
    return cards.filter((c: Card) =>
      (!search || c.name.toLowerCase().includes(search.toLowerCase()) || c.description?.toLowerCase().includes(search.toLowerCase())) &&
      (!filterFaction || c.faction === filterFaction) &&
      (!filterStatus || c.status === filterStatus)
    );
  }, [cards, search, filterFaction, filterStatus]);

  const factionGroups = useMemo(() => groupCardsByFactionTypeAndName(filtered), [filtered]);

  const deckSummary = useMemo(() => {
    const summary: Record<string, { active: number; total: number }> = {};
    for (const faction of factions) {
      const factionCards = cards.filter((c: Card) => c.faction === faction);
      summary[faction] = {
        active: factionCards.filter((c: Card) => c.status === 'active').length,
        total: factionCards.length,
      };
    }
    return summary;
  }, [cards]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card bg-red-500/10 border-red-500/20">
        <p className="text-red-400 mb-4">Failed to load cards</p>
        <button onClick={() => window.location.reload()} className="btn-primary">Reload</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Cards</h1>
          <p className="text-gray-400 mt-1">{cards.length} cards total</p>
        </div>
        <Link to="/cards/new" className="btn-primary flex items-center gap-2">
          <PlusIcon className="w-5 h-5" />New Card
        </Link>
      </div>

      {/* Deck Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {factions.filter(f => f !== 'neutral').map(faction => (
          <div key={faction} className={`card border-l-4 ${factionColors[faction]}`}>
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-white capitalize">{faction} Deck</h3>
                <p className="text-sm text-gray-400">
                  <span className="text-green-400 font-medium">{deckSummary[faction]?.active || 0}</span> active / {deckSummary[faction]?.total || 0} total
                </p>
              </div>
              <div className={`text-3xl font-bold ${faction === 'phantom' ? 'text-pink-500' : 'text-cyan-500'}`}>
                {deckSummary[faction]?.active || 0}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            placeholder="Search cards..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-10 w-full"
          />
        </div>
        <select value={filterFaction} onChange={e => setFilterFaction(e.target.value)} className="input w-auto">
          <option value="">All Factions</option>
          {factions.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input w-auto">
          <option value="">All Statuses</option>
          {statuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon="🎴"
          title={cards.length === 0 ? "No cards yet" : "No cards match filters"}
          description={cards.length === 0 ? "Create your first card" : "Try different filters"}
          actionLabel={cards.length === 0 ? "Create Card" : undefined}
          actionHref={cards.length === 0 ? "/cards/new" : undefined}
        />
      ) : (
        <div className="space-y-4">
          {factionGroups.map(factionGroup => (
            <div key={factionGroup.faction} className="card p-0 overflow-hidden">
              {/* Faction Header */}
              <button
                onClick={() => toggleFaction(factionGroup.faction)}
                className={`w-full flex items-center justify-between p-4 hover:bg-gray-800/50 border-l-4 ${factionColors[factionGroup.faction]}`}
              >
                <div className="flex items-center gap-3">
                  {expandedFactions.has(factionGroup.faction) ? <ChevronDownIcon className="w-5 h-5 text-gray-400" /> : <ChevronRightIcon className="w-5 h-5 text-gray-400" />}
                  <h2 className="text-lg font-semibold text-white capitalize">{factionGroup.faction}</h2>
                </div>
                <span className="text-sm text-gray-400">
                  <span className="text-green-400 font-medium">{factionGroup.activeCount}</span> / {factionGroup.totalCount}
                </span>
              </button>

              {/* Card Type Groups */}
              {expandedFactions.has(factionGroup.faction) && (
                <div className="border-t border-gray-800">
                  {factionGroup.cardTypeGroups.map(typeGroup => {
                    const typeKey = `${factionGroup.faction}-${typeGroup.cardType}`;
                    return (
                      <div key={typeKey} className="border-b border-gray-800 last:border-b-0">
                        {/* Card Type Header */}
                        <button
                          onClick={() => toggleType(typeKey)}
                          className="w-full flex items-center justify-between p-3 pl-8 hover:bg-gray-800/30"
                        >
                          <div className="flex items-center gap-3">
                            {expandedTypes.has(typeKey) ? <ChevronDownIcon className="w-4 h-4 text-gray-500" /> : <ChevronRightIcon className="w-4 h-4 text-gray-500" />}
                            <span className="text-xl">{icons[typeGroup.cardType] || '🎴'}</span>
                            <span className="font-medium text-white capitalize">{typeGroup.cardType}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-xs ${typeGroup.activeCount > 0 ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
                            {typeGroup.activeCount} / {typeGroup.totalCount}
                          </span>
                        </button>

                        {/* Card Name Groups */}
                        {expandedTypes.has(typeKey) && (
                          <div className="bg-gray-900/50">
                            {typeGroup.cardGroups.map(cardGroup => {
                              const cardKey = `${typeKey}-${cardGroup.name}-${cardGroup.baseValue}`;
                              return (
                                <div key={cardKey} className="border-t border-gray-800/50">
                                  {/* Card Name Header */}
                                  <button
                                    onClick={() => toggleCard(cardKey)}
                                    className="w-full flex items-center justify-between p-3 pl-12 hover:bg-gray-800/30"
                                  >
                                    <div className="flex items-center gap-3">
                                      {expandedCards.has(cardKey) ? <ChevronDownIcon className="w-4 h-4 text-gray-500" /> : <ChevronRightIcon className="w-4 h-4 text-gray-500" />}
                                      <span className="text-lg">{icons[cardGroup.type] || '🎴'}</span>
                                      <div>
                                        <span className="font-medium text-white">{cardGroup.name}</span>
                                        {cardGroup.baseValue !== null && (
                                          <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-gray-700 text-gray-300">
                                            Value: {cardGroup.baseValue}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <span className="text-sm text-gray-400">
                                      <span className="text-green-400">{cardGroup.activeCount}</span> / {cardGroup.cards.length}
                                    </span>
                                  </button>

                                  {/* Individual Cards */}
                                  {expandedCards.has(cardKey) && (
                                    <div className="pl-16 pr-4 pb-3 space-y-2">
                                      {cardGroup.description && (
                                        <p className="text-xs text-gray-500 mb-2">{cardGroup.description}</p>
                                      )}
                                      {cardGroup.cards.map((card, idx) => (
                                        <div 
                                          key={card.id}
                                          className={`flex items-center justify-between p-2 rounded-lg ${
                                            card.status === 'active' ? 'bg-gray-800/50' : 'bg-gray-800/20'
                                          }`}
                                        >
                                          <div className="flex items-center gap-3">
                                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                                              card.status === 'active' ? 'bg-green-500/20 text-green-400' : 
                                              card.status === 'testing' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-700 text-gray-500'
                                            }`}>
                                              {idx + 1}
                                            </span>
                                            <span className={card.status === 'disabled' ? 'text-gray-500' : 'text-gray-300'}>
                                              Copy #{idx + 1}
                                            </span>
                                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                                              card.status === 'active' ? 'bg-green-500/20 text-green-400' :
                                              card.status === 'testing' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-700 text-gray-500'
                                            }`}>
                                              {card.status}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <button
                                              onClick={() => handleDuplicate(card.id, card.name)}
                                              disabled={duplicateCard.isPending}
                                              className="p-1.5 hover:bg-gray-700 rounded"
                                              title="Duplicate"
                                            >
                                              <DocumentDuplicateIcon className="w-4 h-4 text-gray-400" />
                                            </button>
                                            <Link
                                              to={`/cards/${card.id}`}
                                              className="p-1.5 hover:bg-gray-700 rounded"
                                              title="Edit"
                                            >
                                              <PencilIcon className="w-4 h-4 text-gray-400" />
                                            </Link>
                                            <button
                                              onClick={() => handleDelete(card.id, card.name)}
                                              disabled={deleteCard.isPending}
                                              className="p-1.5 hover:bg-red-900/40 rounded"
                                              title="Delete"
                                            >
                                              <TrashIcon className="w-4 h-4 text-red-400/70 hover:text-red-400" />
                                            </button>
                                            <Switch
                                              checked={card.status === 'active'}
                                              onChange={() => handleStatusToggle(card.id, card.status, card.name)}
                                              disabled={updateStatus.isPending}
                                              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                                card.status === 'active' ? 'bg-green-500' : 'bg-gray-700'
                                              }`}
                                            >
                                              <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition ${
                                                card.status === 'active' ? 'translate-x-5' : 'translate-x-1'
                                              }`} />
                                            </Switch>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
