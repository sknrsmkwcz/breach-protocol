import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cardsApi } from '@/services/api';
import type { Card } from '@/types/api';

export const useCards = () => useQuery({ queryKey: ['cards'], queryFn: cardsApi.getAll });
export const useCard = (id?: string) => useQuery({ queryKey: ['cards', id], queryFn: () => cardsApi.getById(id!), enabled: !!id });

export const useCreateCard = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: cardsApi.create, onSuccess: () => qc.invalidateQueries({ queryKey: ['cards'] }) });
};

export const useUpdateCard = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, data }: { id: string; data: Partial<Card> }) => cardsApi.update(id, data), onSuccess: () => qc.invalidateQueries({ queryKey: ['cards'] }) });
};

export const useUpdateCardStatus = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, status }: { id: string; status: Card['status'] }) => cardsApi.updateStatus(id, status), onSuccess: () => qc.invalidateQueries({ queryKey: ['cards'] }) });
};
