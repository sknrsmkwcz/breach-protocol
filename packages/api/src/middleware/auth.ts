import type { Request, Response, NextFunction } from 'express';
import { verifyToken, type TokenPayload } from '../utils/jwt.js';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }
  
  const token = authHeader.substring(7);
  
  try {
    const payload = verifyToken<TokenPayload>(token);
    req.user = payload;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  
  if (req.user.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  
  next();
}

// Optional auth - doesn't fail if no token, just doesn't set user
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }
  
  const token = authHeader.substring(7);
  
  try {
    const payload = verifyToken<TokenPayload>(token);
    req.user = payload;
  } catch {
    // Ignore invalid tokens for optional auth
  }
  
  next();
}
