import { getDb } from '../db/client.js';
import { GameEngine, AIPlayer } from '@breach-protocol/game-engine';
import type { GameState, GameAction, FactionId, PlayerIndex } from '@breach-protocol/game-engine';
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
  is_vs_ai: boolean;
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
    console.log('[GameService] Creating game with options:', options);
    
    const db = getDb();
    const gameId = generateId();
    const seed = Math.floor(Math.random() * 2147483647);
    
    const isVsAI = options.vsAI !== false;
    // Use NULL for player2_id when playing against AI
    const player2Id = isVsAI ? null : null; // Will be set when another player joins
    
    console.log('[GameService] Creating GameEngine...');
    
    const engine = new GameEngine({
      gameId,
      player1: { id: options.playerId, name: 'Player', faction: options.playerFaction },
      player2: { id: 'ai', name: 'AI', faction: options.opponentFaction },
      seed,
    });
    
    console.log('[GameService] GameEngine created successfully');
    
    const state = engine.getState();
    
    console.log('[GameService] Inserting into database...');
    
    // Note: player2_id is NULL for AI games - we track AI via the is_vs_ai flag
    await db.execute({
      sql: `INSERT INTO games (id, player1_id, player2_id, player1_faction, player2_faction, status, seed, current_state)
            VALUES (?, ?, ?, ?, ?, 'active', ?, ?)`,
      args: [gameId, options.playerId, player2Id, options.playerFaction, options.opponentFaction, seed, JSON.stringify(state)],
    });
    
    console.log('[GameService] Game saved to database');
    
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
      is_vs_ai: isVsAI,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_at: null,
    };
  }
  
  async getGame(gameId: string): Promise<GameRecord | null> {
    const db = getDb();
    
    const result = await db.execute({
      sql: `SELECT * FROM games WHERE id = ?`,
      args: [gameId],
    });
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    // If player2_id is NULL, it's an AI game
    const isVsAI = row.player2_id === null;
    
    return {
      id: row.id as string,
      player1_id: row.player1_id as string,
      player2_id: row.player2_id as string | null,
      player1_faction: row.player1_faction as string,
      player2_faction: row.player2_faction as string,
      status: row.status as 'active' | 'completed' | 'abandoned',
      winner_id: row.winner_id as string | null,
      seed: row.seed as number,
      current_state: JSON.parse(row.current_state as string),
      is_vs_ai: isVsAI,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      completed_at: row.completed_at as string | null,
    };
  }
  
  async submitAction(gameId: string, userId: string, action: GameAction): Promise<{ game: GameRecord; events: unknown[] }> {
    const db = getDb();
    
    // Get or restore engine
    let engine = engineCache.get(gameId);
    
    const game = await this.getGame(gameId);
    if (!game || game.status !== 'active') {
      throw new Error('Game not found or not active');
    }
    
    // Verify user is player1 (player2 is AI or null)
    if (game.player1_id !== userId) {
      throw new Error('Not a participant in this game');
    }
    
    if (!engine) {
      // Restore engine from seed and replay actions
      engine = new GameEngine({
        gameId: game.id,
        player1: { id: game.player1_id, name: 'Player', faction: game.player1_faction as FactionId },
        player2: { id: 'ai', name: 'AI', faction: game.player2_faction as FactionId },
        seed: game.seed,
      });
      
      // Replay actions to restore state
      const actions = await this.getGameActions(gameId);
      for (const a of actions) {
        const playerIndex = a.player_id === game.player1_id ? 0 : 1;
        engine.applyAction(playerIndex as PlayerIndex, a.action_data);
      }
      
      engineCache.set(gameId, engine);
    }
    
    const state = engine.getState();
    
    // Player is always index 0 in AI games
    const playerIndex = 0;
    
    // Validate it's their turn
    if (state.currentTurn !== playerIndex) {
      throw new Error('Not your turn');
    }
    
    // Apply action
    const result = engine.applyAction(playerIndex as PlayerIndex, action);
    
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
    if (game.is_vs_ai && !engine.isGameOver() && engine.getState().currentTurn === 1) {
      const aiEvents = await this.processAITurns(engine, gameId);
      allEvents.push(...aiEvents);
    }
    
    // Update game state
    const finalState = engine.getState();
    const isOver = engine.isGameOver();
    
    // Winner: player1 if winner index is 0, null (AI) if winner index is 1
    let winnerId: string | null = null;
    if (isOver && finalState.winner !== null) {
      winnerId = finalState.winner === 0 ? game.player1_id : null; // AI has no user ID
    }
    
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
        winnerId,
        isOver ? new Date().toISOString() : null,
        gameId,
      ],
    });
    
    const updatedGame = await this.getGame(gameId);
    if (!updatedGame) throw new Error('Game not found after update');
    
    return { game: updatedGame, events: allEvents };
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
      
      // Record AI action (use 'ai' as player_id for tracking)
      await db.execute({
        sql: `INSERT INTO game_actions (id, game_id, player_id, action_type, action_data, result_events, turn_number)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [generateId(), gameId, 'ai', action.type, JSON.stringify(action), JSON.stringify(result.events), state.turnNumber],
      });
      
      allEvents.push(...result.events);
      
      // Only break after end_turn to allow AI to use all actions
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
      id: row.id as string,
      game_id: row.game_id as string,
      player_id: row.player_id as string,
      action_type: row.action_type as string,
      action_data: JSON.parse(row.action_data as string),
      result_events: JSON.parse(row.result_events as string),
      turn_number: row.turn_number as number,
      created_at: row.created_at as string,
    }));
  }
  
  async abandonGame(gameId: string, userId: string): Promise<void> {
    const db = getDb();
    
    await db.execute({
      sql: `UPDATE games SET status = 'abandoned', updated_at = datetime('now')
            WHERE id = ? AND player1_id = ? AND status = 'active'`,
      args: [gameId, userId],
    });
    
    engineCache.delete(gameId);
  }
  
  async getUserGames(userId: string, status?: string): Promise<Omit<GameRecord, 'current_state'>[]> {
    const db = getDb();
    
    let sql = `SELECT id, player1_id, player2_id, player1_faction, player2_faction, status, winner_id, seed, created_at, updated_at, completed_at
               FROM games WHERE player1_id = ?`;
    const args: unknown[] = [userId];
    
    if (status) {
      sql += ` AND status = ?`;
      args.push(status);
    }
    
    sql += ` ORDER BY created_at DESC`;
    
    const result = await db.execute({ sql, args });
    
    return result.rows.map(row => ({
      id: row.id as string,
      player1_id: row.player1_id as string,
      player2_id: row.player2_id as string | null,
      player1_faction: row.player1_faction as string,
      player2_faction: row.player2_faction as string,
      status: row.status as 'active' | 'completed' | 'abandoned',
      winner_id: row.winner_id as string | null,
      seed: row.seed as number,
      is_vs_ai: row.player2_id === null,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      completed_at: row.completed_at as string | null,
    }));
  }
}

export const gameService = new GameService();
