/**
 * Vercel Serverless Function: Record Visitor Session
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Step 28 — Real Website Visitor Counter
 */

import { recordVisit } from '../../src/server/services/visitorCounterService.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({
      success: false,
      error: 'Method Not Allowed. Only POST is accepted.',
    });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    const sessionId = typeof body?.sessionId === 'string' ? body.sessionId.slice(0, 64) : undefined;
    const result = await recordVisit(sessionId);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to record site visit',
      totalVisits: 0,
      todayVisits: 0,
    });
  }
}
