import type { Effect, CardTypeEnum } from './effects';

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
  cardType: CardTypeEnum;
  card_type?: CardTypeEnum;
  faction: FactionId;
  name: string;
  description: string | null;
  base_value: number | null;
  status: CardStatus;
  effects: Effect[];
  generatedText?: string;
  created_at: string;
  updated_at: string;
}

export type CardType = string;
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
  includeTestingCards?: boolean;
}

export interface CardStats {
  timesPlayed: number;
  byFaction1: number;
  byFaction2: number;
}

export interface FactionPair {
  faction1: number;
  faction2: number;
}

export interface DetailedStats {
  totalDamageDealt: FactionPair;
  exploitDamage: FactionPair;
  zerodayDamage: FactionPair;
  siphonDamage: FactionPair;
  purgeDamage: FactionPair;
  backtraceDamage: FactionPair;
  zerodaySelfDamage: FactionPair;
  totalHealing: FactionPair;
  patchHealing: FactionPair;
  siphonHealing: FactionPair;
  firewallsDeployed: FactionPair;
  firewallsDestroyed: FactionPair;
  firewallDamageBlocked: FactionPair;
  cardsDrawn: FactionPair;
  patchCardDraw: FactionPair;
  purgeCardDraw: FactionPair;
  boostsApplied: FactionPair;
  boostsConsumed: FactionPair;
  totalBoostDamage: FactionPair;
}

export interface SimulationResult {
  gamesPlayed: number;
  faction1Wins: number;
  faction2Wins: number;
  averageTurns: number;
  averageFaction1FinalHp?: number;
  averageFaction2FinalHp?: number;
  cardStats?: Record<string, CardStats>;
  detailedStats?: DetailedStats;
  deckInfo?: {
    faction1Cards: number;
    faction2Cards: number;
    faction1UniqueCards: number;
    faction2UniqueCards: number;
    warnings: string[];
  };
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

export interface ValidationResult {
  valid: boolean;
  errors: { id: string; message: string; path?: string }[];
  warnings: { id: string; message: string; path?: string }[];
}
