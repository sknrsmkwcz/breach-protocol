import { randomUUID, randomBytes, createHash } from 'crypto';

export function generateId(): string {
  return randomUUID();
}

export function generateTokenId(): string {
  return randomBytes(32).toString('hex');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
