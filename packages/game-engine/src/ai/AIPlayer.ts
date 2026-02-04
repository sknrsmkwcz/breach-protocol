import type { GameState, PlayerIndex, GameAction } from '../types';
import { chooseCard } from './scorer';

export class AIPlayer {
  chooseAction(state: GameState, playerIndex: PlayerIndex): GameAction {
    const self = state.players[playerIndex];
    const opponent = state.players[1 - playerIndex];

    if (state.actionsRemaining <= 0 || self.hand.length === 0) {
      return { type: 'end_turn' };
    }

    const cardIndex = chooseCard(self, opponent);
    return cardIndex < 0 ? { type: 'end_turn' } : { type: 'play_card', cardIndex };
  }
}
