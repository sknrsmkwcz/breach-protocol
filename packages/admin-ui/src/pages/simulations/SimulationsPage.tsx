import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { formatDistanceToNow } from 'date-fns';
import { useSimulations, useCreateSimulation } from '@/hooks/useSimulations';
import { PlayIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';
import { useToast } from '@/contexts/ToastContext';
import type { FactionId } from '@/types/api';

interface SimulationForm {
  faction1: FactionId;
  faction2: FactionId;
  gamesCount: number;
}

export default function SimulationsPage() {
  const { data: sims, isLoading, refetch, isFetching } = useSimulations();
  const create = useCreateSimulation();
  const { showToast } = useToast();
  
  const { register, handleSubmit, reset, watch } = useForm<SimulationForm>({ 
    defaultValues: { faction1: 'phantom', faction2: 'sentinel', gamesCount: 100 } 
  });

  const faction1 = watch('faction1');
  const faction2 = watch('faction2');

  const onSubmit = async (data: SimulationForm) => { 
    try {
      await create.mutateAsync(data);
      showToast('Simulation started', 'success');
      reset();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to start', 'error');
    }
  };

  const runningSims = sims?.filter(s => s.status === 'running' || s.status === 'pending') || [];
  const completedSims = sims?.filter(s => s.status === 'completed' || s.status === 'failed') || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Simulations</h1>
          <p className="text-gray-400 mt-1">Test game balance with AI battles</p>
        </div>
        <button onClick={() => refetch()} disabled={isFetching} className="btn-ghost">
          <ArrowPathIcon className={`w-5 h-5 ${isFetching ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card">
        <h3 className="text-lg font-semibold text-white mb-4">Run New Simulation</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Faction 1</label>
            <select {...register('faction1')} className="input">
              <option value="phantom">Phantom</option>
              <option value="sentinel">Sentinel</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Faction 2</label>
            <select {...register('faction2')} className="input">
              <option value="phantom">Phantom</option>
              <option value="sentinel">Sentinel</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Games</label>
            <input type="number" {...register('gamesCount', { valueAsNumber: true })} className="input" min="10" max="1000" />
          </div>
          <div className="flex items-end">
            <button type="submit" disabled={create.isPending} className="btn-primary w-full flex items-center justify-center gap-2">
              {create.isPending ? <LoadingSpinner size="sm" /> : <PlayIcon className="w-5 h-5" />}
              {create.isPending ? 'Starting...' : 'Run'}
            </button>
          </div>
        </div>
        {faction1 === faction2 && (
          <p className="text-sm text-cyber-yellow mt-2">⚠️ Mirror match selected</p>
        )}
      </form>

      {runningSims.length > 0 && (
        <div className="card border-cyber-cyan/30">
          <h3 className="text-lg font-semibold text-cyber-cyan mb-4">Running ({runningSims.length})</h3>
          <div className="space-y-3">
            {runningSims.map(sim => (
              <Link key={sim.id} to={`/simulations/${sim.id}`} className="block p-4 bg-gray-800/50 rounded-lg hover:bg-gray-800">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-white capitalize">{sim.config.faction1} vs {sim.config.faction2}</span>
                  <span className="badge bg-cyber-cyan/20 text-cyber-cyan">{sim.status}</span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full">
                  <div className="h-full bg-cyber-cyan rounded-full" style={{ width: `${(sim.games_completed / sim.games_total) * 100}%` }} />
                </div>
                <p className="text-xs text-gray-500 mt-2">{sim.games_completed} / {sim.games_total}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8"><LoadingSpinner size="lg" /></div>
      ) : completedSims.length === 0 && runningSims.length === 0 ? (
        <EmptyState icon="🧪" title="No simulations yet" description="Run a simulation to test faction balance" />
      ) : (
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">History ({completedSims.length})</h3>
          <div className="space-y-2">
            {completedSims.map(sim => {
              const winRate = sim.results ? Math.round((sim.results.faction1Wins / sim.results.gamesPlayed) * 100) : null;
              const isBalanced = winRate !== null && Math.abs(winRate - 50) < 10;
              return (
                <Link key={sim.id} to={`/simulations/${sim.id}`} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg hover:bg-gray-800">
                  <div>
                    <span className="text-white capitalize">{sim.config.faction1} vs {sim.config.faction2}</span>
                    <p className="text-sm text-gray-500">{sim.games_total} games • {formatDistanceToNow(new Date(sim.created_at), { addSuffix: true })}</p>
                  </div>
                  {sim.status === 'completed' && winRate !== null && (
                    <span className={isBalanced ? 'text-cyber-green' : 'text-cyber-yellow'}>{winRate}% - {100 - winRate}%</span>
                  )}
                  {sim.status === 'failed' && <span className="badge bg-cyber-red/20 text-cyber-red">Failed</span>}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
