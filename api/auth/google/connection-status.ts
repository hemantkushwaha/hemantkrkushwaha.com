/**
 * Vercel Serverless Function: Google Drive OAuth Connection Status Endpoint
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Step 22C — Secure Google Drive OAuth Authorization & Connection
 * 
 * Maps directly to GET /api/auth/google/connection-status on Vercel deployment.
 * 
 * GUARANTEE:
 * Returns safe metadata only. Never leaks tokens, secrets, or encryption keys.
 */

import { googleDriveOAuthService } from '../../../src/services/googleDriveOAuthService.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({
      success: false,
      error: 'Method Not Allowed. Only GET requests are permitted for this endpoint.',
    });
  }

  try {
    const status = await googleDriveOAuthService.getSafeConnectionStatus();
    return res.status(200).json({
      success: true,
      ...status,
    });
  } catch (err: any) {
    const statusCode = typeof err.statusCode === 'number' ? err.statusCode : 500;
    const errorCode = err.code || 'CONNECTION_STATUS_FAILED';
    return res.status(statusCode).json({
      success: false,
      error: errorCode,
      message: err.message || 'Failed to retrieve Google Drive connection status.',
    });
  }
}
