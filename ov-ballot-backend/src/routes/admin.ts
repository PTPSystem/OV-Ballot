import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import nodemailer from 'nodemailer';

const router = Router();

// Simple session storage (in production, use proper session management)
const adminSessions: Map<string, { authenticated: boolean; expiresAt: Date }> = new Map();

// Auth middleware
const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const sessionId = req.headers['x-session-id'] as string;
  
  if (!sessionId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const session = adminSessions.get(sessionId);
  if (!session || !session.authenticated || session.expiresAt < new Date()) {
    adminSessions.delete(sessionId);
    return res.status(401).json({ error: 'Session expired or invalid' });
  }

  next();
};

// POST /admin/login - Admin authentication
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { password } = req.body;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      return res.status(500).json({ error: 'Admin password not configured' });
    }

    if (password === adminPassword) {
      // Generate session ID
      const sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      adminSessions.set(sessionId, { authenticated: true, expiresAt });

      res.json({ success: true, sessionId, expiresAt });
    } else {
      res.status(401).json({ error: 'Invalid password' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /admin/logout
router.post('/logout', (req: Request, res: Response) => {
  const sessionId = req.headers['x-session-id'] as string;
  if (sessionId) {
    adminSessions.delete(sessionId);
  }
  res.json({ success: true });
});

// GET /admin/tournaments - List all tournaments
router.get('/tournaments', requireAuth, async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    
    const tournaments = await prisma.tournament.findMany({
      include: {
        _count: {
          select: { competitors: true, ballots: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(tournaments);
  } catch (error) {
    console.error('Error fetching tournaments:', error);
    res.status(500).json({ error: 'Failed to fetch tournaments' });
  }
});

// POST /admin/tournaments - Create new tournament (auto-closes previous)
router.post('/tournaments', requireAuth, async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { name, meetingDate } = req.body;

    if (!name || !meetingDate) {
      return res.status(400).json({ error: 'Name and meetingDate are required' });
    }

    // Auto-close any active tournament
    await prisma.tournament.updateMany({
      where: { status: 'active' },
      data: { status: 'closed', closedAt: new Date() }
    });

    // Create new tournament
    const tournament = await prisma.tournament.create({
      data: {
        name,
        meetingDate: new Date(meetingDate),
        status: 'active'
      }
    });

    res.json({ success: true, tournament });
  } catch (error) {
    console.error('Error creating tournament:', error);
    res.status(500).json({ error: 'Failed to create tournament' });
  }
});

// PUT /admin/tournaments/:id/close - Close tournament & send magic links
router.put('/tournaments/:id/close', requireAuth, async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { id } = req.params;

    // Close the tournament
    const tournament = await prisma.tournament.update({
      where: { id },
      data: { status: 'closed', closedAt: new Date() }
    });

    // Get all competitors
    const competitors = await prisma.competitor.findMany({
      where: { tournamentId: id }
    });

    // Send magic link emails
    let emailsSent = 0;
    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });

    for (const competitor of competitors) {
      const magicLinkUrl = `${process.env.FRONTEND_URL}/ballots/${competitor.magicToken}`;
      
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: competitor.email,
          subject: `Your NCFCA Speech Ballots - ${tournament.name}`,
          html: `
            <p>Hi ${competitor.firstName},</p>
            <p>Your speech ballots from <strong>${tournament.name}</strong> on ${tournament.meetingDate.toLocaleDateString()} are now available.</p>
            <p>View and download your ballots here:</p>
            <p><a href="${magicLinkUrl}">${magicLinkUrl}</a></p>
            <p>This link will remain active for one year.</p>
            <p>Best regards,<br>NCFCA Club Speech Ballot System</p>
          `
        });

        await prisma.competitor.update({
          where: { id: competitor.id },
          data: { magicLinkSentAt: new Date() }
        });

        emailsSent++;
      } catch (emailError) {
        console.error(`Failed to send email to ${competitor.email}:`, emailError);
      }
    }

    res.json({ 
      success: true, 
      tournament, 
      emailsSent, 
      totalCompetitors: competitors.length 
    });
  } catch (error) {
    console.error('Error closing tournament:', error);
    res.status(500).json({ error: 'Failed to close tournament' });
  }
});

// POST /admin/competitors - Add competitor
router.post('/competitors', requireAuth, async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { tournamentId, firstName, lastName, email } = req.body;

    if (!tournamentId || !firstName || !lastName || !email) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const competitor = await prisma.competitor.create({
      data: {
        tournamentId,
        firstName,
        lastName,
        email
      }
    });

    res.json({ success: true, competitor });
  } catch (error) {
    console.error('Error creating competitor:', error);
    res.status(500).json({ error: 'Failed to create competitor' });
  }
});

// PUT /admin/competitors/:id - Update competitor
router.put('/competitors/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { id } = req.params;
    const { firstName, lastName, email } = req.body;

    const competitor = await prisma.competitor.update({
      where: { id },
      data: { firstName, lastName, email }
    });

    res.json({ success: true, competitor });
  } catch (error) {
    console.error('Error updating competitor:', error);
    res.status(500).json({ error: 'Failed to update competitor' });
  }
});

// DELETE /admin/competitors/:id - Delete competitor
router.delete('/competitors/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { id } = req.params;

    await prisma.competitor.delete({ where: { id } });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting competitor:', error);
    res.status(500).json({ error: 'Failed to delete competitor' });
  }
});

// GET /admin/competitors - List competitors for a tournament
router.get('/competitors', requireAuth, async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { tournamentId } = req.query;

    if (!tournamentId) {
      return res.status(400).json({ error: 'tournamentId is required' });
    }

    const competitors = await prisma.competitor.findMany({
      where: { tournamentId: tournamentId as string },
      include: {
        _count: {
          select: { ballots: true }
        }
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }]
    });

    res.json(competitors);
  } catch (error) {
    console.error('Error fetching competitors:', error);
    res.status(500).json({ error: 'Failed to fetch competitors' });
  }
});

// POST /admin/competitors/:id/resend - Resend magic link
router.post('/competitors/:id/resend', requireAuth, async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { id } = req.params;

    const competitor = await prisma.competitor.findUnique({
      where: { id },
      include: { tournament: true }
    });

    if (!competitor) {
      return res.status(404).json({ error: 'Competitor not found' });
    }

    const magicLinkUrl = `${process.env.FRONTEND_URL}/ballots/${competitor.magicToken}`;

    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: competitor.email,
      subject: `Your NCFCA Speech Ballots - ${competitor.tournament.name}`,
      html: `
        <p>Hi ${competitor.firstName},</p>
        <p>Your speech ballots from <strong>${competitor.tournament.name}</strong> are available.</p>
        <p>View and download your ballots here:</p>
        <p><a href="${magicLinkUrl}">${magicLinkUrl}</a></p>
        <p>This link will remain active for one year.</p>
        <p>Best regards,<br>NCFCA Club Speech Ballot System</p>
      `
    });

    await prisma.competitor.update({
      where: { id },
      data: { magicLinkSentAt: new Date() }
    });

    res.json({ success: true, message: 'Magic link resent' });
  } catch (error) {
    console.error('Error resending magic link:', error);
    res.status(500).json({ error: 'Failed to resend magic link' });
  }
});

// POST /admin/tournaments/:id/send-all-links - Send magic links to all competitors
router.post('/tournaments/:id/send-all-links', requireAuth, async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { id } = req.params;

    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: { competitors: true }
    });

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });

    let emailsSent = 0;
    const errors: string[] = [];

    for (const competitor of tournament.competitors) {
      const magicLinkUrl = `${process.env.FRONTEND_URL}/ballots/${competitor.magicToken}`;

      try {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: competitor.email,
          subject: `Your NCFCA Speech Ballots - ${tournament.name}`,
          html: `
            <p>Hi ${competitor.firstName},</p>
            <p>Your speech ballots from <strong>${tournament.name}</strong> are available.</p>
            <p>View and download your ballots here:</p>
            <p><a href="${magicLinkUrl}">${magicLinkUrl}</a></p>
            <p>This link will remain active for one year.</p>
            <p>Best regards,<br>NCFCA Club Speech Ballot System</p>
          `
        });

        await prisma.competitor.update({
          where: { id: competitor.id },
          data: { magicLinkSentAt: new Date() }
        });

        emailsSent++;
      } catch (emailError: any) {
        console.error(`Failed to send email to ${competitor.email}:`, emailError);
        errors.push(`${competitor.firstName} ${competitor.lastName}: ${emailError.message}`);
      }
    }

    res.json({
      success: true,
      emailsSent,
      totalCompetitors: tournament.competitors.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Error sending magic links:', error);
    res.status(500).json({ error: 'Failed to send magic links' });
  }
});

// GET /admin/tournaments/:id - Get single tournament
router.get('/tournaments/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { id } = req.params;

    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        _count: {
          select: { competitors: true, ballots: true }
        }
      }
    });

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    res.json(tournament);
  } catch (error) {
    console.error('Error fetching tournament:', error);
    res.status(500).json({ error: 'Failed to fetch tournament' });
  }
});

// GET /admin/ballots - View all ballots
router.get('/ballots', requireAuth, async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { tournamentId, status } = req.query;

    const where: any = {};
    if (tournamentId) where.tournamentId = tournamentId;
    if (status) where.status = status;

    const ballots = await prisma.ballot.findMany({
      where,
      include: {
        competitor: {
          select: { firstName: true, lastName: true }
        },
        eventType: {
          select: { displayName: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(ballots);
  } catch (error) {
    console.error('Error fetching ballots:', error);
    res.status(500).json({ error: 'Failed to fetch ballots' });
  }
});

// GET /admin/past-tournaments - Get closed tournaments for import selection
router.get('/past-tournaments', requireAuth, async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');

    const tournaments = await prisma.tournament.findMany({
      where: { status: 'closed' },
      include: {
        _count: { select: { competitors: true } }
      },
      orderBy: { meetingDate: 'desc' }
    });

    res.json(tournaments);
  } catch (error) {
    console.error('Error fetching past tournaments:', error);
    res.status(500).json({ error: 'Failed to fetch past tournaments' });
  }
});

// GET /admin/tournaments/:id/competitors-for-import - Get competitors from a specific tournament
router.get('/tournaments/:id/competitors-for-import', requireAuth, async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { id } = req.params;

    const competitors = await prisma.competitor.findMany({
      where: { tournamentId: id },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }]
    });

    const result = competitors.map(c => ({
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email
    }));

    res.json(result);
  } catch (error) {
    console.error('Error fetching tournament competitors:', error);
    res.status(500).json({ error: 'Failed to fetch competitors' });
  }
});

// POST /admin/tournaments/:id/import-competitors - Import competitors from past tournaments
router.post('/tournaments/:id/import-competitors', requireAuth, async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { id } = req.params;
    const { competitors } = req.body;

    if (!competitors || !Array.isArray(competitors) || competitors.length === 0) {
      return res.status(400).json({ error: 'Competitors array is required' });
    }

    // Verify tournament exists
    const tournament = await prisma.tournament.findUnique({ where: { id } });
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    // Get existing competitors in this tournament to avoid duplicates
    const existingCompetitors = await prisma.competitor.findMany({
      where: { tournamentId: id },
      select: { email: true }
    });
    const existingEmails = new Set(existingCompetitors.map(c => c.email.toLowerCase()));

    // Filter out duplicates and create new competitors
    const toCreate = competitors.filter((c: any) => 
      !existingEmails.has(c.email.toLowerCase())
    );

    const created = await prisma.competitor.createMany({
      data: toCreate.map((c: any) => ({
        tournamentId: id,
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email
      }))
    });

    res.json({
      success: true,
      imported: created.count,
      skipped: competitors.length - created.count
    });
  } catch (error) {
    console.error('Error importing competitors:', error);
    res.status(500).json({ error: 'Failed to import competitors' });
  }
});

// GET /admin/tournaments/:id/rankings - Get rankings by event type
router.get('/tournaments/:id/rankings', requireAuth, async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { id } = req.params;

    // Get all submitted ballots for this tournament with competitor and event info
    const ballots = await prisma.ballot.findMany({
      where: {
        tournamentId: id,
        status: 'submitted'
      },
      include: {
        competitor: {
          select: { id: true, firstName: true, lastName: true }
        },
        eventType: {
          select: { id: true, displayName: true }
        }
      }
    });

    // Group ballots by event type, then by competitor
    const eventRankings: Record<string, {
      eventTypeId: number;
      eventTypeName: string;
      competitors: Array<{
        competitorId: string;
        competitorName: string;
        totalScore: number;
        ballotCount: number;
        averageScore: number;
        rank: number;
      }>;
    }> = {};

    // First, aggregate scores per competitor per event
    const scoresByEventAndCompetitor: Record<string, Record<string, {
      competitorId: string;
      competitorName: string;
      totalScore: number;
      ballotCount: number;
    }>> = {};

    for (const ballot of ballots) {
      const eventKey = `${ballot.eventType.id}`;
      const competitorKey = ballot.competitor.id;

      if (!scoresByEventAndCompetitor[eventKey]) {
        scoresByEventAndCompetitor[eventKey] = {};
      }

      if (!scoresByEventAndCompetitor[eventKey][competitorKey]) {
        scoresByEventAndCompetitor[eventKey][competitorKey] = {
          competitorId: ballot.competitor.id,
          competitorName: `${ballot.competitor.firstName} ${ballot.competitor.lastName}`,
          totalScore: 0,
          ballotCount: 0
        };
      }

      // Calculate total score for this ballot (sum of all 5 categories)
      const ballotTotal = (ballot.scoreContent || 0) +
                         (ballot.scoreOrganizationCitations || 0) +
                         (ballot.scoreCategory3 || 0) +
                         (ballot.scoreCategory4 || 0) +
                         (ballot.scoreImpact || 0);

      scoresByEventAndCompetitor[eventKey][competitorKey].totalScore += ballotTotal;
      scoresByEventAndCompetitor[eventKey][competitorKey].ballotCount += 1;
    }

    // Convert to rankings with proper rank assignment (ties share rank)
    for (const [eventKey, competitors] of Object.entries(scoresByEventAndCompetitor)) {
      const eventBallot = ballots.find(b => `${b.eventType.id}` === eventKey);
      if (!eventBallot) continue;

      const competitorList = Object.values(competitors)
        .map(c => ({
          ...c,
          averageScore: c.ballotCount > 0 ? c.totalScore / c.ballotCount : 0,
          rank: 0
        }))
        .sort((a, b) => b.totalScore - a.totalScore); // Sort by total score descending

      // Assign ranks with ties
      let currentRank = 1;
      for (let i = 0; i < competitorList.length; i++) {
        if (i > 0 && competitorList[i].totalScore === competitorList[i - 1].totalScore) {
          // Same score as previous - share rank
          competitorList[i].rank = competitorList[i - 1].rank;
        } else {
          competitorList[i].rank = currentRank;
        }
        currentRank++;
      }

      eventRankings[eventKey] = {
        eventTypeId: eventBallot.eventType.id,
        eventTypeName: eventBallot.eventType.displayName,
        competitors: competitorList
      };
    }

    // Convert to array sorted by event name
    const rankings = Object.values(eventRankings).sort((a, b) => 
      a.eventTypeName.localeCompare(b.eventTypeName)
    );

    res.json(rankings);
  } catch (error) {
    console.error('Error fetching rankings:', error);
    res.status(500).json({ error: 'Failed to fetch rankings' });
  }
});

export default router;
