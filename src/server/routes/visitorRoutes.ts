/**
 * Visitor Counter Express Routes
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Step 28 — Real Website Visitor Counter
 */

import { Router, Request, Response } from 'express';
import { recordVisit, getVisitStats, isValidSessionId } from '../services/visitorCounterService.js';

export const visitorRouter = Router();

// POST /api/visits/record
visitorRouter.post('/record', async (req: Request, res: Response) => {
  try {
    // Opportunistic defense-in-depth: reject requests marked by browsers as cross-site.
    // Note: This does not defend against non-browser scripts that omit or forge headers.
    const secFetchSite = req.headers['sec-fetch-site'];
    if (secFetchSite === 'cross-site') {
      return res.status(403).json({
        success: false,
        error: 'Cross-site request blocked',
      });
    }

    const rawSessionId = req.body?.sessionId;

    // Strict validation: Reject missing or malformed tokens before invoking counting logic
    if (!isValidSessionId(rawSessionId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or missing session token format. Must follow ^sess_[a-zA-Z0-9_-]{8,64}$',
      });
    }

    const result = await recordVisit(rawSessionId);

    if (!result.success) {
      const statusCode = result.storageType === 'unavailable' ? 503 : 400;
      return res.status(statusCode).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('[VisitorRoutes] Error recording visit:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to record site visit',
    });
  }
});

// GET /api/visits/stats
visitorRouter.get('/stats', async (_req: Request, res: Response) => {
  try {
    const result = await getVisitStats();

    if (!result.success && result.storageType === 'unavailable') {
      return res.status(503).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('[VisitorRoutes] Error retrieving visit stats:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve site visit stats',
    });
  }
});
