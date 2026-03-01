import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { Simulation, SimulationConfig, SimulationProgress, SampleGame } from '@/types/simulation';

export function useSimulations() {
  return useQuery<Simulation[]>({
    queryKey: ['simulations'],
    queryFn: async () => {
      const response = await api.get('/admin/simulations');
      return response.data.simulations;
    },
  });
}

export function useSimulation(id: string) {
  return useQuery<Simulation>({
    queryKey: ['simulation', id],
    queryFn: async () => {
      const response = await api.get(`/admin/simulations/${id}`);
      return response.data.simulation;
    },
    enabled: !!id,
  });
}

export function useSimulationProgress(id: string, enabled: boolean = true) {
  return useQuery<SimulationProgress>({
    queryKey: ['simulation-progress', id],
    queryFn: async () => {
      const response = await api.get(`/admin/simulations/${id}/progress`);
      return response.data.progress;
    },
    enabled: enabled && !!id,
    refetchInterval: (query) => {
      const data = query.state.data;
      // Poll every 2 seconds while running
      if (data?.status === 'running' || data?.status === 'pending') {
        return 2000;
      }
      return false;
    },
  });
}

export function useSampleGames(id: string) {
  return useQuery<SampleGame[]>({
    queryKey: ['simulation-samples', id],
    queryFn: async () => {
      const response = await api.get(`/admin/simulations/${id}/samples`);
      return response.data.samples;
    },
    enabled: !!id,
  });
}

export function useCreateSimulation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: SimulationConfig) => {
      const response = await api.post('/admin/simulations', config);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['simulations'] });
    },
  });
}

export function useDeleteSimulation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/simulations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['simulations'] });
    },
  });
}

export function useBatchDeleteSimulations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      await api.post('/admin/simulations/batch-delete', { ids });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['simulations'] });
    },
  });
}
