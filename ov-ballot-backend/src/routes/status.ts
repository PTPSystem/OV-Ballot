import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();

// GET /api/status - Check tournament status
router.get('/', async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    
    const activeTournament = await prisma.tournament.findFirst({
      where: { status: 'active' },
      select: {
        id: true,
        name: true,
        meetingDate: true,
        status: true
      }
    });

    if (activeTournament) {
      res.json({
        hasActiveTournament: true,
        tournament: activeTournament
      });
    } else {
      res.json({
        hasActiveTournament: false,
        tournament: null,
        message: 'No active tournament. Please check back later.'
      });
    }
  } catch (error) {
    console.error('Error checking tournament status:', error);
    res.status(500).json({ error: 'Failed to check tournament status' });
  }
});

export default router;
