/**
 * Vercel Serverless Function: Google Drive OAuth Status Endpoint
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Step 22 — Google Drive API / OAuth Foundation
 * 
 * Maps directly to GET /api/auth/google/status on Vercel deployment.
 */

import { googleDriveOAuthService } from '../../../src/services/googleDriveOAuthService.js';
import { GOOGLE_DRIVE_READONLY_SCOPE } from '../../../src/types/googleDrive.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({
      success: false,
      error: 'Method Not Allowed. Only GET requests are permitted for this endpoint.',
    });
  }

  const config = googleDriveOAuthService.getConfig();
  const hasClientId = Boolean(config.clientId);
  const hasClientSecret = Boolean(config.clientSecret);
  const hasRedirectUri = Boolean(config.redirectUri);

  return res.status(200).json({
    status: 'ok',
    mode: 'foundation',
    service: 'Google Drive OAuth 2.0 Foundation (Step 22)',
    configured: hasClientId && hasClientSecret && hasRedirectUri,
    details: {
      hasClientId,
      hasClientSecret,
      hasRedirectUri,
      scope: GOOGLE_DRIVE_READONLY_SCOPE,
      endpoints: {
        auth: 'https://accounts.google.com/o/oauth2/v2/auth',
        token: 'https://oauth2.googleapis.com/token',
        drive: 'https://www.googleapis.com/drive/v3',
      },
    },
    message:
      hasClientId && hasClientSecret && hasRedirectUri
        ? 'Google OAuth credentials detected in server environment.'
        : 'Google OAuth environment variables not yet populated. System is ready to connect upon credentials entry.',
  });
}
