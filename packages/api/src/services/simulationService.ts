import { getDb } from '../db/client.js';
import { GameEngine, AIPlayer, type FactionId } from '@breach-protocol/game-engine';
import { generateId } from '../utils/id.js';

export interface SimulationConfig {
  gamesCount: number;
  faction1: FactionId;
  faction2: FactionId;
  seedStart?: number;
}

export interface SimulationResult {
  gamesPlayed: number;
  faction1Wins: number;
  faction2Wins: number;
  averageTurns: number;
  averageFaction1FinalHp: number;
  averageFaction2FinalHp: number;
}

export interface SimulationRecord {
  id: string;
  created_by: string;
  config: SimulationConfig;
  status: 'pending' | 'running' | 'completed' | 'failed';
  results: SimulationResult | null;
  games_total: number;
  games_completed: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export class SimulationService {
  private aiPlayer = new AIPlayer();
  
  async createSimulation(userId: string, config: SimulationConfig): Promise<SimulationRecord> {
    const db = getDb();
    const id = generateId();
    
    await db.execute({
      sql: `INSERT INTO simulations (id, created_by, config, status, games_total)
            VALUES (?, ?, ?, 'pending', ?)`,
      args: [id, userId, JSON.stringify(config), config.gamesCount],
    });
    
    // Start simulation in background (non-blocking)
    this.runSimulation(id, config).catch(console.error);
    
    return {
      id,
      created_by: userId,
      config,
      status: 'pending',
      results: null,
      games_total: config.gamesCount,
      games_completed: 0,
      created_at: new Date().toISOString(),
      started_at: null,
      completed_at: null,
    };
  }
  
  async getSimulation(id: string): Promise<SimulationRecord | null> {
    const db = getDb();
    
    const result = await db.execute({
      sql: `SELECT * FROM simulations WHERE id = ?`,
      args: [id],
    });
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      ...row,
      config: JSON.parse(row.config as string),
      results: row.results ? JSON.parse(row.results as string) : null,
    } as SimulationRecord;
  }
  
  async listSimulations(userId?: string): Promise<SimulationRecord[]> {
    const db = getDb();
    
    let sql = `SELECT * FROM simulations`;
    const args: unknown[] = [];
    
    if (userId) {
      sql += ` WHERE created_by = ?`;
      args.push(userId);
    }
    
    sql += ` ORDER BY created_at DESC LIMIT 50`;
    
    const result = await db.execute({ sql, args });
    
    return result.rows.map(row => ({
      ...row,
      config: JSON.parse(row.config as string),
      results: row.results ? JSON.parse(row.results as string) : null,
    })) as SimulationRecord[];
  }
  
  private async runSimulation(id: string, config: SimulationConfig): Promise<void> {
    const db = getDb();
    
    await db.execute({
      sql: `UPDATE simulations SET status = 'running', started_at = datetime('now') WHERE id = ?`,
      args: [id],
    });
    
    try {
      let faction1Wins = 0;
      let faction2Wins = 0;
      let totalTurns = 0;
      let totalFaction1Hp = 0;
      let totalFaction2Hp = 0;
      
      const seedStart = config.seedStart ?? Date.now();
      
      for (let i = 0; i < config.gamesCount; i++) {
        const result = this.runSingleGame(config.faction1, config.faction2, seedStart + i);
        
        if (result.winner === 0) faction1Wins++;
        else faction2Wins++;
        
        totalTurns += result.turns;
        totalFaction1Hp += result.player1FinalHp;
        totalFaction2Hp += result.player2FinalHp;
        
        // Update progress every 10 games
        if ((i + 1) % 10 === 0) {
          await db.execute({
            sql: `UPDATE simulations SET games_completed = ? WHERE id = ?`,
            args: [i + 1, id],
          });
        }
      }
      
      const results: SimulationResult = {
        gamesPlayed: config.gamesCount,
        faction1Wins,
        faction2Wins,
        averageTurns: Math.round(totalTurns / config.gamesCount),
        averageFaction1FinalHp: Math.round((totalFaction1Hp / config.gamesCount) * 10) / 10,
        averageFaction2FinalHp: Math.round((totalFaction2Hp / config.gamesCount) * 10) / 10,
      };
      
      await db.execute({
        sql: `UPDATE simulations SET 
              status = 'completed', 
              results = ?, 
              games_completed = ?,
              completed_at = datetime('now')
              WHERE id = ?`,
        args: [JSON.stringify(results), config.gamesCount, id],
      });
    } catch (error) {
      await db.execute({
        sql: `UPDATE simulations SET status = 'failed', completed_at = datetime('now') WHERE id = ?`,
        args: [id],
      });
      throw error;
    }
  }
  
  private runSingleGame(faction1: FactionId, faction2: FactionId, seed: number) {
    const engine = new GameEngine({
      gameId: `sim-${seed}`,
      player1: { id: 'sim1', name: 'AI 1', faction: faction1 },
      player2: { id: 'sim2', name: 'AI 2', faction: faction2 },
      seed,
    });
    
    let turns = 0;
    const maxTurns = 100;
    
    while (!engine.isGameOver() && turns < maxTurns) {
      const state = engine.getState();
      const action = this.aiPlayer.chooseAction(state, state.currentTurn);
      engine.applyAction(state.currentTurn, action);
      
      if (action.type === 'end_turn') turns++;
    }
    
    const finalState = engine.getState();
    
    return {
      winner: finalState.winner ?? (finalState.players[0].hp > finalState.players[1].hp ? 0 : 1),
      turns: finalState.turnNumber,
      player1FinalHp: Math.max(0, finalState.players[0].hp),
      player2FinalHp: Math.max(0, finalState.players[1].hp),
    };
  }
}

export const simulationService = new SimulationService();
