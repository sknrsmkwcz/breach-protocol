import { Router } from 'express';
import { z } from 'zod';
import { authService } from '../services/authService.js';
import { config } from '../config.js';

const router = Router();

// Validation schemas
const registerSchema = z.object({
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(8).max(128),
});

const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

const refreshSchema = z.object({
  refreshToken: z.string(),
});

// POST /auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, password } = registerSchema.parse(req.body);
    const user = await authService.register(username, password);
    const tokens = await authService.login(username, password);
    
    res.status(201).json({
      user: { id: user.id, username: user.username, role: user.role },
      ...tokens,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    
    const message = error instanceof Error ? error.message : 'Registration failed';
    const status = message === 'Username already exists' ? 409 : 400;
    res.status(status).json({ error: message });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = loginSchema.parse(req.body);
    const tokens = await authService.login(username, password);
    
    const user = await authService.getUserById(
      JSON.parse(atob(tokens.accessToken.split('.')[1])).userId
    );
    
    res.json({
      user: user ? { id: user.id, username: user.username, role: user.role } : null,
      ...tokens,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// POST /auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);
    const tokens = await authService.refresh(refreshToken);
    res.json(tokens);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// POST /auth/logout
router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);
    await authService.logout(refreshToken);
    res.status(204).send();
  } catch {
    res.status(204).send(); // Logout is idempotent
  }
});

// POST /auth/admin-setup (one-time admin creation)
router.post('/admin-setup', async (req, res) => {
  try {
    const { username, password, setupKey } = req.body;
    
    if (setupKey !== config.ADMIN_SETUP_KEY) {
      res.status(403).json({ error: 'Invalid setup key' });
      return;
    }
    
    const { username: validUsername, password: validPassword } = registerSchema.parse({ username, password });
    const user = await authService.register(validUsername, validPassword);
    await authService.promoteToAdmin(user.id);
    
    res.status(201).json({
      message: 'Admin user created',
      user: { id: user.id, username: user.username, role: 'admin' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Setup failed';
    res.status(400).json({ error: message });
  }
});

export default router;
