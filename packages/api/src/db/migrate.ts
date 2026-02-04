import 'dotenv/config';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getDb, closeDb } from './client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function migrate() {
  console.log('🔄 Running migrations...');
  
  const db = getDb();
  const schemaPath = join(__dirname, 'schema.sql');
  const schema = readFileSync(schemaPath, 'utf-8');
  
  // Split by semicolon and filter empty statements
  const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  for (const statement of statements) {
    try {
      await db.execute(statement);
      console.log('✓', statement.substring(0, 50) + '...');
    } catch (error) {
      console.error('✗ Failed:', statement.substring(0, 50));
      throw error;
    }
  }
  
  console.log('✅ Migrations complete!');
  await closeDb();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
