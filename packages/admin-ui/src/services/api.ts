import axios from 'axios';
import type { AuthResponse, Card, Faction, Simulation, SimulationConfig } from '@/types/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
const api = axios.create({ baseURL: API_URL, headers: { 'Content-Type': 'application/json' } });

let accessToken: string | null = null;
export const setAccessToken = (token: string | null) => { accessToken = token; };
export const getAccessToken = () => accessToken;

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(new Error(err.response?.data?.error || err.message))
);

export const authApi = {
  login: async (username: string, password: string): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>('/auth/login', { username, password });
    setAccessToken(res.data.accessToken);
    return res.data;
  },
  logout: async (refreshToken: string) => {
    await api.post('/auth/logout', { refreshToken });
    setAccessToken(null);
  },
  refresh: async (refreshToken: string): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>('/auth/refresh', { refreshToken });
    setAccessToken(res.data.accessToken);
    return res.data;
  },
};

export const cardsApi = {
  getAll: async (): Promise<Card[]> => (await api.get<{ cards: Card[] }>('/admin/cards')).data.cards,
  getById: async (id: string): Promise<Card> => (await api.get<{ card: Card }>(`/cards/${id}`)).data.card,
  create: async (data: Partial<Card>): Promise<Card> => (await api.post<{ card: Card }>('/admin/cards', data)).data.card,
  update: async (id: string, data: Partial<Card>): Promise<Card> => (await api.put<{ card: Card }>(`/admin/cards/${id}`, data)).data.card,
  updateStatus: async (id: string, status: Card['status']): Promise<Card> => (await api.patch<{ card: Card }>(`/admin/cards/${id}/status`, { status })).data.card,
};

export const factionsApi = {
  getAll: async (): Promise<Faction[]> => (await api.get<{ factions: Faction[] }>('/factions')).data.factions,
  getCards: async (id: string): Promise<{ faction: Faction; cards: Card[] }> => (await api.get(`/factions/${id}/cards`)).data,
};

export const simulationsApi = {
  getAll: async (): Promise<Simulation[]> => (await api.get<{ simulations: Simulation[] }>('/admin/simulations')).data.simulations,
  getById: async (id: string): Promise<Simulation> => (await api.get<{ simulation: Simulation }>(`/admin/simulations/${id}`)).data.simulation,
  create: async (config: SimulationConfig): Promise<Simulation> => (await api.post<{ simulation: Simulation }>('/admin/simulations', config)).data.simulation,
};

export const statsApi = {
  getDashboard: async () => {
    const [cards, sims] = await Promise.all([cardsApi.getAll(), simulationsApi.getAll()]);
    return {
      totalCards: cards.length,
      activeCards: cards.filter(c => c.status === 'active').length,
      totalSimulations: sims.length,
      recentSimulations: sims.slice(0, 5),
    };
  },
};