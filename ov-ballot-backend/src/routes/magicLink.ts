import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { addYears, isAfter } from 'date-fns';

const router = Router();

// GET /api/magic/:token - Access competitor ballots via magic link
router.get('/:token', async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { token } = req.params;

    // Find competitor by magic token
    const competitor = await prisma.competitor.findUnique({
      where: { magicToken: token },
      include: {
        tournament: true,
        ballots: {
          where: { status: 'submitted' },
          include: {
            eventType: true
          },
          orderBy: { submittedAt: 'desc' }
        }
      }
    });

    if (!competitor) {
      return res.status(404).json({ error: 'Invalid magic link' });
    }

    // Check if magic link is expired (1 year from meeting date)
    const expiryDate = addYears(competitor.tournament.meetingDate, 1);
    if (isAfter(new Date(), expiryDate)) {
      return res.status(403).json({ error: 'Magic link has expired' });
    }

    res.json({
      competitor: {
        id: competitor.id,
        firstName: competitor.firstName,
        lastName: competitor.lastName
      },
      tournament: {
        id: competitor.tournament.id,
        name: competitor.tournament.name,
        meetingDate: competitor.tournament.meetingDate
      },
      ballots: competitor.ballots.map(ballot => ({
        id: ballot.id,
        eventType: ballot.eventType.displayName,
        eventTypeConfig: ballot.eventType.rubricConfig,
        judgeName: ballot.judgeName,
        scoreContent: ballot.scoreContent,
        scoreOrganizationCitations: ballot.scoreOrganizationCitations,
        scoreCategory3: ballot.scoreCategory3,
        scoreCategory4: ballot.scoreCategory4,
        scoreImpact: ballot.scoreImpact,
        commentsContent: ballot.commentsContent,
        commentsOrganizationCitations: ballot.commentsOrganizationCitations,
        commentsCategory3: ballot.commentsCategory3,
        commentsCategory4: ballot.commentsCategory4,
        commentsImpact: ballot.commentsImpact,
        overallComments: ballot.overallComments,
        totalTimeSeconds: ballot.totalTimeSeconds,
        speakerRank: ballot.speakerRank,
        submittedAt: ballot.submittedAt
      }))
    });
  } catch (error) {
    console.error('Error accessing magic link:', error);
    res.status(500).json({ error: 'Failed to access ballots' });
  }
});

export default router;
