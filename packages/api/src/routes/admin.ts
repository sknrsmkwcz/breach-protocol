import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { adminCardService } from '../services/adminCardService.js';
import { simulationService } from '../services/simulationService.js';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

// Card management schemas
const createCardSchema = z.object({
  type: z.enum(['exploit', 'payload', 'zeroday', 'siphon', 'firewall', 'patch', 'purge']),
  faction: z.enum(['phantom', 'sentinel', 'neutral']),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  base_value: z.number().int().optional(),
  status: z.enum(['active', 'disabled', 'testing']).optional(),
});

const updateCardSchema = createCardSchema.partial();

const updateStatusSchema = z.object({
  status: z.enum(['active', 'disabled', 'testing']),
});

// Simulation schema
const simulationSchema = z.object({
  gamesCount: z.number().int().min(1).max(1000),
  faction1: z.enum(['phantom', 'sentinel']),
  faction2: z.enum(['phantom', 'sentinel']),
  seedStart: z.number().int().optional(),
});

// GET /admin/cards - List all cards (including disabled)
router.get('/cards', async (req, res) => {
  try {
    const cards = await adminCardService.getAllCards();
    res.json({ cards });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch cards' });
  }
});

// POST /admin/cards - Create new card
router.post('/cards', async (req, res) => {
  try {
    const input = createCardSchema.parse(req.body);
    const card = await adminCardService.createCard(input);
    res.status(201).json({ card });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    res.status(500).json({ error: 'Failed to create card' });
  }
});

// PUT /admin/cards/:id - Full update card
router.put('/cards/:id', async (req, res) => {
  try {
    const input = createCardSchema.parse(req.body);
    const card = await adminCardService.updateCard(req.params.id, input);
    if (!card) {
      res.status(404).json({ error: 'Card not found' });
      return;
    }
    res.json({ card });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    res.status(500).json({ error: 'Failed to update card' });
  }
});

// PATCH /admin/cards/:id/status - Update card status only
router.patch('/cards/:id/status', async (req, res) => {
  try {
    const { status } = updateStatusSchema.parse(req.body);
    const card = await adminCardService.updateCardStatus(req.params.id, status);
    if (!card) {
      res.status(404).json({ error: 'Card not found' });
      return;
    }
    res.json({ card });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    res.status(500).json({ error: 'Failed to update card status' });
  }
});

// POST /admin/simulations - Start simulation
router.post('/simulations', async (req, res) => {
  try {
    const config = simulationSchema.parse(req.body);
    const simulation = await simulationService.createSimulation(req.user!.userId, config);
    res.status(202).json({ simulation });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    res.status(500).json({ error: 'Failed to start simulation' });
  }
});

// GET /admin/simulations - List simulations
router.get('/simulations', async (req, res) => {
  try {
    const simulations = await simulationService.listSimulations();
    res.json({ simulations });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch simulations' });
  }
});

// GET /admin/simulations/:id - Get simulation
router.get('/simulations/:id', async (req, res) => {
  try {
    const simulation = await simulationService.getSimulation(req.params.id);
    if (!simulation) {
      res.status(404).json({ error: 'Simulation not found' });
      return;
    }
    res.json({ simulation });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch simulation' });
  }
});

export default router;
