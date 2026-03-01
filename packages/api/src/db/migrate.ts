import { getDb, closeDb } from './client.js';

// ALTER TABLE statements tolerate "duplicate column" — safe to re-run.
async function tryAlter(sql: string, migrationName: string): Promise<void> {
  const db = getDb();
  try {
    await db.execute(sql);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('duplicate column') || msg.includes('already exists')) return;
    console.error(`[migrate] ${migrationName} ALTER failed: ${msg}`);
    throw err;
  }
}

// All migrations in sequence. CREATE TABLE / INDEX use IF NOT EXISTS — idempotent.
async function migration001(db: Awaited<ReturnType<typeof getDb>>): Promise<void> {
  const statements = [
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('player', 'admin')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS refresh_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      revoked_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      faction TEXT NOT NULL CHECK (faction IN ('phantom', 'sentinel', 'neutral')),
      name TEXT NOT NULL,
      description TEXT,
      base_value INTEGER,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'testing')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS factions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      starting_hp INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      player1_id TEXT NOT NULL REFERENCES users(id),
      player2_id TEXT REFERENCES users(id),
      player1_faction TEXT NOT NULL,
      player2_faction TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
      winner_id TEXT REFERENCES users(id),
      seed INTEGER NOT NULL,
      current_state TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS game_actions (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
      player_id TEXT NOT NULL,
      action_type TEXT NOT NULL,
      action_data TEXT NOT NULL,
      result_events TEXT NOT NULL,
      turn_number INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS simulations (
      id TEXT PRIMARY KEY,
      created_by TEXT NOT NULL REFERENCES users(id),
      config TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
      results TEXT,
      games_total INTEGER NOT NULL DEFAULT 0,
      games_completed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      started_at TEXT,
      completed_at TEXT
    )`,
    `CREATE INDEX IF NOT EXISTS idx_games_player1 ON games(player1_id)`,
    `CREATE INDEX IF NOT EXISTS idx_games_player2 ON games(player2_id)`,
    `CREATE INDEX IF NOT EXISTS idx_games_status ON games(status)`,
    `CREATE INDEX IF NOT EXISTS idx_game_actions_game ON game_actions(game_id)`,
    `CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_cards_faction ON cards(faction)`,
    `CREATE INDEX IF NOT EXISTS idx_cards_type ON cards(type)`,
  ];
  for (const sql of statements) await db.execute(sql);
}

async function migration002(): Promise<void> {
  await tryAlter(`ALTER TABLE cards ADD COLUMN effects TEXT DEFAULT '[]'`, '002');
  await tryAlter(`ALTER TABLE cards ADD COLUMN card_type TEXT DEFAULT 'utility'`, '002');
  await tryAlter(`ALTER TABLE cards ADD COLUMN generated_text TEXT DEFAULT NULL`, '002');
}

async function migration003(db: Awaited<ReturnType<typeof getDb>>): Promise<void> {
  // New columns on simulations
  const alters = [
    `ALTER TABLE simulations ADD COLUMN batches_completed INTEGER DEFAULT 0`,
    `ALTER TABLE simulations ADD COLUMN current_batch INTEGER DEFAULT 0`,
    `ALTER TABLE simulations ADD COLUMN batch_size INTEGER DEFAULT 100`,
    `ALTER TABLE simulations ADD COLUMN error_message TEXT DEFAULT NULL`,
    `ALTER TABLE simulations ADD COLUMN worker_id TEXT DEFAULT NULL`,
    `ALTER TABLE simulations ADD COLUMN last_heartbeat TEXT DEFAULT NULL`,
  ];
  for (const sql of alters) await tryAlter(sql, '003');

  // New tables
  const statements = [
    `CREATE TABLE IF NOT EXISTS simulation_batches (
      id TEXT PRIMARY KEY,
      simulation_id TEXT NOT NULL,
      batch_number INTEGER NOT NULL,
      games_in_batch INTEGER NOT NULL,
      faction1_wins INTEGER DEFAULT 0,
      faction2_wins INTEGER DEFAULT 0,
      total_turns INTEGER DEFAULT 0,
      total_faction1_hp INTEGER DEFAULT 0,
      total_faction2_hp INTEGER DEFAULT 0,
      stats_json TEXT DEFAULT '{}',
      started_at TEXT DEFAULT NULL,
      completed_at TEXT DEFAULT NULL,
      status TEXT DEFAULT 'pending',
      FOREIGN KEY (simulation_id) REFERENCES simulations(id) ON DELETE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS idx_simulation_batches_sim_id ON simulation_batches(simulation_id)`,
    `CREATE INDEX IF NOT EXISTS idx_simulation_batches_status ON simulation_batches(status)`,
    `CREATE TABLE IF NOT EXISTS sample_games (
      id TEXT PRIMARY KEY,
      simulation_id TEXT NOT NULL,
      batch_number INTEGER NOT NULL,
      game_number INTEGER NOT NULL,
      seed INTEGER NOT NULL,
      winner INTEGER NOT NULL,
      turns INTEGER NOT NULL,
      final_hp_faction1 INTEGER NOT NULL,
      final_hp_faction2 INTEGER NOT NULL,
      actions_json TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (simulation_id) REFERENCES simulations(id) ON DELETE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS idx_sample_games_sim_id ON sample_games(simulation_id)`,
  ];
  for (const sql of statements) await db.execute(sql);
}

async function migration004(db: Awaited<ReturnType<typeof getDb>>): Promise<void> {
  // SQLite cannot ALTER TABLE DROP CONSTRAINT.
  // If the cards table still has the old CHECK on type we rebuild it without that constraint.
  // We detect this by inspecting the CREATE TABLE SQL stored in sqlite_master.
  const infoResult = await db.execute(
    `SELECT sql FROM sqlite_master WHERE type='table' AND name='cards'`
  );
  const createSql = (infoResult.rows[0]?.sql as string) || '';
  if (!createSql.includes("CHECK (type IN")) return; // Already migrated

  console.log('[migrate] 004: removing legacy type CHECK constraint from cards table');

  // Drop any leftover cards_new from a previously interrupted run
  await db.execute(`DROP TABLE IF EXISTS cards_new`);

  await db.execute(`
    CREATE TABLE cards_new (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      card_type TEXT DEFAULT 'utility',
      faction TEXT NOT NULL CHECK (faction IN ('phantom', 'sentinel', 'neutral')),
      name TEXT NOT NULL,
      description TEXT,
      base_value INTEGER,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'testing')),
      effects TEXT DEFAULT '[]',
      generated_text TEXT DEFAULT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    INSERT INTO cards_new (id, type, card_type, faction, name, description, base_value, status, effects, generated_text, created_at, updated_at)
    SELECT id, type, COALESCE(card_type, 'utility'), faction, name, description, base_value, status, COALESCE(effects, '[]'), generated_text, COALESCE(created_at, datetime('now')), COALESCE(updated_at, datetime('now'))
    FROM cards
  `);
  await db.execute(`DROP TABLE cards`);
  await db.execute(`ALTER TABLE cards_new RENAME TO cards`);

  // Recreate indexes
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_cards_faction ON cards(faction)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_cards_type ON cards(type)`);

  console.log('[migrate] 004: done');
}

/** Run all migrations against the application database. Safe to call on every startup. */
export async function runMigrations(): Promise<void> {
  const db = getDb();
  await migration001(db);
  await migration002();
  await migration003(db);
  await migration004(db);
  console.log('✅ Database migrations applied');
}

// Allow running directly: `npx tsx src/db/migrate.ts`
if (process.argv[1]?.endsWith('migrate.ts') || process.argv[1]?.endsWith('migrate.js')) {
  import('dotenv/config').then(() =>
    runMigrations()
      .then(() => closeDb())
      .catch(err => { console.error('Migration failed:', err); process.exit(1); })
  );
}
