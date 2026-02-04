import type { PlayerIndex } from './state';
import type { CardType, ActiveFirewall } from './card';

export interface DamageEvent {
  readonly type: 'damage';
  readonly target: PlayerIndex;
  readonly amount: number;
  readonly source: 'exploit' | 'zeroday' | 'siphon' | 'purge' | 'backtrace';
}

export interface HealEvent {
  readonly type: 'heal';
  readonly target: PlayerIndex;
  readonly amount: number;
  readonly source: 'patch' | 'siphon';
}

export interface FirewallDeployedEvent {
  readonly type: 'firewall_deployed';
  readonly player: PlayerIndex;
  readonly value: number;
}

export interface FirewallDestroyedEvent {
  readonly type: 'firewall_destroyed';
  readonly player: PlayerIndex;
  readonly firewalls: ReadonlyArray<ActiveFirewall>;
}

export interface CardPlayedEvent {
  readonly type: 'card_played';
  readonly player: PlayerIndex;
  readonly cardType: CardType;
  readonly cardValue?: number;
}

export interface DrawEvent {
  readonly type: 'draw';
  readonly player: PlayerIndex;
  readonly count: number;
}

export interface BoostAppliedEvent {
  readonly type: 'boost_applied';
  readonly player: PlayerIndex;
  readonly amount: number;
}

export interface BoostConsumedEvent {
  readonly type: 'boost_consumed';
  readonly player: PlayerIndex;
  readonly amount: number;
}

export interface TurnStartEvent {
  readonly type: 'turn_start';
  readonly player: PlayerIndex;
  readonly turnNumber: number;
}

export interface GameOverEvent {
  readonly type: 'game_over';
  readonly winner: PlayerIndex;
}

export type GameEvent =
  | DamageEvent | HealEvent | FirewallDeployedEvent | FirewallDestroyedEvent
  | CardPlayedEvent | DrawEvent | BoostAppliedEvent | BoostConsumedEvent
  | TurnStartEvent | GameOverEvent;
