/**
 * Vercel Serverless Function: Google Drive OAuth Disconnect Endpoint
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Step 22C — Secure Google Drive OAuth Authorization & Connection
 * 
 * Maps directly to POST /api/auth/google/disconnect on Vercel deployment.
 * 
 * Disconnects the active Google Drive account:
 * - Revokes token with Google OAuth endpoints if possible
 * - Removes encrypted connection record from google_oauth_connections
 */

import {
  googleDriveOAuthService,
  GoogleOAuthError,
} from '../../../src/services/googleDriveOAuthService.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({
      success: false,
      error: 'Method Not Allowed. Only POST requests are permitted for this endpoint.',
    });
  }

  try {
    const result = await googleDriveOAuthService.disconnectGoogleAccount();
    return res.status(200).json({
      success: true,
      ...result,
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
      error: 'DISCONNECT_FAILED',
      message: err.message || 'Failed to disconnect Google account.',
    });
  }
}
