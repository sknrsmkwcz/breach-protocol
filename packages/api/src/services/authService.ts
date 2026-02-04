import { getDb } from '../db/client.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { generateAccessToken, generateRefreshToken, verifyToken, parseDuration } from '../utils/jwt.js';
import { generateId, generateTokenId, hashToken } from '../utils/id.js';
import { config } from '../config.js';
import type { TokenPayload, RefreshTokenPayload } from '../utils/jwt.js';

export interface User {
  id: string;
  username: string;
  role: 'player' | 'admin';
  created_at: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export class AuthService {
  async register(username: string, password: string): Promise<User> {
    const db = getDb();
    
    // Check if username exists
    const existing = await db.execute({
      sql: 'SELECT id FROM users WHERE username = ?',
      args: [username],
    });
    
    if (existing.rows.length > 0) {
      throw new Error('Username already exists');
    }
    
    // Validate password strength
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }
    
    const id = generateId();
    const passwordHash = await hashPassword(password);
    
    await db.execute({
      sql: `INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, 'player')`,
      args: [id, username, passwordHash],
    });
    
    return {
      id,
      username,
      role: 'player',
      created_at: new Date().toISOString(),
    };
  }
  
  async login(username: string, password: string): Promise<AuthTokens> {
    const db = getDb();
    
    const result = await db.execute({
      sql: 'SELECT id, username, password_hash, role FROM users WHERE username = ?',
      args: [username],
    });
    
    if (result.rows.length === 0) {
      throw new Error('Invalid credentials');
    }
    
    const user = result.rows[0] as { id: string; username: string; password_hash: string; role: 'player' | 'admin' };
    
    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      throw new Error('Invalid credentials');
    }
    
    return this.generateTokens(user.id, user.username, user.role);
  }
  
  async refresh(refreshToken: string): Promise<AuthTokens> {
    const db = getDb();
    
    // Verify and decode refresh token
    let payload: RefreshTokenPayload;
    try {
      payload = verifyToken<RefreshTokenPayload>(refreshToken);
    } catch {
      throw new Error('Invalid refresh token');
    }
    
    const tokenHash = hashToken(refreshToken);
    
    // Check token exists and is not revoked
    const tokenResult = await db.execute({
      sql: `SELECT rt.id, u.id as user_id, u.username, u.role 
            FROM refresh_tokens rt
            JOIN users u ON rt.user_id = u.id
            WHERE rt.token_hash = ? AND rt.revoked_at IS NULL AND rt.expires_at > datetime('now')`,
      args: [tokenHash],
    });
    
    if (tokenResult.rows.length === 0) {
      throw new Error('Invalid or expired refresh token');
    }
    
    const row = tokenResult.rows[0] as { id: string; user_id: string; username: string; role: 'player' | 'admin' };
    
    // Revoke old refresh token
    await db.execute({
      sql: `UPDATE refresh_tokens SET revoked_at = datetime('now') WHERE token_hash = ?`,
      args: [tokenHash],
    });
    
    // Generate new tokens
    return this.generateTokens(row.user_id, row.username, row.role);
  }
  
  async logout(refreshToken: string): Promise<void> {
    const db = getDb();
    const tokenHash = hashToken(refreshToken);
    
    await db.execute({
      sql: `UPDATE refresh_tokens SET revoked_at = datetime('now') WHERE token_hash = ?`,
      args: [tokenHash],
    });
  }
  
  async getUserById(userId: string): Promise<User | null> {
    const db = getDb();
    
    const result = await db.execute({
      sql: 'SELECT id, username, role, created_at FROM users WHERE id = ?',
      args: [userId],
    });
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      id: row.id as string,
      username: row.username as string,
      role: row.role as 'player' | 'admin',
      created_at: row.created_at as string,
    };
  }
  
  async promoteToAdmin(userId: string): Promise<void> {
    const db = getDb();
    
    await db.execute({
      sql: `UPDATE users SET role = 'admin', updated_at = datetime('now') WHERE id = ?`,
      args: [userId],
    });
  }
  
  private async generateTokens(userId: string, username: string, role: 'player' | 'admin'): Promise<AuthTokens> {
    const db = getDb();
    
    const accessToken = generateAccessToken({ userId, username, role });
    
    const tokenId = generateTokenId();
    const refreshToken = generateRefreshToken({ userId, tokenId });
    const tokenHash = hashToken(refreshToken);
    
    const expiresAt = new Date(Date.now() + parseDuration(config.JWT_REFRESH_EXPIRES_IN)).toISOString();
    
    await db.execute({
      sql: `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)`,
      args: [generateId(), userId, tokenHash, expiresAt],
    });
    
    return {
      accessToken,
      refreshToken,
      expiresIn: Math.floor(parseDuration(config.JWT_EXPIRES_IN) / 1000),
    };
  }
}

export const authService = new AuthService();
