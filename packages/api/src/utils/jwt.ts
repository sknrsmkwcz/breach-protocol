import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export interface TokenPayload {
  userId: string;
  username: string;
  role: 'player' | 'admin';
}

export interface RefreshTokenPayload {
  userId: string;
  tokenId: string;
}

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN,
  });
}

export function generateRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_REFRESH_EXPIRES_IN,
  });
}

export function verifyToken<T>(token: string): T {
  return jwt.verify(token, config.JWT_SECRET) as T;
}

export function decodeToken<T>(token: string): T | null {
  try {
    return jwt.decode(token) as T;
  } catch {
    return null;
  }
}

// Parse duration string (e.g., "7d", "15m") to milliseconds
export function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) throw new Error(`Invalid duration: ${duration}`);
  
  const value = parseInt(match[1], 10);
  const unit = match[2];
  
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  
  return value * multipliers[unit];
}
