/**
 * Vercel Serverless Function: Google Drive OAuth Foundation Endpoint
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Step 22 — Google Drive API / OAuth Foundation
 * 
 * Maps directly to GET /api/auth/google on Vercel deployment.
 */

import { GOOGLE_DRIVE_READONLY_SCOPE } from '../../../src/types/googleDrive.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({
      success: false,
      error: 'Method Not Allowed. Only GET requests are permitted for this endpoint.',
    });
  }

  return res.status(200).json({
    status: 'ok',
    mode: 'foundation',
    message:
      'Step 22 Google OAuth architecture foundation. Live Google OAuth authorization is disabled in Step 22 foundation mode. No Google account is connected.',
    activated: false,
    scope: GOOGLE_DRIVE_READONLY_SCOPE,
    routes: {
      status: '/api/auth/google/status',
      url: '/api/auth/google/url',
      callback: '/api/auth/google/callback',
    },
  });
}
