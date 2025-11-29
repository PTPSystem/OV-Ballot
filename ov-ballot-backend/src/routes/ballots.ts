import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();

// POST /api/ballots/draft - Save ballot draft (auto-save)
router.post('/draft', async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const {
      deviceId,
      competitorId,
      eventTypeId,
      judgeName,
      scoreContent,
      scoreOrganizationCitations,
      scoreCategory3,
      scoreCategory4,
      scoreImpact,
      commentsContent,
      commentsOrganizationCitations,
      commentsCategory3,
      commentsCategory4,
      commentsImpact,
      overallComments,
      totalTimeSeconds,
      speakerRank
    } = req.body;

    if (!deviceId || !competitorId || !eventTypeId) {
      return res.status(400).json({ error: 'deviceId, competitorId, and eventTypeId are required' });
    }

    // Get active tournament
    const activeTournament = await prisma.tournament.findFirst({
      where: { status: 'active' }
    });

    if (!activeTournament) {
      return res.status(404).json({ error: 'No active tournament found' });
    }

    // Upsert ballot draft
    const existingDraft = await prisma.ballot.findFirst({
      where: {
        deviceId,
        competitorId,
        eventTypeId,
        status: 'draft'
      }
    });

    let ballot;
    if (existingDraft) {
      ballot = await prisma.ballot.update({
        where: { id: existingDraft.id },
        data: {
          judgeName: judgeName || '',
          scoreContent,
          scoreOrganizationCitations,
          scoreCategory3,
          scoreCategory4,
          scoreImpact,
          commentsContent,
          commentsOrganizationCitations,
          commentsCategory3,
          commentsCategory4,
          commentsImpact,
          overallComments,
          totalTimeSeconds,
          speakerRank,
          draftSavedAt: new Date(),
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        }
      });
    } else {
      ballot = await prisma.ballot.create({
        data: {
          tournamentId: activeTournament.id,
          competitorId,
          eventTypeId,
          deviceId,
          judgeName: judgeName || '',
          scoreContent,
          scoreOrganizationCitations,
          scoreCategory3,
          scoreCategory4,
          scoreImpact,
          commentsContent,
          commentsOrganizationCitations,
          commentsCategory3,
          commentsCategory4,
          commentsImpact,
          overallComments,
          totalTimeSeconds,
          speakerRank,
          status: 'draft',
          draftSavedAt: new Date(),
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        }
      });
    }

    res.json({ success: true, ballotId: ballot.id, savedAt: ballot.draftSavedAt });
  } catch (error) {
    console.error('Error saving draft:', error);
    res.status(500).json({ error: 'Failed to save draft' });
  }
});

// GET /api/ballots/draft - Get draft by device_id + competitor_id + event_type_id
router.get('/draft', async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { deviceId, competitorId, eventTypeId } = req.query;

    if (!deviceId || !competitorId || !eventTypeId) {
      return res.status(400).json({ error: 'deviceId, competitorId, and eventTypeId are required' });
    }

    const draft = await prisma.ballot.findFirst({
      where: {
        deviceId: deviceId as string,
        competitorId: competitorId as string,
        eventTypeId: parseInt(eventTypeId as string),
        status: 'draft'
      }
    });

    if (!draft) {
      return res.json({ hasDraft: false });
    }

    // Check if draft is less than 48 hours old
    const draftAge = Date.now() - (draft.draftSavedAt?.getTime() || 0);
    const maxAge = 48 * 60 * 60 * 1000; // 48 hours in ms

    if (draftAge > maxAge) {
      return res.json({ hasDraft: false, message: 'Draft expired (older than 48 hours)' });
    }

    res.json({ hasDraft: true, draft });
  } catch (error) {
    console.error('Error fetching draft:', error);
    res.status(500).json({ error: 'Failed to fetch draft' });
  }
});

// POST /api/ballots/submit - Submit ballot
router.post('/submit', async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const {
      deviceId,
      competitorId,
      eventTypeId,
      judgeName,
      scoreContent,
      scoreOrganizationCitations,
      scoreCategory3,
      scoreCategory4,
      scoreImpact,
      commentsContent,
      commentsOrganizationCitations,
      commentsCategory3,
      commentsCategory4,
      commentsImpact,
      overallComments,
      totalTimeSeconds,
      speakerRank
    } = req.body;

    // Validation
    if (!competitorId || !eventTypeId || !judgeName) {
      return res.status(400).json({ error: 'competitorId, eventTypeId, and judgeName are required' });
    }

    if (!scoreContent || !scoreOrganizationCitations || !scoreCategory3 || !scoreCategory4 || !scoreImpact) {
      return res.status(400).json({ error: 'All 5 scores are required' });
    }

    // Validate score range
    const scores = [scoreContent, scoreOrganizationCitations, scoreCategory3, scoreCategory4, scoreImpact];
    if (scores.some(s => s < 1 || s > 5)) {
      return res.status(400).json({ error: 'All scores must be between 1 and 5' });
    }

    if (speakerRank && (speakerRank < 1 || speakerRank > 5)) {
      return res.status(400).json({ error: 'Speaker rank must be between 1 and 5' });
    }

    // Get active tournament
    const activeTournament = await prisma.tournament.findFirst({
      where: { status: 'active' }
    });

    if (!activeTournament) {
      return res.status(404).json({ error: 'No active tournament found' });
    }

    // Check for existing draft to update
    const existingDraft = await prisma.ballot.findFirst({
      where: {
        deviceId,
        competitorId,
        eventTypeId,
        status: 'draft'
      }
    });

    let ballot;
    if (existingDraft) {
      ballot = await prisma.ballot.update({
        where: { id: existingDraft.id },
        data: {
          judgeName,
          scoreContent,
          scoreOrganizationCitations,
          scoreCategory3,
          scoreCategory4,
          scoreImpact,
          commentsContent,
          commentsOrganizationCitations,
          commentsCategory3,
          commentsCategory4,
          commentsImpact,
          overallComments,
          totalTimeSeconds,
          speakerRank,
          status: 'submitted',
          submittedAt: new Date(),
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        }
      });
    } else {
      ballot = await prisma.ballot.create({
        data: {
          tournamentId: activeTournament.id,
          competitorId,
          eventTypeId,
          deviceId,
          judgeName,
          scoreContent,
          scoreOrganizationCitations,
          scoreCategory3,
          scoreCategory4,
          scoreImpact,
          commentsContent,
          commentsOrganizationCitations,
          commentsCategory3,
          commentsCategory4,
          commentsImpact,
          overallComments,
          totalTimeSeconds,
          speakerRank,
          status: 'submitted',
          submittedAt: new Date(),
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        }
      });
    }

    res.json({ success: true, ballotId: ballot.id, message: 'Ballot submitted successfully!' });
  } catch (error) {
    console.error('Error submitting ballot:', error);
    res.status(500).json({ error: 'Failed to submit ballot' });
  }
});

// GET /api/ballots/:id/pdf - Download ballot PDF (placeholder)
router.get('/:id/pdf', async (req: Request, res: Response) => {
  // TODO: Implement PDF generation
  res.status(501).json({ error: 'PDF generation not implemented yet' });
});

export default router;
