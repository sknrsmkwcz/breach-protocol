import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { config, isDev } from './config.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { apiLimiter, authLimiter, gameLimiter } from './middleware/rateLimiter.js';

// Import routes
import authRoutes from './routes/auth.js';
import cardRoutes from './routes/cards.js';
import factionRoutes from './routes/factions.js';
import gameRoutes from './routes/games.js';
import adminRoutes from './routes/admin.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check (no rate limit)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes with versioning
const apiRouter = express.Router();

// Apply rate limiters
apiRouter.use('/auth', authLimiter, authRoutes);
apiRouter.use('/cards', apiLimiter, cardRoutes);
apiRouter.use('/factions', apiLimiter, factionRoutes);
apiRouter.use('/games', gameLimiter, gameRoutes);
apiRouter.use('/admin', apiLimiter, adminRoutes);

app.use('/api/v1', apiRouter);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const port = parseInt(config.PORT, 10);
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`📍 Environment: ${config.NODE_ENV}`);
  if (isDev) {
    console.log(`🔗 http://localhost:${port}/api/v1`);
  }
});

export default app;
