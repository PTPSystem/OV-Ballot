import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

// Routes
import statusRoutes from './routes/status';
import competitorRoutes from './routes/competitors';
import eventTypeRoutes from './routes/eventTypes';
import ballotRoutes from './routes/ballots';
import magicLinkRoutes from './routes/magicLink';
import adminRoutes from './routes/admin';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Make prisma available to routes
app.set('prisma', prisma);

// Public Routes (No Auth)
app.use('/api/status', statusRoutes);
app.use('/api/competitors', competitorRoutes);
app.use('/api/event-types', eventTypeRoutes);
app.use('/api/ballots', ballotRoutes);
app.use('/api/magic', magicLinkRoutes);

// Admin Routes (Password Auth)
app.use('/admin', adminRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`🚀 OV-Ballot API running on http://localhost:${PORT}`);
  console.log(`📊 Frontend URL: ${process.env.FRONTEND_URL}`);
});

export { prisma };
