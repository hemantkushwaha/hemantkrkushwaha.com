/**
 * Vercel Serverless Function: Retrieve Visitor Stats
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Step 28 — Real Website Visitor Counter
 */

import { getVisitStats } from '../../src/server/services/visitorCounterService.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({
      success: false,
      error: 'Method Not Allowed. Only GET is accepted.',
    });
  }

  try {
    const result = await getVisitStats();

    if (!result.success && result.storageType === 'unavailable') {
      return res.status(503).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve site visit stats',
    });
  }
}
