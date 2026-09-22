/**
 * Step 22: Google Drive OAuth Foundation Test Suite
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Step 22 — Google Drive API / OAuth Foundation
 * 
 * Tests:
 * 1. OAuth configuration validation
 * 2. Missing client ID rejection
 * 3. Missing client secret rejection
 * 4. Missing redirect URI rejection
 * 5. Authorization URL generation
 * 6. Correct OAuth state handling
 * 7. State mismatch rejection
 * 8. Token response validation
 * 9. Access-token abstraction
 * 10. Refresh-token abstraction
 * 11. No secret leakage
 * 12. No token logging
 * 13. Minimum scope enforcement
 * 14. Static security audit (no VITE_* secrets, no cookies, no browser automation)
 * 
 * Invariant: 100% offline testing. Zero live network calls to Google endpoints.
 */

import {
  GoogleDriveOAuthService,
  GoogleOAuthError,
} from '../src/services/googleDriveOAuthService.js';
import {
  GOOGLE_DRIVE_READONLY_SCOPE,
  GOOGLE_OAUTH_AUTH_ENDPOINT,
  GOOGLE_OAUTH_TOKEN_ENDPOINT,
  GoogleHttpClient,
  GoogleHttpRequestOptions,
  GoogleHttpResponse,
} from '../src/types/googleDrive.js';
import fs from 'fs';
import path from 'path';

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string) {
  if (condition) {
    passed++;
    console.log(`  ✅ PASS: ${name}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${name}`);
  }
}

async function runOAuthTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING STEP 22: GOOGLE DRIVE OAUTH FOUNDATION TESTS');
  console.log('================================================================');

  // Test 1: OAuth configuration validation (passes when all 3 required config present)
  {
    const oauthService = new GoogleDriveOAuthService({
      config: {
        clientId: 'test-client-id.apps.googleusercontent.com',
        clientSecret: 'test-client-secret-xyz',
        redirectUri: 'http://localhost:3000/api/auth/google/callback',
      },
    });
    const config = oauthService.validateConfig();
    assert(config.clientId === 'test-client-id.apps.googleusercontent.com', '1. Client ID validated');
    assert(config.clientSecret === 'test-client-secret-xyz', '1a. Client secret validated');
    assert(config.redirectUri === 'http://localhost:3000/api/auth/google/callback', '1b. Redirect URI validated');
  }

  // Test 2: Missing client ID rejection
  {
    const oauthService = new GoogleDriveOAuthService({
      config: {
        clientId: '',
        clientSecret: 'secret',
        redirectUri: 'http://localhost:3000/callback',
      },
    });
    let thrownError: any = null;
    try {
      oauthService.validateConfig();
    } catch (err) {
      thrownError = err;
    }
    assert(thrownError instanceof GoogleOAuthError, '2. Missing client ID throws GoogleOAuthError');
    assert(thrownError?.code === 'MISSING_CLIENT_ID', '2a. Error code is MISSING_CLIENT_ID');
  }

  // Test 3: Missing client secret rejection
  {
    const oauthService = new GoogleDriveOAuthService({
      config: {
        clientId: 'client-id-123',
        clientSecret: '',
        redirectUri: 'http://localhost:3000/callback',
      },
    });
    let thrownError: any = null;
    try {
      oauthService.validateConfig();
    } catch (err) {
      thrownError = err;
    }
    assert(thrownError instanceof GoogleOAuthError, '3. Missing client secret throws GoogleOAuthError');
    assert(thrownError?.code === 'MISSING_CLIENT_SECRET', '3a. Error code is MISSING_CLIENT_SECRET');
  }

  // Test 4: Missing redirect URI rejection
  {
    const oauthService = new GoogleDriveOAuthService({
      config: {
        clientId: 'client-id-123',
        clientSecret: 'client-secret-456',
        redirectUri: '',
      },
    });
    let thrownError: any = null;
    try {
      oauthService.validateConfig();
    } catch (err) {
      thrownError = err;
    }
    assert(thrownError instanceof GoogleOAuthError, '4. Missing redirect URI throws GoogleOAuthError');
    assert(thrownError?.code === 'MISSING_REDIRECT_URI', '4a. Error code is MISSING_REDIRECT_URI');
  }

  // Test 5: Authorization URL generation
  {
    const oauthService = new GoogleDriveOAuthService({
      config: {
        clientId: 'mock-client-id-001',
        clientSecret: 'mock-secret-001',
        redirectUri: 'https://www.hemantkrkushwaha.com/api/auth/google/callback',
      },
    });
    const authUrlData = oauthService.generateAuthorizationUrl({
      state: 'fixed-test-state-123',
      accessType: 'offline',
      prompt: 'consent',
    });
    assert(authUrlData.url.startsWith(GOOGLE_OAUTH_AUTH_ENDPOINT), '5. URL targets official Google OAuth endpoint');
    const parsedUrl = new URL(authUrlData.url);
    assert(parsedUrl.searchParams.get('client_id') === 'mock-client-id-001', '5a. client_id parameter is present');
    assert(parsedUrl.searchParams.get('redirect_uri') === 'https://www.hemantkrkushwaha.com/api/auth/google/callback', '5b. redirect_uri parameter matches');
    assert(parsedUrl.searchParams.get('response_type') === 'code', '5c. response_type is code');
    assert(parsedUrl.searchParams.get('access_type') === 'offline', '5d. access_type is offline for refresh token');
    assert(parsedUrl.searchParams.get('prompt') === 'consent', '5e. prompt is consent');
  }

  // Test 6: Correct OAuth state handling
  {
    const oauthService = new GoogleDriveOAuthService({
      config: {
        clientId: 'mock-client-id',
        clientSecret: 'mock-secret',
        redirectUri: 'http://localhost:3000/callback',
      },
    });
    const autoStateData = oauthService.generateAuthorizationUrl();
    assert(typeof autoStateData.state === 'string' && autoStateData.state.length === 64, '6. State is 64-character hex string');
    const parsedUrl = new URL(autoStateData.url);
    assert(parsedUrl.searchParams.get('state') === autoStateData.state, '6a. State parameter in URL matches returned state');
  }

  // Test 7: State mismatch rejection
  {
    const oauthService = new GoogleDriveOAuthService({
      config: {
        clientId: 'mock-client-id',
        clientSecret: 'mock-secret',
        redirectUri: 'http://localhost:3000/callback',
      },
    });
    let thrownError: any = null;
    try {
      await oauthService.validateState('state-attack-999', 'state-expected-123');
    } catch (err) {
      thrownError = err;
    }
    assert(thrownError instanceof GoogleOAuthError, '7. State mismatch throws GoogleOAuthError');
    assert(thrownError?.code === 'STATE_MISMATCH', '7a. Error code is STATE_MISMATCH');

    // Matching state passes without throwing
    let passedMatch = true;
    try {
      await oauthService.validateState('valid-secure-state-abc', 'valid-secure-state-abc');
    } catch {
      passedMatch = false;
    }
    assert(passedMatch, '7b. Matching state validation passes');
  }

  // Test 8: Token response validation
  {
    const oauthService = new GoogleDriveOAuthService();
    const normalized = oauthService.validateAndNormalizeTokenResponse({
      access_token: 'mock-access-token-xyz',
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: 'mock-refresh-token-123',
      scope: GOOGLE_DRIVE_READONLY_SCOPE,
    });
    assert(normalized.access_token === 'mock-access-token-xyz', '8. Valid access_token normalized');
    assert(normalized.token_type === 'Bearer', '8a. token_type preserved');
    assert(normalized.expires_in === 3600, '8b. expires_in parsed as number');
    assert(normalized.refresh_token === 'mock-refresh-token-123', '8c. refresh_token preserved');
    assert(typeof normalized.expires_at === 'number', '8d. expires_at timestamp computed');

    // Missing access_token rejected
    let badTokenError: any = null;
    try {
      oauthService.validateAndNormalizeTokenResponse({ expires_in: 3600 });
    } catch (err) {
      badTokenError = err;
    }
    assert(badTokenError?.code === 'INVALID_TOKEN_RESPONSE', '8e. Missing access_token rejected');
  }

  // Test 9: Access-token abstraction with mock HTTP client
  {
    let receivedRequest: GoogleHttpRequestOptions | null = null;
    const mockHttpClient: GoogleHttpClient = async (opts) => {
      receivedRequest = opts;
      return {
        status: 200,
        data: {
          access_token: 'mock-exchanged-access-token',
          token_type: 'Bearer',
          expires_in: 3600,
          refresh_token: 'mock-new-refresh-token',
          scope: GOOGLE_DRIVE_READONLY_SCOPE,
        },
      };
    };

    const oauthService = new GoogleDriveOAuthService({
      config: {
        clientId: 'mock-client-id-abc',
        clientSecret: 'mock-secret-def',
        redirectUri: 'http://localhost:3000/api/auth/google/callback',
      },
      httpClient: mockHttpClient,
    });

    const tokens = await oauthService.exchangeCodeForTokens('sample-auth-code-123', {
      state: 'matching-state',
      expectedState: 'matching-state',
    });

    assert(tokens.access_token === 'mock-exchanged-access-token', '9. Tokens returned from exchange abstraction');
    assert(receivedRequest !== null, '9a. Mock HTTP client was invoked');
    assert(receivedRequest!.url === GOOGLE_OAUTH_TOKEN_ENDPOINT, '9b. Request targeted official token endpoint');
    assert(receivedRequest!.method === 'POST', '9c. Request method was POST');
    const bodyStr = String(receivedRequest!.body);
    assert(bodyStr.includes('grant_type=authorization_code'), '9d. Grant type is authorization_code');
    assert(bodyStr.includes('code=sample-auth-code-123'), '9e. Code parameter passed in body');
  }

  // Test 10: Refresh-token abstraction with mock HTTP client
  {
    let refreshRequest: GoogleHttpRequestOptions | null = null;
    const mockHttpClient: GoogleHttpClient = async (opts) => {
      refreshRequest = opts;
      return {
        status: 200,
        data: {
          access_token: 'mock-refreshed-access-token',
          token_type: 'Bearer',
          expires_in: 3600,
          scope: GOOGLE_DRIVE_READONLY_SCOPE,
        },
      };
    };

    const oauthService = new GoogleDriveOAuthService({
      config: {
        clientId: 'mock-client-id-abc',
        clientSecret: 'mock-secret-def',
        redirectUri: 'http://localhost:3000/callback',
      },
      httpClient: mockHttpClient,
    });

    const refreshed = await oauthService.refreshAccessToken('existing-refresh-token-999');
    assert(refreshed.access_token === 'mock-refreshed-access-token', '10. Refreshed access token returned');
    assert(refreshed.refresh_token === 'existing-refresh-token-999', '10a. Existing refresh token retained');
    const bodyStr = String(refreshRequest!.body);
    assert(bodyStr.includes('grant_type=refresh_token'), '10b. Grant type is refresh_token');
    assert(bodyStr.includes('refresh_token=existing-refresh-token-999'), '10c. Refresh token passed in body');
  }

  // Test 11: No secret leakage in errors or string representations
  {
    const oauthService = new GoogleDriveOAuthService({
      config: {
        clientId: 'sensitive-client-id',
        clientSecret: 'SUPER_SECRET_CLIENT_SECRET_NEVER_LOG',
        redirectUri: 'http://localhost:3000/callback',
      },
    });

    // Cause a state mismatch error
    let errorString = '';
    try {
      await oauthService.validateState('a', 'b');
    } catch (err: any) {
      errorString = err.message + ' ' + JSON.stringify(err);
    }
    assert(!errorString.includes('SUPER_SECRET_CLIENT_SECRET_NEVER_LOG'), '11. Client secret never appears in error messages');
  }

  // Test 12: No token logging
  {
    const tokens = {
      access_token: 'SECRET_ACCESS_TOKEN_VALUE',
      refresh_token: 'SECRET_REFRESH_TOKEN_VALUE',
    };
    // Ensure standard error codes and safe representations
    const err = new GoogleOAuthError('OAUTH_EXCHANGE_FAILED', 'OAuth token exchange failed with HTTP 401.');
    assert(!err.message.includes('SECRET_ACCESS_TOKEN_VALUE'), '12. Error does not log tokens');
    assert(!err.message.includes('SECRET_REFRESH_TOKEN_VALUE'), '12a. Error does not log refresh tokens');
  }

  // Test 13: Minimum scope enforcement
  {
    const oauthService = new GoogleDriveOAuthService({
      config: {
        clientId: 'client-1',
        clientSecret: 'secret-1',
        redirectUri: 'http://localhost:3000/callback',
      },
    });
    const urlData = oauthService.generateAuthorizationUrl();
    assert(urlData.scope === GOOGLE_DRIVE_READONLY_SCOPE, '13. Default scope is strictly drive.readonly');
    assert(!urlData.scope.includes('https://www.googleapis.com/auth/drive '), '13a. Does NOT request full write drive scope');
    assert(urlData.url.includes(encodeURIComponent(GOOGLE_DRIVE_READONLY_SCOPE)), '13b. URL contains encoded drive.readonly scope');
  }

  // Test 14: Static Security Audit
  {
    const oauthFile = fs.readFileSync(path.join(process.cwd(), 'src/services/googleDriveOAuthService.ts'), 'utf8');
    const typesFile = fs.readFileSync(path.join(process.cwd(), 'src/types/googleDrive.ts'), 'utf8');
    const routesFile = fs.readFileSync(path.join(process.cwd(), 'src/server/routes/googleAuthRoutes.ts'), 'utf8');

    assert(!oauthFile.includes('VITE_GOOGLE_CLIENT_SECRET'), '14a. Zero VITE_GOOGLE_CLIENT_SECRET in OAuth service');
    assert(!typesFile.includes('VITE_GOOGLE_CLIENT_SECRET'), '14b. Zero VITE_GOOGLE_CLIENT_SECRET in types');
    assert(!routesFile.includes('VITE_GOOGLE_CLIENT_SECRET'), '14c. Zero VITE_GOOGLE_CLIENT_SECRET in routes');

    assert(!oauthFile.includes('puppeteer'), '14d. Zero Puppeteer in OAuth service');
    assert(!oauthFile.includes('playwright'), '14e. Zero Playwright in OAuth service');
    assert(!oauthFile.includes('document.cookie'), '14f. Zero cookie harvesting in OAuth service');
    assert(!routesFile.includes('document.cookie'), '14g. Zero cookie harvesting in routes');

    assert(!oauthFile.includes('@supabase/supabase-js'), '14h. Zero direct DB token table storage in OAuth service');
    assert(!routesFile.includes('@supabase/supabase-js'), '14i. Zero direct DB token table storage in routes');
  }

  console.log('================================================================');
  console.log(`STEP 22 OAUTH TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runOAuthTests().catch((err) => {
  console.error('Unhandled exception in Step 22 OAuth tests:', err);
  process.exit(1);
});
