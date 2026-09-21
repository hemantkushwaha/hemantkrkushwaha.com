/**
 * Google Drive OAuth 2.0 Foundation Service
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Step 22 — Google Drive API / OAuth Foundation
 * 
 * Server-Side Responsibilities:
 * - Validate Google OAuth 2.0 configuration
 * - Generate official Google authorization URL (least-privilege read-only scope)
 * - Cryptographic CSRF state generation and verification
 * - Authorization code exchange for tokens (abstraction)
 * - Refresh token exchange for fresh access tokens (abstraction)
 * - Strict token security: Zero secret leakage, zero token logging, server-side only
 * 
 * Invariants:
 * - NO browser automation (Puppeteer, Playwright, Selenium)
 * - NO cookie or session harvesting
 * - NO unofficial or reverse-engineered Google endpoints
 * - Testable offline with zero network calls via pluggable HTTP transport
 */

import crypto from 'crypto';
import {
  GoogleOAuthConfig,
  GoogleOAuthTokens,
  GoogleOAuthTokenResponse,
  GoogleOAuthUrlOptions,
  GoogleHttpClient,
  GOOGLE_OAUTH_AUTH_ENDPOINT,
  GOOGLE_OAUTH_TOKEN_ENDPOINT,
  GOOGLE_DRIVE_READONLY_SCOPE,
} from '../types/googleDrive.js';

/**
 * Standard Google OAuth error codes
 */
export type GoogleOAuthErrorCode =
  | 'MISSING_CLIENT_ID'
  | 'MISSING_CLIENT_SECRET'
  | 'MISSING_REDIRECT_URI'
  | 'MISSING_AUTH_CODE'
  | 'MISSING_REFRESH_TOKEN'
  | 'STATE_MISMATCH'
  | 'EXPIRED_STATE'
  | 'INVALID_STATE'
  | 'INVALID_TOKEN_RESPONSE'
  | 'OAUTH_EXCHANGE_FAILED'
  | 'REFRESH_TOKEN_FAILED'
  | 'NETWORK_ERROR';

/**
 * Structured error class for Google OAuth operations
 */
export class GoogleOAuthError extends Error {
  public readonly code: GoogleOAuthErrorCode;
  public readonly statusCode: number;

  constructor(code: GoogleOAuthErrorCode, message: string, statusCode: number = 400) {
    super(message);
    this.name = 'GoogleOAuthError';
    this.code = code;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, GoogleOAuthError.prototype);
  }
}

/**
 * Service options
 */
export interface GoogleDriveOAuthServiceOptions {
  config?: Partial<GoogleOAuthConfig>;
  httpClient?: GoogleHttpClient;
}

/**
 * Server-side Google Drive OAuth Service
 */
export class GoogleDriveOAuthService {
  private explicitConfig: Partial<GoogleOAuthConfig>;
  private httpClient?: GoogleHttpClient;

  constructor(options: GoogleDriveOAuthServiceOptions = {}) {
    this.explicitConfig = options.config || {};
    this.httpClient = options.httpClient;
  }

  /**
   * Resolves OAuth configuration from explicit options or server environment variables.
   * NEVER reads VITE_* client-side variables.
   */
  public getConfig(): GoogleOAuthConfig {
    const clientId =
      this.explicitConfig.clientId || process.env.GOOGLE_CLIENT_ID || '';
    const clientSecret =
      this.explicitConfig.clientSecret || process.env.GOOGLE_CLIENT_SECRET || '';
    const redirectUri =
      this.explicitConfig.redirectUri || process.env.GOOGLE_OAUTH_REDIRECT_URI || '';
    const scopes =
      this.explicitConfig.scopes || [GOOGLE_DRIVE_READONLY_SCOPE];

    return {
      clientId: clientId.trim(),
      clientSecret: clientSecret.trim(),
      redirectUri: redirectUri.trim(),
      scopes,
    };
  }

  /**
   * Validates required server-side OAuth configuration.
   * Throws specific GoogleOAuthError if any required field is missing.
   */
  public validateConfig(config?: Partial<GoogleOAuthConfig>): GoogleOAuthConfig {
    const resolved = config ? { ...this.getConfig(), ...config } : this.getConfig();

    if (!resolved.clientId) {
      throw new GoogleOAuthError(
        'MISSING_CLIENT_ID',
        'Google OAuth Client ID is missing. Set GOOGLE_CLIENT_ID in server environment variables.',
        500
      );
    }

    if (!resolved.clientSecret) {
      throw new GoogleOAuthError(
        'MISSING_CLIENT_SECRET',
        'Google OAuth Client Secret is missing. Set GOOGLE_CLIENT_SECRET in server environment variables.',
        500
      );
    }

    if (!resolved.redirectUri) {
      throw new GoogleOAuthError(
        'MISSING_REDIRECT_URI',
        'Google OAuth Redirect URI is missing. Set GOOGLE_OAUTH_REDIRECT_URI in server environment variables.',
        500
      );
    }

    return resolved as GoogleOAuthConfig;
  }

  /**
   * Generates a cryptographically secure random state token for CSRF protection.
   * Produces a 64-character hex string (32 cryptographically random bytes).
   * Contains ZERO sensitive information.
   */
  public generateState(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Validates received state against expected state to prevent CSRF attacks.
   * Employs constant-time buffer comparison to prevent timing side-channel attacks.
   */
  public validateState(receivedState: string, expectedState: string): void {
    if (!receivedState || !expectedState || typeof receivedState !== 'string' || typeof expectedState !== 'string') {
      throw new GoogleOAuthError(
        'INVALID_STATE',
        'Invalid or missing OAuth state parameter.',
        400
      );
    }

    const receivedBuffer = Buffer.from(receivedState);
    const expectedBuffer = Buffer.from(expectedState);

    if (
      receivedBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
    ) {
      throw new GoogleOAuthError(
        'STATE_MISMATCH',
        'OAuth state mismatch detected. Request aborted for CSRF protection.',
        400
      );
    }
  }

  /**
   * Generates the official Google OAuth 2.0 authorization URL.
   * Enforces least-privilege read-only Drive scope by default.
   */
  public generateAuthorizationUrl(options: GoogleOAuthUrlOptions = {}): {
    url: string;
    state: string;
    scope: string;
  } {
    const config = this.validateConfig();
    const state = options.state || this.generateState();

    let scopeString: string;
    if (options.scope) {
      scopeString = Array.isArray(options.scope)
        ? options.scope.join(' ')
        : options.scope;
    } else {
      scopeString = (config.scopes && config.scopes.length > 0)
        ? config.scopes.join(' ')
        : GOOGLE_DRIVE_READONLY_SCOPE;
    }

    const params = new URLSearchParams();
    params.set('client_id', config.clientId);
    params.set('redirect_uri', config.redirectUri);
    params.set('response_type', 'code');
    params.set('scope', scopeString);
    params.set('access_type', options.accessType || 'offline');
    params.set('prompt', options.prompt || 'consent');
    params.set('state', state);

    if (options.includeGrantedScopes !== undefined) {
      params.set('include_granted_scopes', String(options.includeGrantedScopes));
    }
    if (options.loginHint) {
      params.set('login_hint', options.loginHint);
    }

    const url = `${GOOGLE_OAUTH_AUTH_ENDPOINT}?${params.toString()}`;

    return {
      url,
      state,
      scope: scopeString,
    };
  }

  /**
   * Exchanges an authorization code for tokens using Google's official token endpoint.
   * Sanitizes all logs to ensure zero secret leakage.
   */
  public async exchangeCodeForTokens(
    code: string,
    options: {
      state?: string;
      expectedState?: string;
      redirectUri?: string;
    } = {}
  ): Promise<GoogleOAuthTokens> {
    if (!code || typeof code !== 'string' || !code.trim()) {
      throw new GoogleOAuthError(
        'MISSING_AUTH_CODE',
        'Authorization code is required for token exchange.',
        400
      );
    }

    if (options.state && options.expectedState) {
      this.validateState(options.state, options.expectedState);
    }

    const config = this.validateConfig();
    const redirectUri = options.redirectUri || config.redirectUri;

    const bodyParams = new URLSearchParams();
    bodyParams.set('code', code.trim());
    bodyParams.set('client_id', config.clientId);
    bodyParams.set('client_secret', config.clientSecret);
    bodyParams.set('redirect_uri', redirectUri);
    bodyParams.set('grant_type', 'authorization_code');

    let responseData: any;
    if (this.httpClient) {
      const response = await this.httpClient({
        method: 'POST',
        url: GOOGLE_OAUTH_TOKEN_ENDPOINT,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: bodyParams.toString(),
      });

      if (response.status < 200 || response.status >= 300) {
        throw new GoogleOAuthError(
          'OAUTH_EXCHANGE_FAILED',
          `OAuth token exchange failed with HTTP ${response.status}.`,
          response.status
        );
      }
      responseData = response.data;
    } else {
      // Production live fetch branch (used when live network integration is activated)
      try {
        const response = await fetch(GOOGLE_OAUTH_TOKEN_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: bodyParams.toString(),
        });

        if (!response.ok) {
          throw new GoogleOAuthError(
            'OAUTH_EXCHANGE_FAILED',
            `OAuth token exchange failed with HTTP ${response.status}.`,
            response.status
          );
        }
        responseData = await response.json();
      } catch (err: any) {
        if (err instanceof GoogleOAuthError) throw err;
        throw new GoogleOAuthError(
          'NETWORK_ERROR',
          `Network error reaching Google OAuth token endpoint: ${err.message}`,
          502
        );
      }
    }

    return this.validateAndNormalizeTokenResponse(responseData);
  }

  /**
   * Refreshes an expired access token using an offline refresh token.
   */
  public async refreshAccessToken(
    refreshToken: string
  ): Promise<GoogleOAuthTokens> {
    if (!refreshToken || typeof refreshToken !== 'string' || !refreshToken.trim()) {
      throw new GoogleOAuthError(
        'MISSING_REFRESH_TOKEN',
        'Refresh token is required to refresh access token.',
        400
      );
    }

    const config = this.validateConfig();

    const bodyParams = new URLSearchParams();
    bodyParams.set('client_id', config.clientId);
    bodyParams.set('client_secret', config.clientSecret);
    bodyParams.set('refresh_token', refreshToken.trim());
    bodyParams.set('grant_type', 'refresh_token');

    let responseData: any;
    if (this.httpClient) {
      const response = await this.httpClient({
        method: 'POST',
        url: GOOGLE_OAUTH_TOKEN_ENDPOINT,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: bodyParams.toString(),
      });

      if (response.status < 200 || response.status >= 300) {
        throw new GoogleOAuthError(
          'REFRESH_TOKEN_FAILED',
          `OAuth token refresh failed with HTTP ${response.status}.`,
          response.status
        );
      }
      responseData = response.data;
    } else {
      try {
        const response = await fetch(GOOGLE_OAUTH_TOKEN_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: bodyParams.toString(),
        });

        if (!response.ok) {
          throw new GoogleOAuthError(
            'REFRESH_TOKEN_FAILED',
            `OAuth token refresh failed with HTTP ${response.status}.`,
            response.status
          );
        }
        responseData = await response.json();
      } catch (err: any) {
        if (err instanceof GoogleOAuthError) throw err;
        throw new GoogleOAuthError(
          'NETWORK_ERROR',
          `Network error reaching Google OAuth token endpoint: ${err.message}`,
          502
        );
      }
    }

    // Google refresh responses might not return a new refresh_token; preserve existing if omitted
    const normalized = this.validateAndNormalizeTokenResponse(responseData);
    if (!normalized.refresh_token) {
      normalized.refresh_token = refreshToken.trim();
    }
    return normalized;
  }

  /**
   * Validates and normalizes Google's token endpoint JSON payload.
   */
  public validateAndNormalizeTokenResponse(
    response: any
  ): GoogleOAuthTokens {
    if (!response || typeof response !== 'object') {
      throw new GoogleOAuthError(
        'INVALID_TOKEN_RESPONSE',
        'Token response was empty or malformed.',
        500
      );
    }

    if (!response.access_token || typeof response.access_token !== 'string') {
      throw new GoogleOAuthError(
        'INVALID_TOKEN_RESPONSE',
        'Token response missing valid access_token.',
        500
      );
    }

    const tokenType = response.token_type || 'Bearer';
    const expiresIn =
      typeof response.expires_in === 'number'
        ? response.expires_in
        : parseInt(response.expires_in, 10) || 3600;

    const obtainedAt = Date.now();
    const expiresAt = obtainedAt + expiresIn * 1000;

    return {
      access_token: response.access_token,
      token_type: tokenType,
      expires_in: expiresIn,
      obtained_at: obtainedAt,
      expires_at: expiresAt,
      refresh_token: response.refresh_token,
      scope: response.scope,
      id_token: response.id_token,
    };
  }
}

/**
 * Singleton factory instance
 */
export const googleDriveOAuthService = new GoogleDriveOAuthService();
