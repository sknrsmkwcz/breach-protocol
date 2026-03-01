import { getDb } from '../db/client.js';
import { GameEngine, AIPlayer, type FactionId, type Card } from '@breach-protocol/game-engine';
import { generateId } from '../utils/id.js';
import { buildDeckFromDatabase, getCardCountsByFaction } from './deckBuilderService.js';

export interface SimulationConfig {
  gamesCount: number;
  faction1: FactionId;
  faction2: FactionId;
  seedStart?: number;
  includeTestingCards?: boolean;
}

export interface CardStats {
  timesPlayed: number;
  byFaction1: number;
  byFaction2: number;
}

export interface DetailedStats {
  // Damage tracking
  totalDamageDealt: { faction1: number; faction2: number };
  exploitDamage: { faction1: number; faction2: number };
  zerodayDamage: { faction1: number; faction2: number };
  siphonDamage: { faction1: number; faction2: number };
  purgeDamage: { faction1: number; faction2: number };
  backtraceDamage: { faction1: number; faction2: number };
  
  // Self damage
  zerodaySelfDamage: { faction1: number; faction2: number };
  
  // Healing
  totalHealing: { faction1: number; faction2: number };
  patchHealing: { faction1: number; faction2: number };
  siphonHealing: { faction1: number; faction2: number };
  
  // Firewall stats
  firewallsDeployed: { faction1: number; faction2: number };
  firewallsDestroyed: { faction1: number; faction2: number };
  firewallDamageBlocked: { faction1: number; faction2: number };
  
  // Card draw
  cardsDrawn: { faction1: number; faction2: number };
  patchCardDraw: { faction1: number; faction2: number };
  purgeCardDraw: { faction1: number; faction2: number };
  
  // Boost tracking
  boostsApplied: { faction1: number; faction2: number };
  boostsConsumed: { faction1: number; faction2: number };
  totalBoostDamage: { faction1: number; faction2: number };
}

export interface SimulationResult {
  gamesPlayed: number;
  faction1Wins: number;
  faction2Wins: number;
  averageTurns: number;
  averageFaction1FinalHp: number;
  averageFaction2FinalHp: number;
  cardStats: Record<string, CardStats>;
  detailedStats: DetailedStats;
  deckInfo: {
    faction1Cards: number;
    faction2Cards: number;
    faction1UniqueCards: number;
    faction2UniqueCards: number;
    warnings: string[];
  };
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

function createEmptyDetailedStats(): DetailedStats {
  return {
    totalDamageDealt: { faction1: 0, faction2: 0 },
    exploitDamage: { faction1: 0, faction2: 0 },
    zerodayDamage: { faction1: 0, faction2: 0 },
    siphonDamage: { faction1: 0, faction2: 0 },
    purgeDamage: { faction1: 0, faction2: 0 },
    backtraceDamage: { faction1: 0, faction2: 0 },
    zerodaySelfDamage: { faction1: 0, faction2: 0 },
    totalHealing: { faction1: 0, faction2: 0 },
    patchHealing: { faction1: 0, faction2: 0 },
    siphonHealing: { faction1: 0, faction2: 0 },
    firewallsDeployed: { faction1: 0, faction2: 0 },
    firewallsDestroyed: { faction1: 0, faction2: 0 },
    firewallDamageBlocked: { faction1: 0, faction2: 0 },
    cardsDrawn: { faction1: 0, faction2: 0 },
    patchCardDraw: { faction1: 0, faction2: 0 },
    purgeCardDraw: { faction1: 0, faction2: 0 },
    boostsApplied: { faction1: 0, faction2: 0 },
    boostsConsumed: { faction1: 0, faction2: 0 },
    totalBoostDamage: { faction1: 0, faction2: 0 },
  };
}

export class SimulationService {
  private aiPlayer = new AIPlayer();

  async createSimulation(userId: string, config: SimulationConfig): Promise<SimulationRecord> {
    const db = getDb();
    const id = generateId();

    const cardCounts = await getCardCountsByFaction();
    const f1Count = config.includeTestingCards 
      ? cardCounts[config.faction1].active + cardCounts[config.faction1].testing
      : cardCounts[config.faction1].active;
    const f2Count = config.includeTestingCards
      ? cardCounts[config.faction2].active + cardCounts[config.faction2].testing
      : cardCounts[config.faction2].active;

    console.log(`Starting simulation: ${config.faction1} (${f1Count} cards) vs ${config.faction2} (${f2Count} cards)`);

    await db.execute({
      sql: `INSERT INTO simulations (id, created_by, config, status, games_total)
            VALUES (?, ?, ?, 'pending', ?)`,
      args: [id, userId, JSON.stringify(config), config.gamesCount],
    });

    this.runSimulation(id, config).catch(err => {
      console.error('Simulation failed:', err);
    });

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
      const statusFilter: ('active' | 'testing')[] = config.includeTestingCards 
        ? ['active', 'testing'] 
        : ['active'];

      console.log(`Building decks with status filter: ${statusFilter.join(', ')}`);

      const [deck1Result, deck2Result] = await Promise.all([
        buildDeckFromDatabase(config.faction1, statusFilter),
        buildDeckFromDatabase(config.faction2, statusFilter),
      ]);

      const allWarnings = [...deck1Result.warnings, ...deck2Result.warnings];
      // Merge card ID→name maps from both decks
      const cardIdToName: Record<string, string> = {
        ...deck1Result.cardIdToName,
        ...deck2Result.cardIdToName,
      };

      console.log(`${config.faction1} deck: ${deck1Result.legacyDeck.length} cards`);
      console.log(`${config.faction2} deck: ${deck2Result.legacyDeck.length} cards`);

      if (deck1Result.legacyDeck.length === 0 || deck2Result.legacyDeck.length === 0) {
        throw new Error(`Cannot run simulation: ${config.faction1} has ${deck1Result.legacyDeck.length} cards, ${config.faction2} has ${deck2Result.legacyDeck.length} cards`);
      }

      let faction1Wins = 0;
      let faction2Wins = 0;
      let totalTurns = 0;
      let totalFaction1Hp = 0;
      let totalFaction2Hp = 0;

      const cardStats: Record<string, CardStats> = {};
      const detailedStats = createEmptyDetailedStats();

      const initCardStat = (label: string) => {
        if (!cardStats[label]) {
          cardStats[label] = { timesPlayed: 0, byFaction1: 0, byFaction2: 0 };
        }
      };

      const seedStart = config.seedStart ?? Date.now();

      for (let i = 0; i < config.gamesCount; i++) {
        const gameResult = this.runSingleGameWithDecks(
          config.faction1,
          config.faction2,
          deck1Result.legacyDeck,
          deck2Result.legacyDeck,
          seedStart + i,
          cardIdToName
        );

        if (gameResult.winner === 0) faction1Wins++;
        else faction2Wins++;

        totalTurns += gameResult.turns;
        totalFaction1Hp += gameResult.player1FinalHp;
        totalFaction2Hp += gameResult.player2FinalHp;

        // Aggregate card stats
        for (const [cardType, count] of Object.entries(gameResult.cardsPlayedByP1)) {
          initCardStat(cardType);
          cardStats[cardType].timesPlayed += count;
          cardStats[cardType].byFaction1 += count;
        }
        
        for (const [cardType, count] of Object.entries(gameResult.cardsPlayedByP2)) {
          initCardStat(cardType);
          cardStats[cardType].timesPlayed += count;
          cardStats[cardType].byFaction2 += count;
        }

        // Aggregate detailed stats
        const gs = gameResult.gameStats;
        detailedStats.totalDamageDealt.faction1 += gs.totalDamageDealt.p1;
        detailedStats.totalDamageDealt.faction2 += gs.totalDamageDealt.p2;
        detailedStats.exploitDamage.faction1 += gs.exploitDamage.p1;
        detailedStats.exploitDamage.faction2 += gs.exploitDamage.p2;
        detailedStats.zerodayDamage.faction1 += gs.zerodayDamage.p1;
        detailedStats.zerodayDamage.faction2 += gs.zerodayDamage.p2;
        detailedStats.siphonDamage.faction1 += gs.siphonDamage.p1;
        detailedStats.siphonDamage.faction2 += gs.siphonDamage.p2;
        detailedStats.purgeDamage.faction1 += gs.purgeDamage.p1;
        detailedStats.purgeDamage.faction2 += gs.purgeDamage.p2;
        detailedStats.backtraceDamage.faction1 += gs.backtraceDamage.p1;
        detailedStats.backtraceDamage.faction2 += gs.backtraceDamage.p2;
        detailedStats.zerodaySelfDamage.faction1 += gs.zerodaySelfDamage.p1;
        detailedStats.zerodaySelfDamage.faction2 += gs.zerodaySelfDamage.p2;
        detailedStats.totalHealing.faction1 += gs.totalHealing.p1;
        detailedStats.totalHealing.faction2 += gs.totalHealing.p2;
        detailedStats.patchHealing.faction1 += gs.patchHealing.p1;
        detailedStats.patchHealing.faction2 += gs.patchHealing.p2;
        detailedStats.siphonHealing.faction1 += gs.siphonHealing.p1;
        detailedStats.siphonHealing.faction2 += gs.siphonHealing.p2;
        detailedStats.firewallsDeployed.faction1 += gs.firewallsDeployed.p1;
        detailedStats.firewallsDeployed.faction2 += gs.firewallsDeployed.p2;
        detailedStats.firewallsDestroyed.faction1 += gs.firewallsDestroyed.p1;
        detailedStats.firewallsDestroyed.faction2 += gs.firewallsDestroyed.p2;
        detailedStats.firewallDamageBlocked.faction1 += gs.firewallDamageBlocked.p1;
        detailedStats.firewallDamageBlocked.faction2 += gs.firewallDamageBlocked.p2;
        detailedStats.cardsDrawn.faction1 += gs.cardsDrawn.p1;
        detailedStats.cardsDrawn.faction2 += gs.cardsDrawn.p2;
        detailedStats.patchCardDraw.faction1 += gs.patchCardDraw.p1;
        detailedStats.patchCardDraw.faction2 += gs.patchCardDraw.p2;
        detailedStats.purgeCardDraw.faction1 += gs.purgeCardDraw.p1;
        detailedStats.purgeCardDraw.faction2 += gs.purgeCardDraw.p2;
        detailedStats.boostsApplied.faction1 += gs.boostsApplied.p1;
        detailedStats.boostsApplied.faction2 += gs.boostsApplied.p2;
        detailedStats.boostsConsumed.faction1 += gs.boostsConsumed.p1;
        detailedStats.boostsConsumed.faction2 += gs.boostsConsumed.p2;
        detailedStats.totalBoostDamage.faction1 += gs.totalBoostDamage.p1;
        detailedStats.totalBoostDamage.faction2 += gs.totalBoostDamage.p2;

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
        cardStats,
        detailedStats,
        deckInfo: {
          faction1Cards: deck1Result.legacyDeck.length,
          faction2Cards: deck2Result.legacyDeck.length,
          faction1UniqueCards: deck1Result.uniqueCardCount,
          faction2UniqueCards: deck2Result.uniqueCardCount,
          warnings: allWarnings,
        },
      };

      console.log(`Simulation complete: ${faction1Wins} vs ${faction2Wins}`);

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
      console.error('Simulation error:', error);
      await db.execute({
        sql: `UPDATE simulations SET status = 'failed', completed_at = datetime('now') WHERE id = ?`,
        args: [id],
      });
      throw error;
    }
  }

  private runSingleGameWithDecks(
    faction1: FactionId,
    faction2: FactionId,
    deck1: Card[],
    deck2: Card[],
    seed: number,
    cardIdToName: Record<string, string> = {}
  ) {
    const engine = new GameEngine({
      gameId: `sim-${seed}`,
      player1: { id: 'sim1', name: 'AI 1', faction: faction1, deck: [...deck1] },
      player2: { id: 'sim2', name: 'AI 2', faction: faction2, deck: [...deck2] },
      seed,
    });

    let turns = 0;
    const maxTurns = 100;

    const cardsPlayedByP1: Record<string, number> = {};
    const cardsPlayedByP2: Record<string, number> = {};

    // Detailed game stats
    const gameStats = {
      totalDamageDealt: { p1: 0, p2: 0 },
      exploitDamage: { p1: 0, p2: 0 },
      zerodayDamage: { p1: 0, p2: 0 },
      siphonDamage: { p1: 0, p2: 0 },
      purgeDamage: { p1: 0, p2: 0 },
      backtraceDamage: { p1: 0, p2: 0 },
      zerodaySelfDamage: { p1: 0, p2: 0 },
      totalHealing: { p1: 0, p2: 0 },
      patchHealing: { p1: 0, p2: 0 },
      siphonHealing: { p1: 0, p2: 0 },
      firewallsDeployed: { p1: 0, p2: 0 },
      firewallsDestroyed: { p1: 0, p2: 0 },
      firewallDamageBlocked: { p1: 0, p2: 0 },
      cardsDrawn: { p1: 0, p2: 0 },
      patchCardDraw: { p1: 0, p2: 0 },
      purgeCardDraw: { p1: 0, p2: 0 },
      boostsApplied: { p1: 0, p2: 0 },
      boostsConsumed: { p1: 0, p2: 0 },
      totalBoostDamage: { p1: 0, p2: 0 },
    };

    while (!engine.isGameOver() && turns < maxTurns) {
      const state = engine.getState();
      const currentPlayer = state.currentTurn;
      const playerKey = currentPlayer === 0 ? 'p1' : 'p2';
      const opponentKey = currentPlayer === 0 ? 'p2' : 'p1';
      
      const action = this.aiPlayer.chooseAction(state, currentPlayer);

      // Track card play and stats
      if (action.type === 'play_card') {
        const hand = state.players[currentPlayer].hand;
        if (action.cardIndex >= 0 && action.cardIndex < hand.length) {
          const card = hand[action.cardIndex];
          const tracker = currentPlayer === 0 ? cardsPlayedByP1 : cardsPlayedByP2;
          // Track by card name when available, fall back to legacy type
          const cardLabel = cardIdToName[String(card.id)] || card.type;
          tracker[cardLabel] = (tracker[cardLabel] || 0) + 1;

          const opponent = state.players[1 - currentPlayer];
          const self = state.players[currentPlayer];

          // Track stats based on card type
          switch (card.type) {
            case 'exploit': {
              const boost = self.boost || 0;
              const baseDamage = 'baseDamage' in card ? card.baseDamage : 3;
              const totalDamage = baseDamage + boost;
              
              if (boost > 0) {
                gameStats.boostsConsumed[playerKey]++;
                gameStats.totalBoostDamage[playerKey] += boost;
              }

              // Calculate firewall interaction
              const fwTotal = opponent.firewalls.reduce((sum, fw) => sum + fw.value, 0);
              if (fwTotal > 0) {
                const blocked = Math.min(fwTotal, totalDamage);
                const overflow = Math.max(0, totalDamage - fwTotal);
                gameStats.firewallDamageBlocked[opponentKey] += blocked;
                if (overflow > 0) {
                  gameStats.exploitDamage[playerKey] += overflow;
                  gameStats.totalDamageDealt[playerKey] += overflow;
                }
                // Backtrace damage
                if (totalDamage < fwTotal) {
                  // No backtrace if blocked
                } else {
                  const backtrace = totalDamage - fwTotal;
                  if (backtrace > 0 && opponent.firewalls.length > 0) {
                    gameStats.backtraceDamage[opponentKey] += backtrace;
                  }
                }
              } else {
                gameStats.exploitDamage[playerKey] += totalDamage;
                gameStats.totalDamageDealt[playerKey] += totalDamage;
              }
              break;
            }
            case 'payload':
              gameStats.boostsApplied[playerKey]++;
              break;
            case 'zeroday':
              gameStats.zerodayDamage[playerKey] += 4;
              gameStats.totalDamageDealt[playerKey] += 4;
              gameStats.zerodaySelfDamage[playerKey] += 2;
              break;
            case 'siphon':
              if (opponent.firewalls.length > 0) {
                gameStats.siphonHealing[playerKey] += 1;
                gameStats.totalHealing[playerKey] += 1;
                // Firewall drain tracked as destroyed if value <= 1
                const fw = opponent.firewalls[0];
                if (fw && fw.value <= 1) {
                  gameStats.firewallsDestroyed[opponentKey]++;
                }
              } else {
                gameStats.siphonDamage[playerKey] += 2;
                gameStats.totalDamageDealt[playerKey] += 2;
              }
              break;
            case 'firewall':
              gameStats.firewallsDeployed[playerKey]++;
              break;
            case 'patch':
              if (self.hp <= 10) {
                gameStats.patchHealing[playerKey] += 3;
                gameStats.totalHealing[playerKey] += 3;
              } else {
                gameStats.patchCardDraw[playerKey] += 2;
                gameStats.cardsDrawn[playerKey] += 2;
              }
              break;
            case 'purge': {
              const fwCount = self.firewalls.length;
              if (fwCount > 0) {
                gameStats.firewallsDestroyed[playerKey] += fwCount;
                gameStats.purgeDamage[playerKey] += fwCount;
                gameStats.totalDamageDealt[playerKey] += fwCount;
              }
              gameStats.purgeCardDraw[playerKey]++;
              gameStats.cardsDrawn[playerKey]++;
              break;
            }
          }
        }
      }

      // Track end turn card draw
      if (action.type === 'end_turn') {
        const nextPlayer = 1 - currentPlayer;
        const nextKey = nextPlayer === 0 ? 'p1' : 'p2';
        gameStats.cardsDrawn[nextKey]++;
      }

      engine.applyAction(currentPlayer, action);

      if (action.type === 'end_turn') turns++;
    }

    const finalState = engine.getState();

    return {
      winner: finalState.winner ?? (finalState.players[0].hp > finalState.players[1].hp ? 0 : 1),
      turns: finalState.turnNumber,
      player1FinalHp: Math.max(0, finalState.players[0].hp),
      player2FinalHp: Math.max(0, finalState.players[1].hp),
      cardsPlayedByP1,
      cardsPlayedByP2,
      gameStats,
    };
  }
}

export const simulationService = new SimulationService();
