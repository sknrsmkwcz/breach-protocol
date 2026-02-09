import { useQuery } from '@tanstack/react-query';
import { factionsApi } from '@/services/api';

export const useFactions = () => useQuery({ queryKey: ['factions'], queryFn: factionsApi.getAll });
export const useFactionCards = (id?: string) => useQuery({ queryKey: ['factions', id, 'cards'], queryFn: () => factionsApi.getCards(id!), enabled: !!id });
