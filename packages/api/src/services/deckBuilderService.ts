import { getDb } from '../db/client.js';
import type { Card as LegacyCard, FactionId } from '@breach-protocol/game-engine';
import { isLegacyCardType } from '../types/cardTypes.js';
import type { Effect } from '../types/effects.js';

interface DbCard {
  id: string;
  type: string;
  card_type: string;
  faction: string;
  name: string;
  description: string | null;
  base_value: number | null;
  status: string;
  effects: string;
}

// Card representation for the new effect-based system
export interface GameCard {
  id: string;
  dbId: string;
  type: string;
  cardType: 'attack' | 'defense' | 'utility';
  name: string;
  faction: string;
  baseValue: number;
  isLegacy: boolean;
  effects: Effect[];
}

// Convert database card to legacy game engine format
function dbCardToLegacyCard(dbCard: DbCard, cardId: string): LegacyCard | null {
  if (!isLegacyCardType(dbCard.type)) return null;
  const baseValue = dbCard.base_value ?? 3;
  switch (dbCard.type) {
    case 'exploit':  return { type: 'exploit', id: cardId, baseDamage: baseValue };
    case 'payload':  return { type: 'payload', id: cardId };
    case 'zeroday':  return { type: 'zeroday', id: cardId };
    case 'siphon':   return { type: 'siphon', id: cardId };
    case 'firewall': return { type: 'firewall', id: cardId, blockValue: baseValue };
    case 'patch':    return { type: 'patch', id: cardId };
    case 'purge':    return { type: 'purge', id: cardId };
    default: return null;
  }
}

// Map a custom card to the nearest legacy type based on its category
function customCardToLegacyCard(dbCard: DbCard, cardId: string): LegacyCard {
  const baseValue = dbCard.base_value ?? 3;
  const category = dbCard.card_type || 'utility';
  switch (category) {
    case 'attack':  return { type: 'exploit', id: cardId, baseDamage: baseValue };
    case 'defense': return { type: 'firewall', id: cardId, blockValue: baseValue };
    case 'utility':
    default:        return { type: 'payload', id: cardId };
  }
}

function dbCardToGameCard(dbCard: DbCard, index: number): GameCard {
  let effects: Effect[] = [];
  try { effects = JSON.parse(dbCard.effects || '[]'); } catch { effects = []; }
  return {
    id: `${dbCard.id}-${index}`,
    dbId: dbCard.id,
    type: dbCard.type,
    cardType: (dbCard.card_type as 'attack' | 'defense' | 'utility') || 'utility',
    name: dbCard.name,
    faction: dbCard.faction,
    baseValue: dbCard.base_value ?? 0,
    isLegacy: isLegacyCardType(dbCard.type),
    effects,
  };
}

export interface DeckBuildResult {
  legacyDeck: LegacyCard[];
  gameCards: GameCard[];
  // Maps card ID (used in legacyDeck) to the card's display name from the DB
  cardIdToName: Record<string, string>;
  cardsByType: Record<string, number>;
  cardsByCategory: Record<string, number>;
  uniqueCardCount: number;
  totalCardCount: number;
  customCardCount: number;
  legacyCardCount: number;
  warnings: string[];
  errors: string[];
}

export async function buildDeckFromDatabase(
  faction: FactionId,
  includeStatus: ('active' | 'testing')[] = ['active'],
  copiesPerCard: number = 1
): Promise<DeckBuildResult> {
  const db = getDb();
  const warnings: string[] = [];
  const errors: string[] = [];

  const statusPlaceholders = includeStatus.map(() => '?').join(',');

  console.log(`[DeckBuilder] Fetching cards for ${faction} with status: [${includeStatus.join(', ')}]`);

  const result = await db.execute({
    sql: `SELECT * FROM cards WHERE faction = ? AND status IN (${statusPlaceholders}) ORDER BY card_type, type, name`,
    args: [faction, ...includeStatus],
  });

  const dbCards = result.rows as unknown as DbCard[];
  console.log(`[DeckBuilder] Found ${dbCards.length} unique cards for ${faction}`);

  if (dbCards.length === 0) {
    errors.push(`No cards found for ${faction} with status: ${includeStatus.join(', ')}`);
    return {
      legacyDeck: [], gameCards: [], cardIdToName: {},
      cardsByType: {}, cardsByCategory: {},
      uniqueCardCount: 0, totalCardCount: 0,
      customCardCount: 0, legacyCardCount: 0,
      warnings, errors,
    };
  }

  const legacyDeck: LegacyCard[] = [];
  const gameCards: GameCard[] = [];
  const cardIdToName: Record<string, string> = {};
  const cardsByType: Record<string, number> = {};
  const cardsByCategory: Record<string, number> = {};
  let cardIdCounter = 1;
  let customCardCount = 0;
  let legacyCardCount = 0;

  for (const dbCard of dbCards) {
    const isLegacy = isLegacyCardType(dbCard.type);

    cardsByType[dbCard.type] = (cardsByType[dbCard.type] || 0) + copiesPerCard;
    cardsByCategory[dbCard.card_type || 'utility'] = (cardsByCategory[dbCard.card_type || 'utility'] || 0) + copiesPerCard;

    for (let i = 0; i < copiesPerCard; i++) {
      const cardId = String(cardIdCounter);
      gameCards.push(dbCardToGameCard(dbCard, i));
      cardIdToName[cardId] = dbCard.name;

      if (isLegacy) {
        const legacyCard = dbCardToLegacyCard(dbCard, cardId);
        if (legacyCard) {
          legacyDeck.push(legacyCard);
          legacyCardCount++;
        }
      } else {
        // Map custom card to nearest legacy type so it participates in simulations
        const mapped = customCardToLegacyCard(dbCard, cardId);
        legacyDeck.push(mapped);
        customCardCount++;
      }

      cardIdCounter++;
    }
  }

  if (gameCards.length < 10) {
    warnings.push(`${faction} deck has only ${gameCards.length} cards. Recommend at least 10 for balanced gameplay.`);
  }

  if (customCardCount > 0) {
    warnings.push(
      `${customCardCount} custom card(s) in ${faction} deck are mapped to approximate legacy behaviour for simulation (attack→exploit, defense→firewall, utility→payload). Effect details are not simulated.`
    );
  }

  console.log(`[DeckBuilder] Built ${faction} deck:`);
  console.log(`  Total: ${gameCards.length} cards (${dbCards.length} unique)`);
  console.log(`  Legacy: ${legacyCardCount}, Custom (mapped): ${customCardCount}`);
  console.log(`  By type: ${JSON.stringify(cardsByType)}`);

  return {
    legacyDeck, gameCards, cardIdToName,
    cardsByType, cardsByCategory,
    uniqueCardCount: dbCards.length,
    totalCardCount: gameCards.length,
    customCardCount, legacyCardCount,
    warnings, errors,
  };
}

export async function getCardCountsByFaction(): Promise<Record<FactionId, {
  active: number; testing: number; disabled: number; total: number;
  byCategory: Record<string, number>;
}>> {
  const db = getDb();

  const result = await db.execute(`
    SELECT faction, card_type, status, COUNT(*) as count
    FROM cards
    WHERE faction IN ('phantom', 'sentinel')
    GROUP BY faction, card_type, status
  `);

  const counts: Record<string, {
    active: number; testing: number; disabled: number; total: number;
    byCategory: Record<string, number>;
  }> = {
    phantom: { active: 0, testing: 0, disabled: 0, total: 0, byCategory: {} },
    sentinel: { active: 0, testing: 0, disabled: 0, total: 0, byCategory: {} },
  };

  for (const row of result.rows) {
    const faction = row.faction as string;
    const status = row.status as string;
    const category = (row.card_type as string) || 'utility';
    const count = Number(row.count) || 0;
    if (!counts[faction]) continue;
    counts[faction].total += count;
    counts[faction].byCategory[category] = (counts[faction].byCategory[category] || 0) + count;
    if (status === 'active') counts[faction].active += count;
    else if (status === 'testing') counts[faction].testing += count;
    else if (status === 'disabled') counts[faction].disabled += count;
  }

  return counts as Record<FactionId, typeof counts[string]>;
}

export async function validateDeckIntegrity(faction: FactionId): Promise<{
  valid: boolean; activeCards: number; customCards: number; legacyCards: number; issues: string[];
}> {
  const db = getDb();
  const issues: string[] = [];

  const result = await db.execute({
    sql: `SELECT type, effects FROM cards WHERE faction = ? AND status = 'active'`,
    args: [faction],
  });

  let customCards = 0;
  let legacyCards = 0;

  for (const row of result.rows) {
    const type = row.type as string;
    if (isLegacyCardType(type)) {
      legacyCards++;
    } else {
      customCards++;
      let effects: Effect[] = [];
      try { effects = JSON.parse((row.effects as string) || '[]'); } catch { effects = []; }
      if (effects.length === 0) {
        issues.push(`Custom card type "${type}" has no effects`);
      }
    }
  }

  if (result.rows.length === 0) issues.push(`No active cards for ${faction}`);
  if (result.rows.length < 5) issues.push(`Only ${result.rows.length} active cards for ${faction} (recommend at least 5)`);

  return { valid: issues.length === 0, activeCards: result.rows.length, customCards, legacyCards, issues };
}
