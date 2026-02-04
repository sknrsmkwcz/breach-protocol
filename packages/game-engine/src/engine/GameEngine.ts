import type { GameState, PlayerState, PlayerIndex, GameAction, GameEvent, FactionId } from '../types';
import { GAME_CONSTANTS, FACTIONS } from '../types';
import { SeededRandom } from '../utils/random';
import { buildDeck } from './deckBuilder';
import { playCard } from './cardEffects';
import { resetCardIdCounter } from './cardFactory';
import { resetFirewallIdCounter } from './firewall';

export interface GameConfig {
  gameId: string;
  player1: { id: string; name: string; faction: FactionId };
  player2: { id: string; name: string; faction: FactionId };
  seed?: number;
}

export interface ActionResult {
  success: boolean;
  error?: string;
  events: GameEvent[];
  gameOver: boolean;
  winner?: PlayerIndex;
}

export class GameEngine {
  private state: GameState;
  private rng: SeededRandom;

  constructor(config: GameConfig) {
    resetCardIdCounter();
    resetFirewallIdCounter();
    
    const seed = config.seed ?? Date.now();
    this.rng = new SeededRandom(seed);
    
    const createPlayer = (cfg: { id: string; name: string; faction: FactionId }): PlayerState => {
      const faction = FACTIONS[cfg.faction];
      return {
        id: cfg.id,
        name: cfg.name,
        faction: cfg.faction,
        hp: faction.startingHp,
        maxHp: faction.startingHp,
        deck: buildDeck(cfg.faction, this.rng),
        hand: [],
        firewalls: [],
        boost: 0,
      };
    };

    this.state = {
      id: config.gameId,
      players: [createPlayer(config.player1), createPlayer(config.player2)],
      currentTurn: 0,
      actionsRemaining: GAME_CONSTANTS.ACTIONS_PER_TURN,
      turnNumber: 1,
      phase: 'playing',
      winner: null,
      seed,
    };

    // Draw initial hands
    for (let p = 0; p < 2; p++) {
      for (let i = 0; i < GAME_CONSTANTS.INITIAL_HAND_SIZE; i++) {
        this.drawCard(p as PlayerIndex);
      }
    }
  }

  private drawCard(playerIndex: PlayerIndex): boolean {
    const player = this.state.players[playerIndex];
    if (player.deck.length > 0) {
      player.hand.push(player.deck.pop()!);
      return true;
    }
    return false;
  }

  getState(): Readonly<GameState> {
    return this.state;
  }

  isGameOver(): boolean {
    return this.state.phase === 'game_over';
  }

  getSeed(): number {
    return this.state.seed;
  }

  applyAction(playerIndex: PlayerIndex, action: GameAction): ActionResult {
    if (this.state.phase !== 'playing') {
      return { success: false, error: 'Game is not active', events: [], gameOver: this.isGameOver() };
    }

    if (this.state.currentTurn !== playerIndex) {
      return { success: false, error: 'Not your turn', events: [], gameOver: false };
    }

    if (action.type === 'play_card') {
      return this.handlePlayCard(playerIndex, action.cardIndex);
    }

    if (action.type === 'end_turn') {
      return this.handleEndTurn();
    }

    return { success: false, error: 'Unknown action type', events: [], gameOver: false };
  }

  private handlePlayCard(playerIndex: PlayerIndex, cardIndex: number): ActionResult {
    if (this.state.actionsRemaining <= 0) {
      return { success: false, error: 'No actions remaining', events: [], gameOver: false };
    }

    const player = this.state.players[playerIndex];
    if (cardIndex < 0 || cardIndex >= player.hand.length) {
      return { success: false, error: 'Invalid card index', events: [], gameOver: false };
    }

    const opponentIndex = (1 - playerIndex) as PlayerIndex;
    const card = player.hand.splice(cardIndex, 1)[0];

    const result = playCard(card, player, this.state.players[opponentIndex], {
      attackerIndex: playerIndex,
      defenderIndex: opponentIndex,
    });

    this.state.players[playerIndex] = result.attacker;
    this.state.players[opponentIndex] = result.defender;
    this.state.actionsRemaining--;

    const gameOverResult = this.checkGameOver();

    return {
      success: true,
      events: result.events,
      gameOver: gameOverResult !== null,
      winner: gameOverResult?.winner,
    };
  }

  private handleEndTurn(): ActionResult {
    const events: GameEvent[] = [];

    // Switch to next player
    this.state.currentTurn = (1 - this.state.currentTurn) as PlayerIndex;
    
    // Reset boost for the new current player
    this.state.players[this.state.currentTurn].boost = 0;
    
    // Draw a card
    this.drawCard(this.state.currentTurn);
    
    // Reset actions
    this.state.actionsRemaining = GAME_CONSTANTS.ACTIONS_PER_TURN;
    
    // Increment turn
    this.state.turnNumber++;

    events.push({
      type: 'turn_start',
      player: this.state.currentTurn,
      turnNumber: this.state.turnNumber,
    });

    events.push({
      type: 'draw',
      player: this.state.currentTurn,
      count: 1,
    });

    return { success: true, events, gameOver: false };
  }

  private checkGameOver(): { winner: PlayerIndex } | null {
    for (let i = 0; i < 2; i++) {
      if (this.state.players[i].hp <= 0) {
        const winner = (1 - i) as PlayerIndex;
        this.state.phase = 'game_over';
        this.state.winner = winner;
        return { winner };
      }
    }
    return null;
  }
}
