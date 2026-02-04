import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export interface ApiError {
  error: string;
  details?: unknown;
  code?: string;
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('Error:', err);
  
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation failed',
      details: err.errors,
    });
    return;
  }
  
  // Don't leak internal errors in production
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;
  
  res.status(500).json({ error: message });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: 'Not found' });
}
