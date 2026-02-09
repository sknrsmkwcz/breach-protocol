import { getDb } from './src/db/client.js';

async function main() {
  const db = getDb();
  const result = await db.execute('SELECT id, username, role FROM users');
  console.log('Users in database:', result.rows);
}

main().catch(console.error);
