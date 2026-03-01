export interface SimulationConfig {
  gamesCount: number;
  faction1: 'phantom' | 'sentinel';
  faction2: 'phantom' | 'sentinel';
  seedStart?: number;
  includeTestingCards?: boolean;
}

export interface SimulationProgress {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  gamesTotal: number;
  gamesCompleted: number;
  batchesCompleted: number;
  percentComplete: number;
  lastHeartbeat?: string;
  errorMessage?: string;
}

export interface CardStats {
  timesPlayed: number;
  byFaction1: number;
  byFaction2: number;
  totalDamageDealt: number;
  totalDamageBlocked: number;
  totalHealing: number;
  totalSelfDamage: number;
}

export interface SimulationResults {
  gamesPlayed: number;
  faction1Wins: number;
  faction2Wins: number;
  faction1WinRate: number;
  faction2WinRate: number;
  confidenceInterval95: { lower: number; upper: number };
  averageTurns: number;
  turnDistribution: Record<string, number>;
  averageFaction1FinalHp: number;
  averageFaction2FinalHp: number;
  cardStats: Record<string, CardStats>;
  detailedStats: {
    totalDamageDealt: { faction1: number; faction2: number };
    totalDamageBlocked?: { faction1: number; faction2: number };
    firewallDamageBlocked?: { faction1: number; faction2: number };
    totalHealing: { faction1: number; faction2: number };
    firewallsDeployed: { faction1: number; faction2: number };
    firewallsDestroyed?: { faction1: number; faction2: number };
    boostsApplied: { faction1: number; faction2: number };
    boostsConsumed?: { faction1: number; faction2: number };
    cardsDrawn?: { faction1: number; faction2: number };
    exploitDamage?: { faction1: number; faction2: number };
    zerodayDamage?: { faction1: number; faction2: number };
    siphonDamage?: { faction1: number; faction2: number };
  };
  deckInfo?: {
    faction1Cards: number;
    faction2Cards: number;
    faction1UniqueCards: number;
    faction2UniqueCards: number;
    warnings: string[];
  };
  outliers?: Array<{
    type: string;
    gameIndex: number;
    seed: number;
    value: number;
    threshold: number;
  }>;
}

export interface Simulation {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  config: SimulationConfig;
  results?: SimulationResults;
  // Handle both camelCase and snake_case
  gamesTotal?: number;
  games_total?: number;
  gamesCompleted?: number;
  games_completed?: number;
  batchesCompleted?: number;
  batches_completed?: number;
  errorMessage?: string;
  error_message?: string;
  createdAt?: string;
  created_at?: string;
  startedAt?: string;
  started_at?: string;
  completedAt?: string;
  completed_at?: string;
}

export interface SampleGame {
  seed: number;
  winner: 0 | 1;
  turns: number;
  finalHpFaction1: number;
  finalHpFaction2: number;
  actions: Array<{
    turn: number;
    player: 0 | 1;
    action: string;
    cardType?: string;
  }>;
}
