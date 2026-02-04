import { Router } from 'express';
import { cardService } from '../services/cardService.js';

const router = Router();

// GET /factions
router.get('/', async (req, res) => {
  try {
    const factions = await cardService.getAllFactions();
    res.json({ factions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch factions' });
  }
});

// GET /factions/:id
router.get('/:id', async (req, res) => {
  try {
    const faction = await cardService.getFactionById(req.params.id);
    if (!faction) {
      res.status(404).json({ error: 'Faction not found' });
      return;
    }
    res.json({ faction });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch faction' });
  }
});

// GET /factions/:id/cards
router.get('/:id/cards', async (req, res) => {
  try {
    const faction = await cardService.getFactionById(req.params.id);
    if (!faction) {
      res.status(404).json({ error: 'Faction not found' });
      return;
    }
    
    const cards = await cardService.getCardsByFaction(req.params.id);
    res.json({ faction, cards });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch faction cards' });
  }
});

export default router;
