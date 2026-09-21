/**
 * Vercel Serverless Function: Google Drive OAuth Foundation Endpoint
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Step 22C — Secure Google Drive OAuth Authorization & Connection
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
    mode: 'production',
    service: 'Google Drive OAuth 2.0 (Step 22C)',
    scope: GOOGLE_DRIVE_READONLY_SCOPE,
    routes: {
      status: '/api/auth/google/status',
      url: '/api/auth/google/url',
      callback: '/api/auth/google/callback',
      connectionStatus: '/api/auth/google/connection-status',
      disconnect: '/api/auth/google/disconnect',
    },
  });
}
