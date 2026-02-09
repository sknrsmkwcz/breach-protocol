import { useQuery } from '@tanstack/react-query';
import { statsApi } from '@/services/api';

export const useDashboardStats = () => useQuery({
  queryKey: ['dashboard-stats'],
  queryFn: () => statsApi.getDashboard(),
});
