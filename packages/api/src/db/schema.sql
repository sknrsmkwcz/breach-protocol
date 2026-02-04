-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('player', 'admin')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Refresh tokens for JWT
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  revoked_at TEXT
);

-- Card definitions (static game data)
CREATE TABLE IF NOT EXISTS cards (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('exploit', 'payload', 'zeroday', 'siphon', 'firewall', 'patch', 'purge')),
  faction TEXT NOT NULL CHECK (faction IN ('phantom', 'sentinel', 'neutral')),
  name TEXT NOT NULL,
  description TEXT,
  base_value INTEGER,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'testing')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Faction definitions
CREATE TABLE IF NOT EXISTS factions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  starting_hp INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Games table
CREATE TABLE IF NOT EXISTS games (
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
);

-- Game actions history
CREATE TABLE IF NOT EXISTS game_actions (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL REFERENCES users(id),
  action_type TEXT NOT NULL,
  action_data TEXT NOT NULL,
  result_events TEXT NOT NULL,
  turn_number INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Simulation jobs for admin
CREATE TABLE IF NOT EXISTS simulations (
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
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_games_player1 ON games(player1_id);
CREATE INDEX IF NOT EXISTS idx_games_player2 ON games(player2_id);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_game_actions_game ON game_actions(game_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_cards_faction ON cards(faction);
CREATE INDEX IF NOT EXISTS idx_cards_type ON cards(type);
