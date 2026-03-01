import { getDb } from '../db/client.js';
import { generateId } from '../utils/id.js';
import { validateEffects, generateEffectText } from './effectValidationService.js';
import { isLegacyCardType, getCategoryFromLegacyType, type CardCategory } from '../types/cardTypes.js';
import type { Effect } from '../types/effects.js';

export interface CardInput {
  type?: string;
  cardType?: CardCategory;
  faction: 'phantom' | 'sentinel' | 'neutral';
  name: string;
  description?: string | null;
  base_value?: number | null;
  status?: 'active' | 'disabled' | 'testing';
  effects?: Effect[];
}

export interface DbCard {
  id: string;
  type: string;
  card_type: CardCategory;
  faction: string;
  name: string;
  description: string | null;
  base_value: number | null;
  status: string;
  effects: string;
  generated_text: string | null;
  created_at: string;
  updated_at: string;
}

function parseCard(row: unknown): DbCard & { effects: Effect[] } {
  const r = row as DbCard;
  let effects: Effect[] = [];
  try {
    effects = JSON.parse(r.effects || '[]');
  } catch {
    effects = [];
  }
  return { ...r, effects };
}

// Normalize card type for storage
function normalizeCardType(type: string): string {
  // Convert to lowercase, replace spaces with underscores
  return type.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

export const adminCardService = {
  async getAllCards() {
    const db = getDb();
    const result = await db.execute(`SELECT * FROM cards ORDER BY faction, card_type, type, name`);
    return result.rows.map(parseCard);
  },

  async getCardById(id: string) {
    const db = getDb();
    const result = await db.execute({
      sql: `SELECT * FROM cards WHERE id = ?`,
      args: [id],
    });
    if (result.rows.length === 0) return null;
    return parseCard(result.rows[0]);
  },

  async createCard(input: CardInput) {
    const db = getDb();
    const id = generateId();
    
    // Normalize the type (derive from name if not provided)
    const rawType = input.type || input.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    const normalizedType = normalizeCardType(rawType);
    
    // Determine card_type (category)
    let cardType: CardCategory;
    if (input.cardType) {
      cardType = input.cardType;
    } else if (isLegacyCardType(normalizedType)) {
      cardType = getCategoryFromLegacyType(normalizedType);
    } else {
      cardType = 'utility'; // Default for new custom cards
    }
    
    // Validate effects if provided
    const effects = input.effects || [];
    if (effects.length > 0) {
      const validation = validateEffects(effects);
      if (!validation.valid) {
        throw new Error(`Invalid effects: ${validation.errors.map(e => e.message).join(', ')}`);
      }
    }
    
    // Generate effect text
    const generatedText = effects.length > 0 ? generateEffectText(effects) : null;

    await db.execute({
      sql: `INSERT INTO cards (id, type, card_type, faction, name, description, base_value, status, effects, generated_text)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        normalizedType,
        cardType,
        input.faction,
        input.name,
        input.description || null,
        input.base_value ?? null,
        input.status || 'active',
        JSON.stringify(effects),
        generatedText,
      ],
    });

    return this.getCardById(id);
  },

  async updateCard(id: string, input: Partial<CardInput>) {
    const db = getDb();
    const existing = await this.getCardById(id);
    if (!existing) return null;

    // Build update
    const updates: string[] = [];
    const args: unknown[] = [];

    if (input.type !== undefined) {
      const normalizedType = normalizeCardType(input.type);
      updates.push('type = ?');
      args.push(normalizedType);
      
      // Auto-update card_type if it's a legacy type and no explicit cardType provided
      if (!input.cardType && isLegacyCardType(normalizedType)) {
        updates.push('card_type = ?');
        args.push(getCategoryFromLegacyType(normalizedType));
      }
    }
    
    if (input.cardType !== undefined) {
      updates.push('card_type = ?');
      args.push(input.cardType);
    }

    if (input.faction !== undefined) {
      updates.push('faction = ?');
      args.push(input.faction);
    }

    if (input.name !== undefined) {
      updates.push('name = ?');
      args.push(input.name);
    }

    if (input.description !== undefined) {
      updates.push('description = ?');
      args.push(input.description || null);
    }

    if (input.base_value !== undefined) {
      updates.push('base_value = ?');
      args.push(input.base_value);
    }

    if (input.status !== undefined) {
      updates.push('status = ?');
      args.push(input.status);
    }

    if (input.effects !== undefined) {
      const effects = input.effects;
      if (effects.length > 0) {
        const validation = validateEffects(effects);
        if (!validation.valid) {
          throw new Error(`Invalid effects: ${validation.errors.map(e => e.message).join(', ')}`);
        }
      }
      updates.push('effects = ?');
      args.push(JSON.stringify(effects));
      
      // Regenerate effect text
      const generatedText = effects.length > 0 ? generateEffectText(effects) : null;
      updates.push('generated_text = ?');
      args.push(generatedText);
    }

    if (updates.length === 0) return existing;

    updates.push("updated_at = datetime('now')");
    args.push(id);

    await db.execute({
      sql: `UPDATE cards SET ${updates.join(', ')} WHERE id = ?`,
      args,
    });

    return this.getCardById(id);
  },

  async updateCardStatus(id: string, status: 'active' | 'disabled' | 'testing') {
    return this.updateCard(id, { status });
  },

  async updateCardEffects(id: string, effects: Effect[]) {
    return this.updateCard(id, { effects });
  },

  async duplicateCard(id: string) {
    const existing = await this.getCardById(id);
    if (!existing) return null;

    return this.createCard({
      type: existing.type,
      cardType: existing.card_type,
      faction: existing.faction as 'phantom' | 'sentinel' | 'neutral',
      name: `${existing.name} (Copy)`,
      description: existing.description || undefined,
      base_value: existing.base_value,
      status: 'testing',
      effects: existing.effects,
    });
  },

  async deleteCard(id: string) {
    const db = getDb();
    const existing = await this.getCardById(id);
    if (!existing) return null;
    await db.execute({ sql: `DELETE FROM cards WHERE id = ?`, args: [id] });
    return existing;
  },

  async getCardTypes() {
    const db = getDb();
    const result = await db.execute(`
      SELECT DISTINCT type, card_type, COUNT(*) as count 
      FROM cards 
      GROUP BY type, card_type 
      ORDER BY card_type, type
    `);
    return result.rows;
  },
};
