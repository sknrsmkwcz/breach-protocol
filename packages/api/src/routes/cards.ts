import { Router } from 'express';
import { cardService } from '../services/cardService.js';

const router = Router();

// GET /cards
router.get('/', async (req, res) => {
  try {
    const cards = await cardService.getAllCards();
    res.json({ cards });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch cards' });
  }
});

// GET /cards/:id
router.get('/:id', async (req, res) => {
  try {
    const card = await cardService.getCardById(req.params.id);
    if (!card) {
      res.status(404).json({ error: 'Card not found' });
      return;
    }
    res.json({ card });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch card' });
  }
});

export default router;
