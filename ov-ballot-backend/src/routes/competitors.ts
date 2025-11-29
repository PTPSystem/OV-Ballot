import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();

// GET /api/competitors - List competitors for active tournament
router.get('/', async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    
    // Find active tournament
    const activeTournament = await prisma.tournament.findFirst({
      where: { status: 'active' }
    });

    if (!activeTournament) {
      return res.status(404).json({ error: 'No active tournament found' });
    }

    const competitors = await prisma.competitor.findMany({
      where: { tournamentId: activeTournament.id },
      select: {
        id: true,
        firstName: true,
        lastName: true
      },
      orderBy: [
        { lastName: 'asc' },
        { firstName: 'asc' }
      ]
    });

    res.json({
      tournamentId: activeTournament.id,
      tournamentName: activeTournament.name,
      competitors
    });
  } catch (error) {
    console.error('Error fetching competitors:', error);
    res.status(500).json({ error: 'Failed to fetch competitors' });
  }
});

export default router;
