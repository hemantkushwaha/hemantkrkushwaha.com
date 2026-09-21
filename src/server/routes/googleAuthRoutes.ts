/**
 * Google Drive OAuth Foundation & Connection Routes
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Step 22C — Secure Google Drive OAuth Authorization & Connection
 * 
 * Mount path: /api/auth/google
 * 
 * Endpoints:
 * - GET /api/auth/google: Service index & overview
 * - GET /api/auth/google/status: Configuration diagnostics (zero secret leakage)
 * - GET /api/auth/google/url: Authorization URL generator
 * - GET /api/auth/google/callback: OAuth code exchange & AES-256-GCM encrypted persistence
 * - GET /api/auth/google/connection-status: Safe connected metadata (zero secret leakage)
 * - POST /api/auth/google/disconnect: Revocation & removal of connected account
 * 
 * Invariants:
 * - Single Google Account connection architecture
 * - Cryptographically secure AES-256-GCM token encryption
 * - ZERO access tokens, refresh tokens, or client secrets returned or leaked
 * - Public/anonymous access denied to tokens by RLS and server isolation
 */

import { Router, Request, Response } from 'express';
import {
  googleDriveOAuthService,
  GoogleOAuthError,
} from '../../services/googleDriveOAuthService.js';
import { GOOGLE_DRIVE_READONLY_SCOPE } from '../../types/googleDrive.js';

export const googleAuthRouter = Router();

/**
 * GET /api/auth/google
 * Service index endpoint.
 */
googleAuthRouter.get('/', (req: Request, res: Response) => {
  res.json({
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
});

/**
 * GET /api/auth/google/status
 * Safe diagnostics indicating whether Google OAuth variables are configured.
 * GUARANTEE: Never exposes client secret or any sensitive credentials.
 */
googleAuthRouter.get('/status', (req: Request, res: Response) => {
  const config = googleDriveOAuthService.getConfig();
  const hasClientId = Boolean(config.clientId);
  const hasClientSecret = Boolean(config.clientSecret);
  const hasRedirectUri = Boolean(config.redirectUri);

  res.json({
    status: 'ok',
    mode: 'production',
    service: 'Google Drive OAuth 2.0 (Step 22C)',
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
});

/**
 * GET /api/auth/google/url
 * Generates the official Google OAuth 2.0 authorization URL.
 */
googleAuthRouter.get('/url', (req: Request, res: Response) => {
  try {
    const state = typeof req.query.state === 'string' ? req.query.state : undefined;
    const authUrlData = googleDriveOAuthService.generateAuthorizationUrl({
      state,
      accessType: 'offline',
      prompt: 'consent',
    });

    res.json({
      success: true,
      url: authUrlData.url,
      state: authUrlData.state,
      scope: authUrlData.scope,
    });
  } catch (err: any) {
    if (err instanceof GoogleOAuthError) {
      res.status(err.statusCode).json({
        success: false,
        error: err.code,
        message: err.message,
      });
      return;
    }
    res.status(500).json({
      success: false,
      error: 'OAUTH_URL_GENERATION_FAILED',
      message: err.message || 'Failed to generate authorization URL.',
    });
  }
});

/**
 * GET /api/auth/google/callback
 * Official Google OAuth callback handler.
 * 
 * Step 22C:
 * - Validates authorization code and CSRF state
 * - Exchanges code for tokens via official Google token endpoint
 * - Encrypts access and refresh tokens using AES-256-GCM
 * - Stores connection record in google_oauth_connections table
 * - Returns safe metadata confirming connection (zero secrets exposed)
 */
googleAuthRouter.get('/callback', async (req: Request, res: Response) => {
  const { code, state, error, error_description } = req.query;

  if (error) {
    res.status(400).json({
      success: false,
      error: 'GOOGLE_OAUTH_DENIED',
      message: `Google OAuth consent was denied: ${String(error_description || error)}`,
    });
    return;
  }

  if (!code || typeof code !== 'string') {
    res.status(400).json({
      success: false,
      error: 'MISSING_AUTH_CODE',
      message: 'Missing authorization code in OAuth callback.',
    });
    return;
  }

  try {
    const record = await googleDriveOAuthService.exchangeAndStoreConnection(code, {
      state: typeof state === 'string' ? state : undefined,
    });

    res.json({
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
      res.status(err.statusCode).json({
        success: false,
        error: err.code,
        message: err.message,
      });
      return;
    }
    res.status(500).json({
      success: false,
      error: 'OAUTH_CALLBACK_FAILED',
      message: err.message || 'Failed to complete Google OAuth authorization.',
    });
  }
});

/**
 * GET /api/auth/google/connection-status
 * Safe diagnostics indicating whether a Google account is currently connected.
 * GUARANTEE: Never exposes tokens, secrets, or encryption keys.
 */
googleAuthRouter.get('/connection-status', async (req: Request, res: Response) => {
  try {
    const status = await googleDriveOAuthService.getSafeConnectionStatus();
    res.json({
      success: true,
      ...status,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'CONNECTION_STATUS_FAILED',
      message: err.message || 'Failed to retrieve connection status.',
    });
  }
});

/**
 * POST /api/auth/google/disconnect
 * Securely disconnects Google Drive account by revoking credentials and removing record.
 */
googleAuthRouter.post('/disconnect', async (req: Request, res: Response) => {
  try {
    const result = await googleDriveOAuthService.disconnectGoogleAccount();
    res.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    if (err instanceof GoogleOAuthError) {
      res.status(err.statusCode).json({
        success: false,
        error: err.code,
        message: err.message,
      });
      return;
    }
    res.status(500).json({
      success: false,
      error: 'DISCONNECT_FAILED',
      message: err.message || 'Failed to disconnect Google account.',
    });
  }
});

export default googleAuthRouter;
