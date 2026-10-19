/**
 * Visitor Counter Express Routes
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Step 28 — Real Website Visitor Counter
 */

import { Router, Request, Response } from 'express';
import { recordVisit, getVisitStats } from '../services/visitorCounterService.js';

export const visitorRouter = Router();

// POST /api/visits/record
visitorRouter.post('/record', async (req: Request, res: Response) => {
  try {
    const sessionId = typeof req.body?.sessionId === 'string' ? req.body.sessionId.slice(0, 64) : undefined;
    const result = await recordVisit(sessionId);
    return res.status(200).json(result);
  } catch (error) {
    console.error('[VisitorRoutes] Error recording visit:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to record site visit',
      totalVisits: 0,
      todayVisits: 0,
    });
  }
});

// GET /api/visits/stats
visitorRouter.get('/stats', async (_req: Request, res: Response) => {
  try {
    const result = await getVisitStats();
    return res.status(200).json(result);
  } catch (error) {
    console.error('[VisitorRoutes] Error retrieving visit stats:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve site visit stats',
      totalVisits: 0,
      todayVisits: 0,
    });
  }
});
