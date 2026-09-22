/**
 * Vercel Serverless Function: Google Drive OAuth URL Generator Endpoint
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Step 22 — Google Drive API / OAuth Foundation
 * 
 * Maps directly to GET /api/auth/google/url on Vercel deployment.
 */

import {
  googleDriveOAuthService,
  GoogleOAuthError,
} from '../../../src/services/googleDriveOAuthService.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({
      success: false,
      error: 'Method Not Allowed. Only GET requests are permitted for this endpoint.',
    });
  }

  try {
    const state = typeof req.query?.state === 'string' ? req.query.state : undefined;
    const authUrlData = await googleDriveOAuthService.generateAuthorizationUrlAsync({
      state,
      accessType: 'offline',
      prompt: 'consent',
    });

    return res.status(200).json({
      success: true,
      url: authUrlData.url,
      state: authUrlData.state,
      scope: authUrlData.scope,
    });
  } catch (err: any) {
    if (err instanceof GoogleOAuthError) {
      return res.status(err.statusCode).json({
        success: false,
        error: err.code,
        message: err.message,
      });
    }
    return res.status(500).json({
      success: false,
      error: 'OAUTH_URL_GENERATION_FAILED',
      message: err.message || 'Failed to generate authorization URL.',
    });
  }
}
