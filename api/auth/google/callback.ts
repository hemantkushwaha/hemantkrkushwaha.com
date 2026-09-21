/**
 * Vercel Serverless Function: Google Drive OAuth Callback Endpoint
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Step 22 — Google Drive API / OAuth Foundation
 * 
 * Maps directly to GET /api/auth/google/callback on Vercel deployment.
 */

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({
      success: false,
      error: 'Method Not Allowed. Only GET requests are permitted for this endpoint.',
    });
  }

  const { code, state, error } = req.query || {};

  if (error) {
    return res.status(400).json({
      success: false,
      error: 'GOOGLE_OAUTH_DENIED',
      message: `Google OAuth consent was denied or failed: ${String(error)}`,
    });
  }

  if (!code || typeof code !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'MISSING_AUTH_CODE',
      message: 'Missing authorization code in OAuth callback.',
    });
  }

  return res.status(200).json({
    success: true,
    mode: 'foundation_placeholder',
    message:
      'Step 22 Google OAuth callback route foundation verified. Live account connection and token persistence are disabled in Step 22 foundation mode.',
    received_code: true,
    received_state: typeof state === 'string' && state.length > 0,
  });
}
