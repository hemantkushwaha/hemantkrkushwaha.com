
import {
  googleDriveOAuthService,
  GoogleOAuthError,
} from '../../../src/services/googleDriveOAuthService.js';
import { GOOGLE_DRIVE_READONLY_SCOPE } from '../../../src/types/googleDrive.js';

function methodNotAllowed(res: any, allowed: string[]) {
  res.setHeader('Allow', allowed);
  return res.status(405).json({
    success: false,
    error: 'METHOD_NOT_ALLOWED',
    message: `Method Not Allowed. Allowed method(s): ${allowed.join(', ')}`,
  });
}

function handleError(res: any, err: any, fallbackCode: string, fallbackMessage: string) {
  if (err instanceof GoogleOAuthError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.code,
      message: err.message,
    });
  }

  return res.status(500).json({
    success: false,
    error: fallbackCode,
    message: err?.message || fallbackMessage,
  });
}

export default async function handler(req: any, res: any) {
  const action = req.query?.action;

  if (typeof action !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'INVALID_ACTION',
      message: 'A valid Google OAuth endpoint action is required.',
    });
  }

  if (action === 'status') {
    if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);

    const config = googleDriveOAuthService.getConfig();
    const hasClientId = Boolean(config.clientId);
    const hasClientSecret = Boolean(config.clientSecret);
    const hasRedirectUri = Boolean(config.redirectUri);

    return res.status(200).json({
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
  }

  if (action === 'url') {
    if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);

    try {
      const state =
        typeof req.query?.state === 'string' ? req.query.state : undefined;

      const authUrlData =
        await googleDriveOAuthService.generateAuthorizationUrlAsync({
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
      return handleError(
        res,
        err,
        'OAUTH_URL_GENERATION_FAILED',
        'Failed to generate authorization URL.',
      );
    }
  }

  if (action === 'callback') {
    if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);

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
      const record = await googleDriveOAuthService.exchangeAndStoreConnection(
        code,
        { state: typeof state === 'string' ? state : undefined },
      );

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
      return handleError(
        res,
        err,
        'OAUTH_CALLBACK_FAILED',
        'Failed to complete Google OAuth authorization.',
      );
    }
  }

  if (action === 'connection-status') {
    if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);

    try {
      const status = await googleDriveOAuthService.getSafeConnectionStatus();
      return res.status(200).json({ success: true, ...status });
    } catch (err: any) {
      const statusCode =
        typeof err?.statusCode === 'number' ? err.statusCode : 500;

      return res.status(statusCode).json({
        success: false,
        error: err?.code || 'CONNECTION_STATUS_FAILED',
        message:
          err?.message || 'Failed to retrieve Google Drive connection status.',
      });
    }
  }

  if (action === 'disconnect') {
    if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

    try {
      const result = await googleDriveOAuthService.disconnectGoogleAccount();
      return res.status(200).json({ success: true, ...result });
    } catch (err: any) {
      return handleError(
        res,
        err,
        'DISCONNECT_FAILED',
        'Failed to disconnect Google account.',
      );
    }
  }

  return res.status(404).json({
    success: false,
    error: 'UNKNOWN_ACTION',
    message: 'Unknown Google OAuth endpoint action.',
  });
}
