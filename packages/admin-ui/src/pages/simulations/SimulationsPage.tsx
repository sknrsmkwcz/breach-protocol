import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useSimulations,
  useCreateSimulation,
  useDeleteSimulation,
  useBatchDeleteSimulations,
} from '@/hooks/useSimulations';
import { PlayIcon, TrashIcon, EyeIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useToast } from '@/contexts/ToastContext';

interface Simulation {
  id: string;
  status: string;
  config: {
    faction1: string;
    faction2: string;
    gamesCount: number;
  };
  games_total?: number;
  gamesTotal?: number;
  games_completed?: number;
  gamesCompleted?: number;
  created_at?: string;
  createdAt?: string;
}

export default function SimulationsPage() {
  const { data: simulations = [], isLoading } = useSimulations();
  const createSimulation = useCreateSimulation();
  const deleteSimulation = useDeleteSimulation();
  const batchDelete = useBatchDeleteSimulations();
  const { showToast } = useToast();

  const [gamesCount, setGamesCount] = useState(1000);
  const [faction1, setFaction1] = useState<'phantom' | 'sentinel'>('phantom');
  const [faction2, setFaction2] = useState<'phantom' | 'sentinel'>('sentinel');
  const [includeTestingCards, setIncludeTestingCards] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const handleCreate = async () => {
    try {
      await createSimulation.mutateAsync({ gamesCount, faction1, faction2, includeTestingCards });
      showToast('Simulation started', 'success');
    } catch {
      showToast('Failed to start simulation', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this simulation?')) return;
    try {
      await deleteSimulation.mutateAsync(id);
      setSelected(prev => { const s = new Set(prev); s.delete(id); return s; });
      showToast('Simulation deleted', 'success');
    } catch {
      showToast('Failed to delete simulation', 'error');
    }
  };

  const handleBatchDelete = async () => {
    const ids = Array.from(selected);
    if (!confirm(`Delete ${ids.length} simulation(s)?`)) return;
    try {
      await batchDelete.mutateAsync(ids);
      setSelected(new Set());
      showToast(`${ids.length} simulation(s) deleted`, 'success');
    } catch {
      showToast('Failed to delete simulations', 'error');
    }
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const deletableSims = (simulations as Simulation[]).filter(s => s.status !== 'running');
  const allDeletableSelected = deletableSims.length > 0 && deletableSims.every(s => selected.has(s.id));

  const toggleSelectAll = () => {
    if (allDeletableSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(deletableSims.map(s => s.id)));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Simulations</h1>

      {/* Create New Simulation */}
      <div className="card">
        <h2 className="text-lg font-semibold text-white mb-4">New Simulation</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Games</label>
            <input
              type="number"
              min={10}
              max={100000}
              value={gamesCount}
              onChange={(e) => setGamesCount(parseInt(e.target.value) || 1000)}
              className="input w-full"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Faction 1</label>
            <select
              value={faction1}
              onChange={(e) => setFaction1(e.target.value as 'phantom' | 'sentinel')}
              className="input w-full"
            >
              <option value="phantom">Phantom</option>
              <option value="sentinel">Sentinel</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Faction 2</label>
            <select
              value={faction2}
              onChange={(e) => setFaction2(e.target.value as 'phantom' | 'sentinel')}
              className="input w-full"
            >
              <option value="phantom">Phantom</option>
              <option value="sentinel">Sentinel</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Include Testing</label>
            <label className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                checked={includeTestingCards}
                onChange={(e) => setIncludeTestingCards(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-gray-300">Testing cards</span>
            </label>
          </div>
        </div>
        <button
          onClick={handleCreate}
          disabled={createSimulation.isPending}
          className="btn-primary mt-4 flex items-center gap-2"
        >
          <PlayIcon className="w-4 h-4" />
          {createSimulation.isPending ? 'Starting...' : 'Start Simulation'}
        </button>
      </div>

      {/* Simulation List */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">
            Recent Simulations
            {simulations.length > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-400">({simulations.length})</span>
            )}
          </h2>
          {selected.size > 0 && (
            <button
              onClick={handleBatchDelete}
              disabled={batchDelete.isPending}
              className="flex items-center gap-2 px-3 py-1.5 rounded text-sm bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
            >
              <TrashIcon className="w-4 h-4" />
              Delete {selected.size} selected
            </button>
          )}
        </div>

        {simulations.length === 0 ? (
          <p className="text-gray-400">No simulations yet. Create one above!</p>
        ) : (
          <div className="space-y-2">
            {/* Select-all header */}
            {deletableSims.length > 0 && (
              <div className="flex items-center gap-3 px-3 py-1 text-xs text-gray-500">
                <input
                  type="checkbox"
                  checked={allDeletableSelected}
                  onChange={toggleSelectAll}
                  className="rounded"
                />
                <span>Select all deletable ({deletableSims.length})</span>
              </div>
            )}

            {(simulations as Simulation[]).map((sim) => {
              const gamesCompleted = sim.gamesCompleted ?? sim.games_completed ?? 0;
              const gamesTotal = sim.gamesTotal ?? sim.games_total ?? 0;
              const isRunning = sim.status === 'running';
              const isSelected = selected.has(sim.id);

              return (
                <div
                  key={sim.id}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    isSelected ? 'bg-gray-700' : 'bg-gray-800'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={isRunning}
                    onChange={() => toggleSelect(sim.id)}
                    className="rounded flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={sim.status} />
                      <span className="text-white capitalize">
                        {sim.config.faction1} vs {sim.config.faction2}
                      </span>
                      <span className="text-gray-500 text-sm">
                        {sim.config.gamesCount?.toLocaleString()} games
                      </span>
                    </div>
                    <div className="text-sm text-gray-400 mt-0.5">
                      {gamesCompleted.toLocaleString()} / {gamesTotal.toLocaleString()} completed
                      {isRunning && gamesTotal > 0 && (
                        <span className="ml-2 text-blue-400">
                          ({Math.round((gamesCompleted / gamesTotal) * 100)}%)
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Link
                      to={`/simulations/${sim.id}`}
                      className="p-2 hover:bg-gray-700 rounded"
                      title="View results"
                    >
                      <EyeIcon className="w-4 h-4 text-gray-400" />
                    </Link>
                    {!isRunning && (
                      <button
                        onClick={() => handleDelete(sim.id)}
                        disabled={deleteSimulation.isPending}
                        className="p-2 hover:bg-red-900/40 rounded"
                        title="Delete"
                      >
                        <TrashIcon className="w-4 h-4 text-red-400/70 hover:text-red-400" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-500/20 text-yellow-400',
    running: 'bg-blue-500/20 text-blue-400',
    completed: 'bg-green-500/20 text-green-400',
    failed: 'bg-red-500/20 text-red-400',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs ${colors[status] || 'bg-gray-500/20 text-gray-400'}`}>
      {status}
    </span>
  );
}
