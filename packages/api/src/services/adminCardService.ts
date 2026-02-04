import { getDb } from '../db/client.js';
import { generateId } from '../utils/id.js';
import type { Card } from './cardService.js';

export interface CreateCardInput {
  type: string;
  faction: string;
  name: string;
  description?: string;
  base_value?: number;
  status?: string;
}

export interface UpdateCardInput {
  type?: string;
  faction?: string;
  name?: string;
  description?: string;
  base_value?: number;
  status?: string;
}

export class AdminCardService {
  async getAllCards(): Promise<Card[]> {
    const db = getDb();
    const result = await db.execute(
      `SELECT id, type, faction, name, description, base_value, status FROM cards ORDER BY faction, type, name`
    );
    return result.rows as Card[];
  }
  
  async createCard(input: CreateCardInput): Promise<Card> {
    const db = getDb();
    const id = generateId();
    
    await db.execute({
      sql: `INSERT INTO cards (id, type, faction, name, description, base_value, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [id, input.type, input.faction, input.name, input.description ?? null, input.base_value ?? null, input.status ?? 'testing'],
    });
    
    const result = await db.execute({
      sql: `SELECT * FROM cards WHERE id = ?`,
      args: [id],
    });
    
    return result.rows[0] as Card;
  }
  
  async updateCard(id: string, input: UpdateCardInput): Promise<Card | null> {
    const db = getDb();
    
    const sets: string[] = [];
    const args: unknown[] = [];
    
    if (input.type !== undefined) { sets.push('type = ?'); args.push(input.type); }
    if (input.faction !== undefined) { sets.push('faction = ?'); args.push(input.faction); }
    if (input.name !== undefined) { sets.push('name = ?'); args.push(input.name); }
    if (input.description !== undefined) { sets.push('description = ?'); args.push(input.description); }
    if (input.base_value !== undefined) { sets.push('base_value = ?'); args.push(input.base_value); }
    if (input.status !== undefined) { sets.push('status = ?'); args.push(input.status); }
    
    if (sets.length === 0) return null;
    
    sets.push("updated_at = datetime('now')");
    args.push(id);
    
    await db.execute({
      sql: `UPDATE cards SET ${sets.join(', ')} WHERE id = ?`,
      args,
    });
    
    const result = await db.execute({
      sql: `SELECT * FROM cards WHERE id = ?`,
      args: [id],
    });
    
    return result.rows[0] as Card | null;
  }
  
  async updateCardStatus(id: string, status: string): Promise<Card | null> {
    return this.updateCard(id, { status });
  }
}

export const adminCardService = new AdminCardService();
