export interface User {
  id: string;
  username: string;
  role: 'player' | 'admin';
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface Card {
  id: string;
  type: CardType;
  faction: FactionId;
  name: string;
  description: string | null;
  base_value: number | null;
  status: CardStatus;
  created_at: string;
  updated_at: string;
}

export type CardType = 'exploit' | 'payload' | 'zeroday' | 'siphon' | 'firewall' | 'patch' | 'purge';
export type CardStatus = 'active' | 'disabled' | 'testing';
export type FactionId = 'phantom' | 'sentinel' | 'neutral';

export interface Faction {
  id: FactionId;
  name: string;
  description: string | null;
  starting_hp: number;
}

export interface SimulationConfig {
  gamesCount: number;
  faction1: FactionId;
  faction2: FactionId;
}

export interface SimulationResult {
  gamesPlayed: number;
  faction1Wins: number;
  faction2Wins: number;
  averageTurns: number;
}

export interface Simulation {
  id: string;
  config: SimulationConfig;
  status: 'pending' | 'running' | 'completed' | 'failed';
  results: SimulationResult | null;
  games_total: number;
  games_completed: number;
  created_at: string;
}
