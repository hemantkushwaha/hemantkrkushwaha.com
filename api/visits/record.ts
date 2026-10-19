/**
 * Vercel Serverless Function: Record Visitor Session
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Step 28 — Real Website Visitor Counter
 */

import { recordVisit, isValidSessionId } from '../../src/server/services/visitorCounterService.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({
      success: false,
      error: 'Method Not Allowed. Only POST is accepted.',
    });
  }

  // Opportunistic defense-in-depth: reject requests marked by browsers as cross-site.
  // Note: This does not defend against non-browser scripts that omit or forge headers.
  const secFetchSite = req.headers?.['sec-fetch-site'];
  if (secFetchSite === 'cross-site') {
    return res.status(403).json({
      success: false,
      error: 'Cross-site request blocked',
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

    const rawSessionId = body?.sessionId;

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
    return res.status(500).json({
      success: false,
      error: 'Failed to record site visit',
    });
  }
}
