/**
 * Vercel Serverless Function: Google Drive OAuth Callback Endpoint
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Step 22C — Secure Google Drive OAuth Authorization & Connection
 * 
 * Maps directly to GET /api/auth/google/callback on Vercel deployment.
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

  const { code, state, error, error_description } = req.query || {};

  if (error) {
    return res.status(400).json({
      success: false,
      error: 'GOOGLE_OAUTH_DENIED',
      message: `Google OAuth consent was denied: ${String(error_description || error)}`,
    });
  }

  if (!code || typeof code !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'MISSING_AUTH_CODE',
      message: 'Missing authorization code in OAuth callback.',
    });
  }

  try {
    const record = await googleDriveOAuthService.exchangeAndStoreConnection(code, {
      state: typeof state === 'string' ? state : undefined,
    });

    return res.status(200).json({
      success: true,
      connected: true,
      provider: 'google',
      email: record.email,
      scope: record.scope,
      expires_at: record.expires_at,
      message: 'Google Drive account connected successfully with read-only scope.',
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
      error: 'OAUTH_CALLBACK_FAILED',
      message: err.message || 'Failed to complete Google OAuth authorization.',
    });
  }
}
