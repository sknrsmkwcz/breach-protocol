import type { Card, ActiveFirewall } from './card';

export type FactionId = 'phantom' | 'sentinel';
export type PlayerIndex = 0 | 1;
export type GamePhase = 'setup' | 'playing' | 'game_over';

export interface PlayerState {
  readonly id: string;
  readonly name: string;
  readonly faction: FactionId;
  hp: number;
  readonly maxHp: number;
  deck: Card[];
  hand: Card[];
  firewalls: ActiveFirewall[];
  boost: number;
}

export interface GameState {
  readonly id: string;
  players: [PlayerState, PlayerState];
  currentTurn: PlayerIndex;
  actionsRemaining: number;
  turnNumber: number;
  phase: GamePhase;
  winner: PlayerIndex | null;
  readonly seed: number;
}
