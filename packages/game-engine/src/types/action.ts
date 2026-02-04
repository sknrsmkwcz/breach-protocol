export interface PlayCardAction {
  readonly type: 'play_card';
  readonly cardIndex: number;
}

export interface EndTurnAction {
  readonly type: 'end_turn';
}

export type GameAction = PlayCardAction | EndTurnAction;
