import { getDb } from '../db/client.js';
import { GameEngine, AIPlayer, type GameState, type GameAction, type FactionId } from '@breach-protocol/game-engine';
import { generateId } from '../utils/id.js';

export interface GameRecord {
  id: string;
  player1_id: string;
  player2_id: string | null;
  player1_faction: string;
  player2_faction: string;
  status: 'active' | 'completed' | 'abandoned';
  winner_id: string | null;
  seed: number;
  current_state: GameState;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface CreateGameOptions {
  playerId: string;
  playerFaction: FactionId;
  opponentFaction: FactionId;
  vsAI?: boolean;
}

export interface ActionRecord {
  id: string;
  game_id: string;
  player_id: string;
  action_type: string;
  action_data: GameAction;
  result_events: unknown[];
  turn_number: number;
  created_at: string;
}

// In-memory engine cache (for active games)
const engineCache = new Map<string, GameEngine>();

export class GameService {
  private aiPlayer = new AIPlayer();
  
  async createGame(options: CreateGameOptions): Promise<GameRecord> {
    const db = getDb();
    const gameId = generateId();
    const seed = Math.floor(Math.random() * 2147483647);
    
    // Player 1 is always the human, Player 2 is AI (or null for PvP later)
    const player2Id = options.vsAI !== false ? 'ai' : null;
    
    const engine = new GameEngine({
      gameId,
      player1: { id: options.playerId, name: 'Player', faction: options.playerFaction },
      player2: { id: player2Id ?? 'waiting', name: options.vsAI !== false ? 'AI' : 'Opponent', faction: options.opponentFaction },
      seed,
    });
    
    const state = engine.getState();
    
    await db.execute({
      sql: `INSERT INTO games (id, player1_id, player2_id, player1_faction, player2_faction, status, seed, current_state)
            VALUES (?, ?, ?, ?, ?, 'active', ?, ?)`,
      args: [gameId, options.playerId, player2Id, options.playerFaction, options.opponentFaction, seed, JSON.stringify(state)],
    });
    
    // Cache engine for this session
    engineCache.set(gameId, engine);
    
    return {
      id: gameId,
      player1_id: options.playerId,
      player2_id: player2Id,
      player1_faction: options.playerFaction,
      player2_faction: options.opponentFaction,
      status: 'active',
      winner_id: null,
      seed,
      current_state: state,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_at: null,
    };
  }
  
  async getGame(gameId: string, userId: string): Promise<GameRecord | null> {
    const db = getDb();
    
    const result = await db.execute({
      sql: `SELECT * FROM games WHERE id = ? AND (player1_id = ? OR player2_id = ? OR player2_id = 'ai')`,
      args: [gameId, userId, userId],
    });
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      ...row,
      current_state: JSON.parse(row.current_state as string),
    } as GameRecord;
  }
  
  async submitAction(gameId: string, userId: string, action: GameAction): Promise<{ game: GameRecord; events: unknown[] }> {
    const db = getDb();
    
    // Get or restore engine
    let engine = engineCache.get(gameId);
    
    if (!engine) {
      const gameRow = await db.execute({
        sql: `SELECT * FROM games WHERE id = ? AND status = 'active'`,
        args: [gameId],
      });
      
      if (gameRow.rows.length === 0) {
        throw new Error('Game not found or not active');
      }
      
      const game = gameRow.rows[0];
      
      // Verify user is a player
      if (game.player1_id !== userId && game.player2_id !== userId) {
        throw new Error('Not a participant in this game');
      }
      
      // Restore engine from state
      engine = new GameEngine({
        gameId: game.id as string,
        player1: { id: game.player1_id as string, name: 'Player', faction: game.player1_faction as FactionId },
        player2: { id: (game.player2_id as string) ?? 'ai', name: 'AI', faction: game.player2_faction as FactionId },
        seed: game.seed as number,
      });
      
      // Replay actions to restore state (better approach than just loading state)
      const actions = await this.getGameActions(gameId);
      for (const a of actions) {
        const playerIndex = a.player_id === game.player1_id ? 0 : 1;
        engine.applyAction(playerIndex as 0 | 1, a.action_data);
      }
      
      engineCache.set(gameId, engine);
    }
    
    const state = engine.getState();
    
    // Determine player index
    const playerIndex = state.players[0].id === userId ? 0 : 1;
    
    // Validate it's their turn
    if (state.currentTurn !== playerIndex) {
      throw new Error('Not your turn');
    }
    
    // Apply action
    const result = engine.applyAction(playerIndex as 0 | 1, action);
    
    if (!result.success) {
      throw new Error(result.error ?? 'Invalid action');
    }
    
    // Record action
    await db.execute({
      sql: `INSERT INTO game_actions (id, game_id, player_id, action_type, action_data, result_events, turn_number)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [generateId(), gameId, userId, action.type, JSON.stringify(action), JSON.stringify(result.events), state.turnNumber],
    });
    
    const allEvents = [...result.events];
    
    // If playing against AI, let AI take turns
    const newState = engine.getState();
    if (newState.players[1].id === 'ai' && !engine.isGameOver() && newState.currentTurn === 1) {
      const aiEvents = await this.processAITurns(engine, gameId);
      allEvents.push(...aiEvents);
    }
    
    // Update game state
    const finalState = engine.getState();
    const isOver = engine.isGameOver();
    
    await db.execute({
      sql: `UPDATE games SET 
            current_state = ?, 
            status = ?,
            winner_id = ?,
            updated_at = datetime('now'),
            completed_at = ?
            WHERE id = ?`,
      args: [
        JSON.stringify(finalState),
        isOver ? 'completed' : 'active',
        isOver && finalState.winner !== null ? finalState.players[finalState.winner].id : null,
        isOver ? new Date().toISOString() : null,
        gameId,
      ],
    });
    
    const game = await this.getGame(gameId, userId);
    if (!game) throw new Error('Game not found after update');
    
    return { game, events: allEvents };
  }
  
  private async processAITurns(engine: GameEngine, gameId: string): Promise<unknown[]> {
    const db = getDb();
    const allEvents: unknown[] = [];
    
    while (!engine.isGameOver()) {
      const state = engine.getState();
      if (state.currentTurn !== 1) break; // Not AI's turn anymore
      
      const action = this.aiPlayer.chooseAction(state, 1);
      const result = engine.applyAction(1, action);
      
      if (!result.success) break;
      
      // Record AI action
      await db.execute({
        sql: `INSERT INTO game_actions (id, game_id, player_id, action_type, action_data, result_events, turn_number)
              VALUES (?, ?, 'ai', ?, ?, ?, ?)`,
        args: [generateId(), gameId, action.type, JSON.stringify(action), JSON.stringify(result.events), state.turnNumber],
      });
      
      allEvents.push(...result.events);
      
      // Prevent infinite loop
      if (action.type === 'end_turn') break;
    }
    
    return allEvents;
  }
  
  async getGameActions(gameId: string): Promise<ActionRecord[]> {
    const db = getDb();
    
    const result = await db.execute({
      sql: `SELECT * FROM game_actions WHERE game_id = ? ORDER BY created_at ASC`,
      args: [gameId],
    });
    
    return result.rows.map(row => ({
      ...row,
      action_data: JSON.parse(row.action_data as string),
      result_events: JSON.parse(row.result_events as string),
    })) as ActionRecord[];
  }
  
  async abandonGame(gameId: string, userId: string): Promise<void> {
    const db = getDb();
    
    await db.execute({
      sql: `UPDATE games SET status = 'abandoned', updated_at = datetime('now')
            WHERE id = ? AND (player1_id = ? OR player2_id = ?) AND status = 'active'`,
      args: [gameId, userId, userId],
    });
    
    engineCache.delete(gameId);
  }
  
  async getUserGames(userId: string, status?: string): Promise<Omit<GameRecord, 'current_state'>[]> {
    const db = getDb();
    
    let sql = `SELECT id, player1_id, player2_id, player1_faction, player2_faction, status, winner_id, seed, created_at, updated_at, completed_at
               FROM games WHERE (player1_id = ? OR player2_id = ?)`;
    const args: unknown[] = [userId, userId];
    
    if (status) {
      sql += ` AND status = ?`;
      args.push(status);
    }
    
    sql += ` ORDER BY created_at DESC`;
    
    const result = await db.execute({ sql, args });
    return result.rows as Omit<GameRecord, 'current_state'>[];
  }
}

export const gameService = new GameService();
