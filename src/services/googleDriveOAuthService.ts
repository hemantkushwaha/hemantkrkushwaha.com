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
  GoogleOAuthConnectionRecord,
  GoogleConnectionSafeStatus,
  GOOGLE_OAUTH_AUTH_ENDPOINT,
  GOOGLE_OAUTH_TOKEN_ENDPOINT,
  GOOGLE_DRIVE_READONLY_SCOPE,
} from '../types/googleDrive.js';
import { getServerSupabaseClient } from '../server/lib/supabaseServer.js';

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
  | 'MISSING_ENCRYPTION_KEY'
  | 'ENCRYPTION_FAILED'
  | 'DECRYPTION_FAILED'
  | 'NOT_CONNECTED'
  | 'DATABASE_ERROR'
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
  encryptionKey?: string;
  supabaseClient?: any;
}

/**
 * Server-side Google Drive OAuth Service
 */
export class GoogleDriveOAuthService {
  private explicitConfig: Partial<GoogleOAuthConfig>;
  private httpClient?: GoogleHttpClient;
  private explicitEncryptionKey?: string;
  private customSupabaseClient?: any;
  private usedStateNonces = new Set<string>();
  private activeStates = new Map<string, { expiresAt: number; used: boolean }>();

  constructor(options: GoogleDriveOAuthServiceOptions = {}) {
    this.explicitConfig = options.config || {};
    this.httpClient = options.httpClient;
    this.explicitEncryptionKey = options.encryptionKey;
    this.customSupabaseClient = options.supabaseClient;
  }

  /**
   * Set or update pluggable HTTP client for testing or custom transports
   */
  public setHttpClient(client?: GoogleHttpClient): void {
    this.httpClient = client;
  }

  /**
   * Set or update custom Supabase client for testing
   */
  public setSupabaseClient(client: any): void {
    this.customSupabaseClient = client;
  }

  /**
   * Set or update encryption key for testing
   */
  public setEncryptionKey(key?: string): void {
    this.explicitEncryptionKey = key;
  }

  /**
   * Resolves OAuth configuration from explicit options or server environment variables.
   * NEVER reads VITE_* client-side variables.
   */
  public getConfig(): GoogleOAuthConfig {
    const clientId =
      this.explicitConfig.clientId !== undefined
        ? this.explicitConfig.clientId
        : process.env.GOOGLE_CLIENT_ID || '';
    const clientSecret =
      this.explicitConfig.clientSecret !== undefined
        ? this.explicitConfig.clientSecret
        : process.env.GOOGLE_CLIENT_SECRET || '';
    const redirectUri =
      this.explicitConfig.redirectUri !== undefined
        ? this.explicitConfig.redirectUri
        : process.env.GOOGLE_OAUTH_REDIRECT_URI || '';
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
   * Derives a secret key for signing state tokens in serverless mode.
   * Priority: GOOGLE_CLIENT_SECRET -> GOOGLE_TOKEN_ENCRYPTION_KEY -> SUPABASE_SECRET_KEY
   */
  public getStateSigningKey(): string | null {
    const config = this.getConfig();
    return (
      config.clientSecret ||
      this.explicitEncryptionKey ||
      process.env.GOOGLE_TOKEN_ENCRYPTION_KEY ||
      process.env.SUPABASE_SECRET_KEY ||
      null
    );
  }

  /**
   * Hashes a raw state token using SHA-256 for secure database persistence.
   * Guarantees raw state is NEVER stored in database tables or logs.
   */
  public hashState(state: string): string {
    return crypto.createHash('sha256').update(state).digest('hex');
  }

  /**
   * Generates a cryptographically secure random state token for CSRF protection.
   * Produces a 64-character hex string (32 cryptographically random bytes).
   * Stores the SHA-256 hash in google_oauth_states if database is available.
   * Contains ZERO sensitive information.
   */
  public async generateStateAsync(): Promise<string> {
    const nonce = crypto.randomBytes(32).toString('hex');
    const stateHash = this.hashState(nonce);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // In-memory cache as secondary fallback
    this.activeStates.set(nonce, {
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
      used: false,
    });

    // Opportunistic cleanup of expired states and persistence of fresh state hash
    const supabase = this.getSupabase();
    if (supabase) {
      try {
        // Asynchronously clean expired records
        supabase
          .from('google_oauth_states')
          .delete()
          .lt('expires_at', new Date().toISOString())
          .then(() => {})
          .catch(() => {});

        // Persist SHA-256 hash of new state
        await supabase.from('google_oauth_states').insert([
          {
            state_hash: stateHash,
            expires_at: expiresAt,
          },
        ]);
      } catch {
        // If table is not yet migrated, in-memory state remains intact
      }
    }

    return nonce;
  }

  /**
   * Synchronous state generation (for offline tests / in-memory compatibility).
   */
  public generateState(): string {
    const nonce = crypto.randomBytes(32).toString('hex');
    this.activeStates.set(nonce, {
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
      used: false,
    });
    return nonce;
  }

  /**
   * Validates received state against expected state or stored state metadata.
   * Employs constant-time buffer comparison to prevent timing side-channel attacks.
   * Enforces expiration (10 minutes) and single-use replay prevention.
   */
  public async validateState(receivedState: string, expectedState?: string): Promise<void> {
    if (!receivedState || typeof receivedState !== 'string') {
      throw new GoogleOAuthError(
        'INVALID_STATE',
        'Invalid or missing OAuth state parameter.',
        400
      );
    }

    // Direct comparison if expectedState was explicitly provided
    if (expectedState !== undefined) {
      if (!expectedState || typeof expectedState !== 'string') {
        throw new GoogleOAuthError(
          'INVALID_STATE',
          'Invalid expected state parameter.',
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
      return;
    }

    // 1. Check Durable Database (google_oauth_states) if available
    const supabase = this.getSupabase();
    if (supabase) {
      const stateHash = this.hashState(receivedState);
      const nowIso = new Date().toISOString();

      try {
        // Atomic compare-and-consume: update consumed_at WHERE state_hash matches AND consumed_at IS NULL AND expires_at > now
        const { data, error } = await supabase
          .from('google_oauth_states')
          .update({ consumed_at: nowIso })
          .eq('state_hash', stateHash)
          .is('consumed_at', null)
          .gt('expires_at', nowIso)
          .select('id, state_hash, expires_at, consumed_at');

        if (!error && data && data.length > 0) {
          // Successfully and atomically consumed the state record!
          this.usedStateNonces.add(receivedState);
          return;
        }

        // If update returned 0 rows, check whether record exists, is consumed, or is expired
        const { data: existingRows } = await supabase
          .from('google_oauth_states')
          .select('id, expires_at, consumed_at')
          .eq('state_hash', stateHash)
          .limit(1);

        if (existingRows && existingRows.length > 0) {
          const rec = existingRows[0];
          if (rec.consumed_at) {
            throw new GoogleOAuthError(
              'INVALID_STATE',
              'OAuth state has already been used. Replay attempt rejected.',
              400
            );
          }
          if (new Date(rec.expires_at).getTime() < Date.now()) {
            throw new GoogleOAuthError(
              'EXPIRED_STATE',
              'OAuth state has expired. Please initiate authorization again.',
              400
            );
          }
        }
      } catch (dbErr: any) {
        if (dbErr instanceof GoogleOAuthError) {
          throw dbErr;
        }
        // Fall through to in-memory check if table does not exist yet
      }
    }

    // 2. Check in-memory / registered active states
    if (this.activeStates.has(receivedState)) {
      const entry = this.activeStates.get(receivedState)!;
      if (entry.used) {
        throw new GoogleOAuthError(
          'INVALID_STATE',
          'OAuth state has already been used. Replay attempt rejected.',
          400
        );
      }
      if (Date.now() > entry.expiresAt) {
        throw new GoogleOAuthError(
          'EXPIRED_STATE',
          'OAuth state has expired. Please initiate authorization again.',
          400
        );
      }
      entry.used = true;
      return;
    }

    // 3. Check if receivedState is signed serverless state format: nonce.timestamp.signature
    const parts = receivedState.split('.');
    if (parts.length === 3) {
      const [nonce, timestampStr, signature] = parts;
      if (!nonce || !timestampStr || !signature || nonce.length !== 64) {
        throw new GoogleOAuthError(
          'INVALID_STATE',
          'Invalid components in OAuth state.',
          400
        );
      }

      const timestamp = parseInt(timestampStr, 10);
      if (isNaN(timestamp)) {
        throw new GoogleOAuthError(
          'INVALID_STATE',
          'Invalid timestamp in OAuth state.',
          400
        );
      }

      const maxAgeMs = 10 * 60 * 1000;
      const now = Date.now();
      if (now - timestamp > maxAgeMs || timestamp > now + 60 * 1000) {
        throw new GoogleOAuthError(
          'EXPIRED_STATE',
          'OAuth state has expired. Please initiate authorization again.',
          400
        );
      }

      const signingKey = this.getStateSigningKey();
      if (!signingKey) {
        throw new GoogleOAuthError(
          'INVALID_STATE',
          'Server lacks signing key to verify state.',
          500
        );
      }

      const expectedSignature = crypto
        .createHmac('sha256', signingKey)
        .update(`${nonce}.${timestampStr}`)
        .digest('hex');

      const sigBuffer = Buffer.from(signature);
      const expBuffer = Buffer.from(expectedSignature);

      if (
        sigBuffer.length !== expBuffer.length ||
        !crypto.timingSafeEqual(sigBuffer, expBuffer)
      ) {
        throw new GoogleOAuthError(
          'STATE_MISMATCH',
          'OAuth state signature verification failed. Request aborted for CSRF protection.',
          400
        );
      }

      if (this.usedStateNonces.has(nonce)) {
        throw new GoogleOAuthError(
          'INVALID_STATE',
          'OAuth state has already been used. Replay attempt rejected.',
          400
        );
      }
      this.usedStateNonces.add(nonce);
      return;
    }

    // If 64 hex characters but not in activeStates or database
    if (/^[0-9a-fA-F]{64}$/.test(receivedState)) {
      if (this.usedStateNonces.has(receivedState)) {
        throw new GoogleOAuthError(
          'INVALID_STATE',
          'OAuth state has already been used. Replay attempt rejected.',
          400
        );
      }
      // Unknown raw 64-char state not recognized by DB or activeStates
      throw new GoogleOAuthError(
        'INVALID_STATE',
        'Unrecognized or expired OAuth state parameter.',
        400
      );
    }

    throw new GoogleOAuthError(
      'INVALID_STATE',
      'Unrecognized or expired OAuth state parameter.',
      400
    );
  }

  /**
   * Generates the official Google OAuth 2.0 authorization URL asynchronously.
   * Stores the SHA-256 hash of the generated state in google_oauth_states for durable CSRF protection.
   */
  public async generateAuthorizationUrlAsync(options: GoogleOAuthUrlOptions = {}): Promise<{
    url: string;
    state: string;
    scope: string;
  }> {
    const config = this.validateConfig();
    const state = options.state || (await this.generateStateAsync());

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
      await this.validateState(options.state, options.expectedState);
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

  /**
   * Resolves the 32-byte AES-256-GCM encryption key.
   * Reads from explicit key or GOOGLE_TOKEN_ENCRYPTION_KEY environment variable.
   */
  public getEncryptionKey(customKey?: string): Buffer {
    const rawKey =
      customKey ||
      this.explicitEncryptionKey ||
      process.env.GOOGLE_TOKEN_ENCRYPTION_KEY;

    if (!rawKey || typeof rawKey !== 'string' || !rawKey.trim()) {
      throw new GoogleOAuthError(
        'MISSING_ENCRYPTION_KEY',
        'Google token encryption key is missing. Set GOOGLE_TOKEN_ENCRYPTION_KEY in server environment variables.',
        500
      );
    }

    const trimmed = rawKey.trim();
    // 64-char hex string (32 bytes)
    if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
      return Buffer.from(trimmed, 'hex');
    }
    // Exactly 32 bytes UTF-8
    if (Buffer.byteLength(trimmed, 'utf8') === 32) {
      return Buffer.from(trimmed, 'utf8');
    }
    // Base64 32 bytes (44 chars)
    if (/^[A-Za-z0-9+/=]{44}$/.test(trimmed)) {
      const buf = Buffer.from(trimmed, 'base64');
      if (buf.length === 32) return buf;
    }
    // Deterministic SHA-256 derivation to yield exactly 32 bytes
    return crypto.createHash('sha256').update(trimmed).digest();
  }

  /**
   * Encrypts sensitive token material using authenticated AES-256-GCM.
   * Format: ivHex:authTagHex:ciphertextHex
   */
  public encryptToken(token: string, customKey?: string): string {
    if (!token || typeof token !== 'string') {
      throw new GoogleOAuthError(
        'ENCRYPTION_FAILED',
        'Token to encrypt must be a non-empty string.',
        400
      );
    }

    try {
      const key = this.getEncryptionKey(customKey);
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
      const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
      const authTag = cipher.getAuthTag();

      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
    } catch (err: any) {
      if (err instanceof GoogleOAuthError) throw err;
      throw new GoogleOAuthError(
        'ENCRYPTION_FAILED',
        `Token encryption failed: ${err.message}`,
        500
      );
    }
  }

  /**
   * Decrypts an AES-256-GCM encrypted token payload.
   * Verifies authentication tag for cryptographic integrity.
   */
  public decryptToken(payload: string, customKey?: string): string {
    if (!payload || typeof payload !== 'string') {
      throw new GoogleOAuthError(
        'DECRYPTION_FAILED',
        'Malformed ciphertext payload.',
        400
      );
    }

    const parts = payload.split(':');
    if (parts.length !== 3) {
      throw new GoogleOAuthError(
        'DECRYPTION_FAILED',
        'Invalid encrypted token format. Expected iv:tag:data.',
        400
      );
    }

    const [ivHex, tagHex, dataHex] = parts;
    try {
      const key = this.getEncryptionKey(customKey);
      const iv = Buffer.from(ivHex, 'hex');
      const tag = Buffer.from(tagHex, 'hex');
      const data = Buffer.from(dataHex, 'hex');

      if (iv.length !== 12 || tag.length !== 16) {
        throw new Error('Invalid IV or auth tag length.');
      }

      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(tag);
      return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
    } catch (err: any) {
      if (err instanceof GoogleOAuthError) throw err;
      throw new GoogleOAuthError(
        'DECRYPTION_FAILED',
        'Token decryption failed: authentication tag mismatch or corrupted ciphertext.',
        500
      );
    }
  }

  /**
   * Returns administrative server-side Supabase client.
   */
  public getSupabase(): any {
    return this.customSupabaseClient !== undefined
      ? this.customSupabaseClient
      : getServerSupabaseClient();
  }

  /**
   * Exchanges an authorization code for tokens, encrypts credentials with AES-256-GCM,
   * and stores the connection in the dedicated google_oauth_connections table.
   */
  public async exchangeAndStoreConnection(
    code: string,
    options: {
      state?: string;
      expectedState?: string;
      redirectUri?: string;
    } = {}
  ): Promise<GoogleOAuthConnectionRecord> {
    if (options.state) {
      await this.validateState(options.state, options.expectedState);
    }

    const tokens = await this.exchangeCodeForTokens(code, {
      redirectUri: options.redirectUri,
    });

    if (!tokens.refresh_token) {
      // Check if existing connection already has a refresh token we can preserve
      const existing = await this.getStoredConnection().catch(() => null);
      if (existing?.refresh_token_encrypted) {
        tokens.refresh_token = this.decryptToken(existing.refresh_token_encrypted);
      }
    }

    if (!tokens.refresh_token) {
      throw new GoogleOAuthError(
        'MISSING_REFRESH_TOKEN',
        'Google OAuth did not return a refresh token. Re-prompt with prompt=consent required for offline access.',
        400
      );
    }

    // Extract account email and provider_account_id from id_token if present
    let email: string | undefined;
    let providerAccountId: string | undefined;
    if (tokens.id_token) {
      try {
        const parts = tokens.id_token.split('.');
        if (parts.length >= 2) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
          email = payload.email;
          providerAccountId = payload.sub;
        }
      } catch {
        // ID token decoding error ignored; email remains optional
      }
    }

    const encryptedAccessToken = this.encryptToken(tokens.access_token);
    const encryptedRefreshToken = this.encryptToken(tokens.refresh_token);

    const record: GoogleOAuthConnectionRecord = {
      provider: 'google',
      provider_account_id: providerAccountId,
      email,
      access_token_encrypted: encryptedAccessToken,
      refresh_token_encrypted: encryptedRefreshToken,
      token_type: tokens.token_type || 'Bearer',
      scope: tokens.scope || GOOGLE_DRIVE_READONLY_SCOPE,
      expires_at: new Date(tokens.expires_at).toISOString(),
      updated_at: new Date().toISOString(),
    };

    const supabase = this.getSupabase();
    if (!supabase) {
      throw new GoogleOAuthError(
        'DATABASE_ERROR',
        'Database client is unavailable. Cannot persist Google OAuth connection.',
        503
      );
    }

    const { data: existingRecords, error: selectError } = await supabase
      .from('google_oauth_connections')
      .select('id')
      .eq('provider', 'google')
      .limit(1);

    if (selectError) {
      throw new GoogleOAuthError(
        'DATABASE_ERROR',
        `Failed to query Google OAuth connections: ${selectError.message}`,
        500
      );
    }

    if (existingRecords && existingRecords.length > 0) {
      const existingId = existingRecords[0].id;
      const { data: updatedRows, error } = await supabase
        .from('google_oauth_connections')
        .update(record)
        .eq('id', existingId)
        .select('id');

      if (error) {
        throw new GoogleOAuthError(
          'DATABASE_ERROR',
          `Failed to update Google OAuth connection record: ${error.message}`,
          500
        );
      }

      if (!updatedRows || updatedRows.length === 0 || !updatedRows[0]?.id) {
        throw new GoogleOAuthError(
          'DATABASE_ERROR',
          'Failed to confirm Google OAuth connection update: returned record or id missing.',
          500
        );
      }

      record.id = updatedRows[0].id;
    } else {
      const { data: inserted, error } = await supabase
        .from('google_oauth_connections')
        .insert([record])
        .select('id')
        .single();

      if (error) {
        throw new GoogleOAuthError(
          'DATABASE_ERROR',
          `Failed to store Google OAuth connection: ${error.message}`,
          500
        );
      }

      if (!inserted || !inserted.id) {
        throw new GoogleOAuthError(
          'DATABASE_ERROR',
          'Failed to confirm Google OAuth connection persistence: returned record or id missing.',
          500
        );
      }

      record.id = inserted.id;
    }

    // Post-persistence verification: verify the stored record exists in database
    const verifyRecord = await this.getStoredConnection();
    if (!verifyRecord || !verifyRecord.id || verifyRecord.id !== record.id) {
      throw new GoogleOAuthError(
        'DATABASE_ERROR',
        'Post-persistence verification failed: stored connection could not be retrieved from database.',
        500
      );
    }

    return record;
  }

  /**
   * Retrieves the active stored Google OAuth connection record from database.
   */
  public async getStoredConnection(): Promise<GoogleOAuthConnectionRecord | null> {
    const supabase = this.getSupabase();
    if (!supabase) {
      throw new GoogleOAuthError(
        'DATABASE_ERROR',
        'Database client is unavailable. Cannot query Google OAuth connection status.',
        503
      );
    }

    try {
      const { data, error } = await supabase
        .from('google_oauth_connections')
        .select('*')
        .eq('provider', 'google')
        .order('updated_at', { ascending: false })
        .limit(1);

      if (error) {
        throw new GoogleOAuthError(
          'DATABASE_ERROR',
          `Database error querying Google OAuth connection: ${error.message}`,
          500
        );
      }

      if (!data || data.length === 0) {
        return null;
      }

      return data[0] as GoogleOAuthConnectionRecord;
    } catch (err: any) {
      if (err instanceof GoogleOAuthError) throw err;
      throw new GoogleOAuthError(
        'DATABASE_ERROR',
        `Database query failed: ${err.message || String(err)}`,
        500
      );
    }
  }

  /**
   * Returns safe connection status metadata.
   * GUARANTEE: Never leaks access_token, refresh_token, client_secret, or encryption key.
   */
  public async getSafeConnectionStatus(): Promise<GoogleConnectionSafeStatus> {
    const connection = await this.getStoredConnection();
    if (!connection) {
      return {
        connected: false,
        provider: 'google',
        message: 'No Google account connected. Start authorization at /api/auth/google/url.',
      };
    }

    return {
      connected: true,
      provider: 'google',
      email: connection.email,
      scope: connection.scope,
      expires_at: connection.expires_at,
      connected_at: connection.updated_at || connection.created_at,
    };
  }

  /**
   * Refreshes the stored access token and updates the encrypted record in database.
   */
  public async refreshStoredConnection(): Promise<GoogleOAuthConnectionRecord> {
    const connection = await this.getStoredConnection();
    if (!connection) {
      throw new GoogleOAuthError(
        'NOT_CONNECTED',
        'No Google OAuth connection found in database to refresh.',
        404
      );
    }

    const refreshToken = this.decryptToken(connection.refresh_token_encrypted);
    const refreshedTokens = await this.refreshAccessToken(refreshToken);

    const newEncryptedAccessToken = this.encryptToken(refreshedTokens.access_token);
    const newEncryptedRefreshToken = refreshedTokens.refresh_token
      ? this.encryptToken(refreshedTokens.refresh_token)
      : connection.refresh_token_encrypted;

    const updatedRecord: Partial<GoogleOAuthConnectionRecord> = {
      access_token_encrypted: newEncryptedAccessToken,
      refresh_token_encrypted: newEncryptedRefreshToken,
      expires_at: new Date(refreshedTokens.expires_at).toISOString(),
      updated_at: new Date().toISOString(),
    };

    const supabase = this.getSupabase();
    if (supabase && connection.id) {
      const { error } = await supabase
        .from('google_oauth_connections')
        .update(updatedRecord)
        .eq('id', connection.id);

      if (error) {
        throw new GoogleOAuthError(
          'DATABASE_ERROR',
          `Failed to update refreshed tokens in database: ${error.message}`,
          500
        );
      }
    }

    return {
      ...connection,
      ...updatedRecord,
    };
  }

  /**
   * Retrieves a valid, decrypted access token for the active Google OAuth connection.
   * If the stored token is expired or within a 60-second expiration buffer,
   * it automatically uses the refresh token to obtain and persist fresh credentials.
   * GUARANTEE: Never logs or exposes tokens.
   */
  public async getValidAccessToken(forceRefresh = false): Promise<string> {
    const connection = await this.getStoredConnection();
    if (!connection) {
      throw new GoogleOAuthError(
        'NOT_CONNECTED',
        'No Google OAuth connection found in database. Please authenticate via /api/auth/google/url.',
        404
      );
    }

    const now = Date.now();
    const expiresAt = new Date(connection.expires_at).getTime();
    const isExpiredOrExpiringSoon = forceRefresh || isNaN(expiresAt) || expiresAt - now < 60 * 1000;

    let activeRecord = connection;
    if (isExpiredOrExpiringSoon) {
      activeRecord = await this.refreshStoredConnection();
    }

    return this.decryptToken(activeRecord.access_token_encrypted);
  }

  /**
   * Disconnects the Google account by revoking credentials and removing the record.
   */
  public async disconnectGoogleAccount(): Promise<{ success: boolean; message: string }> {
    const connection = await this.getStoredConnection();
    if (!connection) {
      return {
        success: true,
        message: 'No Google account was connected.',
      };
    }

    // Attempt token revocation with Google's official revocation endpoint
    try {
      const refreshToken = this.decryptToken(connection.refresh_token_encrypted);
      const revokeUrl = `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(refreshToken)}`;
      if (this.httpClient) {
        await this.httpClient({
          method: 'POST',
          url: revokeUrl,
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
      } else {
        await fetch(revokeUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }).catch(() => null);
      }
    } catch {
      // Swallowed: even if Google revocation fails (e.g. token expired), database deletion proceeds
    }

    const supabase = this.getSupabase();
    if (supabase && connection.id) {
      const { error } = await supabase
        .from('google_oauth_connections')
        .delete()
        .eq('id', connection.id);

      if (error) {
        throw new GoogleOAuthError(
          'DATABASE_ERROR',
          `Failed to delete Google connection from database: ${error.message}`,
          500
        );
      }
    }

    return {
      success: true,
      message: 'Google account disconnected successfully.',
    };
  }
}

/**
 * Singleton factory instance
 */
export const googleDriveOAuthService = new GoogleDriveOAuthService();
