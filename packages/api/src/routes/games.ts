import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { gameService } from '../services/gameService.js';

const router = Router();

// All game routes require authentication
router.use(authenticate);

// Validation schemas
const createGameSchema = z.object({
  playerFaction: z.enum(['phantom', 'sentinel']),
  opponentFaction: z.enum(['phantom', 'sentinel']),
  vsAI: z.boolean().optional().default(true),
});

const actionSchema = z.object({
  type: z.enum(['play_card', 'end_turn']),
  cardIndex: z.number().int().min(0).optional(),
});

// POST /games - Create new game
router.post('/', async (req, res) => {
  try {
    const { playerFaction, opponentFaction, vsAI } = createGameSchema.parse(req.body);
    
    const game = await gameService.createGame({
      playerId: req.user!.userId,
      playerFaction,
      opponentFaction,
      vsAI,
    });
    
    res.status(201).json({ game });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    res.status(500).json({ error: 'Failed to create game' });
  }
});

// GET /games - List user's games
router.get('/', async (req, res) => {
  try {
    const status = req.query.status as string | undefined;
    const games = await gameService.getUserGames(req.user!.userId, status);
    res.json({ games });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch games' });
  }
});

// GET /games/:id - Get specific game
router.get('/:id', async (req, res) => {
  try {
    const game = await gameService.getGame(req.params.id, req.user!.userId);
    if (!game) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }
    res.json({ game });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch game' });
  }
});

// POST /games/:id/actions - Submit action
router.post('/:id/actions', async (req, res) => {
  try {
    const action = actionSchema.parse(req.body);
    
    // Validate play_card has cardIndex
    if (action.type === 'play_card' && action.cardIndex === undefined) {
      res.status(400).json({ error: 'cardIndex required for play_card action' });
      return;
    }
    
    const result = await gameService.submitAction(req.params.id, req.user!.userId, action as any);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid action', details: error.errors });
      return;
    }
    
    const message = error instanceof Error ? error.message : 'Action failed';
    const status = message.includes('not found') ? 404 : 
                   message.includes('Not your turn') || message.includes('Invalid') ? 400 : 500;
    res.status(status).json({ error: message });
  }
});

// GET /games/:id/history - Get action history
router.get('/:id/history', async (req, res) => {
  try {
    const game = await gameService.getGame(req.params.id, req.user!.userId);
    if (!game) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }
    
    const actions = await gameService.getGameActions(req.params.id);
    res.json({ actions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch game history' });
  }
});

// DELETE /games/:id - Abandon game
router.delete('/:id', async (req, res) => {
  try {
    await gameService.abandonGame(req.params.id, req.user!.userId);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to abandon game' });
  }
});

export default router;
