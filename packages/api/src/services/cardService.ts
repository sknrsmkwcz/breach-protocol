import { getDb } from '../db/client.js';

export interface Card {
  id: string;
  type: string;
  faction: string;
  name: string;
  description: string | null;
  base_value: number | null;
  status: string;
}

export interface Faction {
  id: string;
  name: string;
  description: string | null;
  starting_hp: number;
}

export class CardService {
  async getAllCards(): Promise<Card[]> {
    const db = getDb();
    const result = await db.execute(
      `SELECT id, type, faction, name, description, base_value, status 
       FROM cards WHERE status = 'active' ORDER BY faction, type, name`
    );
    return result.rows as Card[];
  }
  
  async getCardById(id: string): Promise<Card | null> {
    const db = getDb();
    const result = await db.execute({
      sql: `SELECT id, type, faction, name, description, base_value, status FROM cards WHERE id = ?`,
      args: [id],
    });
    return result.rows[0] as Card | null;
  }
  
  async getAllFactions(): Promise<Faction[]> {
    const db = getDb();
    const result = await db.execute(
      `SELECT id, name, description, starting_hp FROM factions ORDER BY name`
    );
    return result.rows as Faction[];
  }
  
  async getFactionById(id: string): Promise<Faction | null> {
    const db = getDb();
    const result = await db.execute({
      sql: `SELECT id, name, description, starting_hp FROM factions WHERE id = ?`,
      args: [id],
    });
    return result.rows[0] as Faction | null;
  }
  
  async getCardsByFaction(factionId: string): Promise<Card[]> {
    const db = getDb();
    const result = await db.execute({
      sql: `SELECT id, type, faction, name, description, base_value, status 
            FROM cards WHERE faction = ? AND status = 'active' ORDER BY type, name`,
      args: [factionId],
    });
    return result.rows as Card[];
  }
}

export const cardService = new CardService();
