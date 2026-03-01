import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { adminCardService } from '../services/adminCardService.js';
import { simulationService } from '../services/simulationService.js';
import { validateEffects, EffectsArraySchema } from '../services/effectValidationService.js';
import { getDb } from '../db/client.js';

const router = Router();

router.use(authenticate);
router.use(requireAdmin);

// Card schemas
const createCardSchema = z.object({
  type: z.string().min(1).max(50).regex(/^[a-z][a-z0-9_]*$/).optional(),
  cardType: z.enum(['attack', 'utility', 'defense']).optional(),
  faction: z.enum(['phantom', 'sentinel', 'neutral']),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
  base_value: z.number().int().optional().nullable(),
  status: z.enum(['active', 'disabled', 'testing']).optional(),
  effects: EffectsArraySchema.optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(['active', 'disabled', 'testing']),
});

const updateEffectsSchema = z.object({
  effects: EffectsArraySchema,
});

const simulationSchema = z.object({
  gamesCount: z.number().int().min(1).max(100000),
  faction1: z.enum(['phantom', 'sentinel']),
  faction2: z.enum(['phantom', 'sentinel']),
  seedStart: z.number().int().optional(),
  includeTestingCards: z.boolean().optional(),
});

// ─── Dashboard Stats ───

router.get('/stats', async (req, res) => {
  try {
    const db = getDb();
    
    const cardCounts = await db.execute(`
      SELECT faction, status, COUNT(*) as count
      FROM cards
      GROUP BY faction, status
    `);
    
    const simStats = await db.execute(`
      SELECT status, COUNT(*) as count
      FROM simulations
      GROUP BY status
    `);
    
    const recentSims = await db.execute(`
      SELECT id, status, config, games_total as gamesTotal, games_completed as gamesCompleted, created_at as createdAt
      FROM simulations
      ORDER BY created_at DESC
      LIMIT 5
    `);
    
    const totalCards = cardCounts.rows.reduce((sum, r) => sum + (r.count as number), 0);
    const activeCards = cardCounts.rows
      .filter(r => r.status === 'active')
      .reduce((sum, r) => sum + (r.count as number), 0);
    
    const phantomCards = cardCounts.rows
      .filter(r => r.faction === 'phantom' && r.status === 'active')
      .reduce((sum, r) => sum + (r.count as number), 0);
    
    const sentinelCards = cardCounts.rows
      .filter(r => r.faction === 'sentinel' && r.status === 'active')
      .reduce((sum, r) => sum + (r.count as number), 0);
    
    const totalSimulations = simStats.rows.reduce((sum, r) => sum + (r.count as number), 0);
    const completedSimulations = simStats.rows
      .filter(r => r.status === 'completed')
      .reduce((sum, r) => sum + (r.count as number), 0);
    
    res.json({
      cards: {
        total: totalCards,
        active: activeCards,
        phantom: phantomCards,
        sentinel: sentinelCards,
      },
      simulations: {
        total: totalSimulations,
        completed: completedSimulations,
        pending: simStats.rows.find(r => r.status === 'pending')?.count || 0,
        running: simStats.rows.find(r => r.status === 'running')?.count || 0,
        failed: simStats.rows.find(r => r.status === 'failed')?.count || 0,
      },
      recentSimulations: recentSims.rows.map(r => ({
        id: r.id,
        status: r.status,
        config: JSON.parse(r.config as string || '{}'),
        gamesTotal: r.gamesTotal,
        gamesCompleted: r.gamesCompleted,
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// ─── Card Routes ───

router.get('/cards', async (req, res) => {
  try {
    const cards = await adminCardService.getAllCards();
    res.json({ cards });
  } catch (error) {
    console.error('Error fetching cards:', error);
    res.status(500).json({ error: 'Failed to fetch cards' });
  }
});

router.get('/cards/:id', async (req, res) => {
  try {
    const card = await adminCardService.getCardById(req.params.id);
    if (!card) {
      res.status(404).json({ error: 'Card not found' });
      return;
    }
    res.json({ card });
  } catch (error) {
    console.error('Error fetching card:', error);
    res.status(500).json({ error: 'Failed to fetch card' });
  }
});

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
    console.error('Error creating card:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create card' });
  }
});

router.post('/cards/:id/duplicate', async (req, res) => {
  try {
    const card = await adminCardService.duplicateCard(req.params.id);
    if (!card) {
      res.status(404).json({ error: 'Card not found' });
      return;
    }
    res.status(201).json({ card });
  } catch (error) {
    console.error('Error duplicating card:', error);
    res.status(500).json({ error: 'Failed to duplicate card' });
  }
});

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
    console.error('Error updating card:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to update card' });
  }
});

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
    console.error('Error updating card status:', error);
    res.status(500).json({ error: 'Failed to update card status' });
  }
});

router.put('/cards/:id/effects', async (req, res) => {
  try {
    const { effects } = updateEffectsSchema.parse(req.body);
    const card = await adminCardService.updateCardEffects(req.params.id, effects);
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
    console.error('Error updating card effects:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to update effects' });
  }
});

router.post('/cards/validate-effects', async (req, res) => {
  try {
    const { effects } = updateEffectsSchema.parse(req.body);
    const result = validateEffects(effects);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        valid: false,
        errors: error.errors.map(e => ({ id: 'schema', message: e.message, path: e.path.join('.') })),
        warnings: []
      });
      return;
    }
    res.status(500).json({ error: 'Validation failed' });
  }
});

router.delete('/cards/:id', async (req, res) => {
  try {
    const card = await adminCardService.deleteCard(req.params.id);
    if (!card) {
      res.status(404).json({ error: 'Card not found' });
      return;
    }
    res.json({ message: 'Card deleted', card });
  } catch (error) {
    console.error('Error deleting card:', error);
    res.status(500).json({ error: 'Failed to delete card' });
  }
});

// ─── Simulation Routes ───

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
    console.error('Error starting simulation:', error);
    res.status(500).json({ error: 'Failed to start simulation' });
  }
});

router.post('/simulations/batch-delete', async (req, res) => {
  try {
    const { ids } = z.object({ ids: z.array(z.string()).min(1) }).parse(req.body);
    const db = getDb();

    // Don't allow deleting running simulations
    const placeholders = ids.map(() => '?').join(',');
    const check = await db.execute({
      sql: `SELECT id FROM simulations WHERE id IN (${placeholders}) AND status = 'running'`,
      args: ids,
    });
    if (check.rows.length > 0) {
      res.status(400).json({ error: 'Cannot delete running simulations' });
      return;
    }

    await db.execute({
      sql: `DELETE FROM simulations WHERE id IN (${placeholders})`,
      args: ids,
    });
    res.json({ message: `Deleted ${ids.length} simulation(s)` });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Error batch deleting simulations:', error);
    res.status(500).json({ error: 'Failed to delete simulations' });
  }
});

router.get('/simulations', async (req, res) => {
  try {
    const simulations = await simulationService.listSimulations();
    res.json({ simulations });
  } catch (error) {
    console.error('Error fetching simulations:', error);
    res.status(500).json({ error: 'Failed to fetch simulations' });
  }
});

router.get('/simulations/:id', async (req, res) => {
  try {
    const simulation = await simulationService.getSimulation(req.params.id);
    if (!simulation) {
      res.status(404).json({ error: 'Simulation not found' });
      return;
    }
    res.json({ simulation });
  } catch (error) {
    console.error('Error fetching simulation:', error);
    res.status(500).json({ error: 'Failed to fetch simulation' });
  }
});

router.get('/simulations/:id/progress', async (req, res) => {
  try {
    const db = getDb();
    const result = await db.execute({
      sql: `
        SELECT id, status, games_total, games_completed, batches_completed, 
               last_heartbeat, error_message
        FROM simulations WHERE id = ?
      `,
      args: [req.params.id],
    });

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Simulation not found' });
      return;
    }

    const row = result.rows[0];
    const progress = {
      id: row.id,
      status: row.status,
      gamesTotal: row.games_total as number,
      gamesCompleted: row.games_completed as number,
      batchesCompleted: (row.batches_completed as number) || 0,
      percentComplete: Math.round(((row.games_completed as number) / (row.games_total as number)) * 100),
      lastHeartbeat: row.last_heartbeat,
      errorMessage: row.error_message,
    };

    res.json({ progress });
  } catch (error) {
    console.error('Error fetching progress:', error);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

router.get('/simulations/:id/samples', async (req, res) => {
  try {
    const db = getDb();
    const result = await db.execute({
      sql: `
        SELECT seed, winner, turns, final_hp_faction1, final_hp_faction2, actions_json
        FROM sample_games 
        WHERE simulation_id = ?
        ORDER BY batch_number, game_number
        LIMIT 20
      `,
      args: [req.params.id],
    });

    const samples = result.rows.map(row => ({
      seed: row.seed,
      winner: row.winner,
      turns: row.turns,
      finalHpFaction1: row.final_hp_faction1,
      finalHpFaction2: row.final_hp_faction2,
      actions: JSON.parse(row.actions_json as string || '[]'),
    }));

    res.json({ samples });
  } catch (error) {
    console.error('Error fetching samples:', error);
    res.status(500).json({ error: 'Failed to fetch sample games' });
  }
});

router.delete('/simulations/:id', async (req, res) => {
  try {
    const db = getDb();

    const check = await db.execute({
      sql: `SELECT status FROM simulations WHERE id = ?`,
      args: [req.params.id],
    });

    if (check.rows.length === 0) {
      res.status(404).json({ error: 'Simulation not found' });
      return;
    }

    if (check.rows[0].status === 'running') {
      res.status(400).json({ error: 'Cannot delete running simulation' });
      return;
    }

    await db.execute({
      sql: `DELETE FROM simulations WHERE id = ?`,
      args: [req.params.id],
    });

    res.json({ message: 'Simulation deleted' });
  } catch (error) {
    console.error('Error deleting simulation:', error);
    res.status(500).json({ error: 'Failed to delete simulation' });
  }
});

export default router;
