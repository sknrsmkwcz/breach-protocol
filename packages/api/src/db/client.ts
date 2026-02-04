import { createClient, type Client } from '@libsql/client';
import { config } from '../config.js';

let db: Client | null = null;

export function getDb(): Client {
  if (!db) {
    db = createClient({
      url: config.DATABASE_URL,
      authToken: config.DATABASE_AUTH_TOKEN,
    });
  }
  return db;
}

export async function closeDb(): Promise<void> {
  if (db) {
    db.close();
    db = null;
  }
}
