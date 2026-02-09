import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { simulationsApi } from '@/services/api';
import type { SimulationConfig } from '@/types/api';

export const useSimulations = () => useQuery({
  queryKey: ['simulations'], queryFn: simulationsApi.getAll,
  refetchInterval: (q) => q.state.data?.some(s => s.status === 'running') ? 5000 : false,
});

export const useSimulation = (id?: string) => useQuery({
  queryKey: ['simulations', id], queryFn: () => simulationsApi.getById(id!), enabled: !!id,
  refetchInterval: (q) => q.state.data?.status === 'running' ? 2000 : false,
});

export const useCreateSimulation = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (c: SimulationConfig) => simulationsApi.create(c), onSuccess: () => qc.invalidateQueries({ queryKey: ['simulations'] }) });
};
