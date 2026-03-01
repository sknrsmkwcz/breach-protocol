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

// Convert database card to legacy game engine format (for backward compatibility)
function dbCardToLegacyCard(dbCard: DbCard, cardId: number): LegacyCard | null {
  if (!isLegacyCardType(dbCard.type)) {
    return null; // Not a legacy card
  }
  
  const baseValue = dbCard.base_value ?? 3;

  switch (dbCard.type) {
    case 'exploit':
      return { type: 'exploit', id: cardId, baseDamage: baseValue };
    case 'payload':
      return { type: 'payload', id: cardId };
    case 'zeroday':
      return { type: 'zeroday', id: cardId };
    case 'siphon':
      return { type: 'siphon', id: cardId };
    case 'firewall':
      return { type: 'firewall', id: cardId, blockValue: baseValue };
    case 'patch':
      return { type: 'patch', id: cardId };
    case 'purge':
      return { type: 'purge', id: cardId };
    default:
      return null;
  }
}

// Convert database card to new GameCard format
function dbCardToGameCard(dbCard: DbCard, index: number): GameCard {
  let effects: Effect[] = [];
  try {
    effects = JSON.parse(dbCard.effects || '[]');
  } catch {
    effects = [];
  }

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
  // Legacy deck for backward compatibility
  legacyDeck: LegacyCard[];
  // New format with all cards including custom effect cards
  gameCards: GameCard[];
  // Metadata
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
      legacyDeck: [],
      gameCards: [],
      cardsByType: {},
      cardsByCategory: {},
      uniqueCardCount: 0,
      totalCardCount: 0,
      customCardCount: 0,
      legacyCardCount: 0,
      warnings,
      errors,
    };
  }

  const legacyDeck: LegacyCard[] = [];
  const gameCards: GameCard[] = [];
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
      // Create GameCard (new format)
      const gameCard = dbCardToGameCard(dbCard, i);
      gameCards.push(gameCard);

      // Create legacy card if applicable
      if (isLegacy) {
        const legacyCard = dbCardToLegacyCard(dbCard, cardIdCounter);
        if (legacyCard) {
          legacyDeck.push(legacyCard);
          legacyCardCount++;
        }
      } else {
        customCardCount++;
        warnings.push(`"${dbCard.name}" is a custom card and is not yet supported by the simulation engine — it will be excluded from games`);
      }

      cardIdCounter++;
    }
  }

  if (gameCards.length < 10) {
    warnings.push(
      `${faction} deck has only ${gameCards.length} cards. Recommend at least 10 for balanced gameplay.`
    );
  }

  console.log(`[DeckBuilder] Built ${faction} deck:`);
  console.log(`  Total: ${gameCards.length} cards (${dbCards.length} unique)`);
  console.log(`  Legacy: ${legacyCardCount}, Custom: ${customCardCount}`);
  console.log(`  By type: ${JSON.stringify(cardsByType)}`);
  console.log(`  By category: ${JSON.stringify(cardsByCategory)}`);

  return {
    legacyDeck,
    gameCards,
    cardsByType,
    cardsByCategory,
    uniqueCardCount: dbCards.length,
    totalCardCount: gameCards.length,
    customCardCount,
    legacyCardCount,
    warnings,
    errors,
  };
}

export async function getCardCountsByFaction(): Promise<Record<FactionId, {
  active: number;
  testing: number;
  disabled: number;
  total: number;
  byCategory: Record<string, number>;
}>> {
  const db = getDb();

  const result = await db.execute(`
    SELECT
      faction,
      card_type,
      status,
      COUNT(*) as count
    FROM cards
    WHERE faction IN ('phantom', 'sentinel')
    GROUP BY faction, card_type, status
  `);

  const counts: Record<string, {
    active: number;
    testing: number;
    disabled: number;
    total: number;
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
  valid: boolean;
  activeCards: number;
  customCards: number;
  legacyCards: number;
  issues: string[];
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
      // Check if custom card has effects
      let effects: Effect[] = [];
      try {
        effects = JSON.parse((row.effects as string) || '[]');
      } catch {
        effects = [];
      }
      if (effects.length === 0) {
        issues.push(`Custom card type "${type}" has no effects`);
      }
    }
  }

  if (result.rows.length === 0) {
    issues.push(`No active cards for ${faction}`);
  }

  if (result.rows.length < 5) {
    issues.push(`Only ${result.rows.length} active cards for ${faction} (recommend at least 5)`);
  }

  return {
    valid: issues.length === 0,
    activeCards: result.rows.length,
    customCards,
    legacyCards,
    issues,
  };
}
