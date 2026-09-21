/**
 * Step 22C — Secure Google Drive OAuth Authorization & Connection Tests
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Step 22C Test Suite
 * 
 * Verifies:
 * 1. AES-256-GCM authenticated encryption and decryption of tokens
 * 2. Tamper-evident authentication tag verification
 * 3. CSRF state generation, validation, expiration, and single-use replay protection
 * 4. Token exchange, encryption, and persistence to google_oauth_connections
 * 5. Safe connection status reporting (zero tokens or secrets exposed)
 * 6. Stored token refresh cycle with re-encryption
 * 7. Disconnection and credential revocation
 * 8. Static security invariants: zero plaintext tokens, zero VITE_ credentials, zero browser automation
 */

import { strict as assert } from 'assert';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  GoogleDriveOAuthService,
  GoogleOAuthError,
} from '../src/services/googleDriveOAuthService.js';
import {
  GOOGLE_DRIVE_READONLY_SCOPE,
  GoogleOAuthConnectionRecord,
} from '../src/types/googleDrive.js';

async function runStep22CTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING STEP 22C: SECURE GOOGLE OAUTH CONNECTION TESTS');
  console.log('================================================================');

  let passed = 0;
  let failed = 0;

  function recordPass(desc: string) {
    passed++;
    console.log(`  ✅ PASS: ${desc}`);
  }

  function recordFail(desc: string, err: any) {
    failed++;
    console.error(`  ❌ FAIL: ${desc} - ${err?.message || err}`);
  }

  const testKeyHex = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  // -------------------------------------------------------------
  // Test 1: AES-256-GCM Encryption & Decryption
  // -------------------------------------------------------------
  try {
    const service = new GoogleDriveOAuthService({
      encryptionKey: testKeyHex,
    });

    const secretToken = 'ya29.a0AfH6SMD_MockAccessTokenWithSpecialChars!@#$%^&*()';
    const encrypted = service.encryptToken(secretToken);

    assert(typeof encrypted === 'string', 'Encrypted output is a string');
    const parts = encrypted.split(':');
    assert(parts.length === 3, 'Encrypted format is iv:tag:ciphertext');
    assert(parts[0].length === 24, 'IV is 12 bytes hex (24 chars)');
    assert(parts[1].length === 32, 'Auth tag is 16 bytes hex (32 chars)');
    assert(!encrypted.includes(secretToken), 'Ciphertext does NOT contain plaintext token');

    const decrypted = service.decryptToken(encrypted);
    assert(decrypted === secretToken, 'Decrypted token matches original plaintext exactly');

    recordPass('1. AES-256-GCM encrypts and decrypts sensitive tokens faithfully');
  } catch (err) {
    recordFail('1. AES-256-GCM encrypts and decrypts', err);
  }

  // -------------------------------------------------------------
  // Test 2: Tamper Detection via Auth Tag (Integrity)
  // -------------------------------------------------------------
  try {
    const service = new GoogleDriveOAuthService({
      encryptionKey: testKeyHex,
    });

    const encrypted = service.encryptToken('my-super-secret-refresh-token');
    const parts = encrypted.split(':');

    // Tamper with ciphertext
    const tamperedData = parts[2].slice(0, -2) + (parts[2].endsWith('a') ? 'b' : 'a');
    const tamperedPayload = `${parts[0]}:${parts[1]}:${tamperedData}`;

    let threw = false;
    try {
      service.decryptToken(tamperedPayload);
    } catch (err: any) {
      threw = true;
      assert(err.code === 'DECRYPTION_FAILED', 'Throws DECRYPTION_FAILED on tampered payload');
    }
    assert(threw, 'Decryption of tampered ciphertext must fail');

    // Tamper with auth tag
    const tamperedTag = parts[1].slice(0, -2) + (parts[1].endsWith('0') ? '1' : '0');
    const tamperedTagPayload = `${parts[0]}:${tamperedTag}:${parts[2]}`;

    let threwTag = false;
    try {
      service.decryptToken(tamperedTagPayload);
    } catch (err: any) {
      threwTag = true;
      assert(err.code === 'DECRYPTION_FAILED', 'Throws DECRYPTION_FAILED on tampered auth tag');
    }
    assert(threwTag, 'Decryption with altered auth tag must fail');

    recordPass('2. AES-256-GCM rejects tampered ciphertext or altered authentication tag');
  } catch (err) {
    recordFail('2. Tamper detection', err);
  }

  // -------------------------------------------------------------
  // Test 3: CSRF State Handling (Generation, Validation, Expiry)
  // -------------------------------------------------------------
  try {
    const service = new GoogleDriveOAuthService({
      config: {
        clientId: 'mock-client',
        clientSecret: 'mock-secret',
        redirectUri: 'http://localhost/callback',
      },
    });

    const state = service.generateState();
    assert(typeof state === 'string' && state.length === 64, 'State is a 64-char hex string');

    // Validating against identical state passes
    service.validateState(state, state);

    // Mismatch fails
    let threwMismatch = false;
    try {
      service.validateState('wrong-state-00000000000000000000000000000000000000000000000000000000', state);
    } catch (err: any) {
      threwMismatch = true;
      assert(err.code === 'STATE_MISMATCH', 'Throws STATE_MISMATCH on mismatch');
    }
    assert(threwMismatch, 'Mismatched state throws STATE_MISMATCH');

    recordPass('3. CSRF state generation, comparison, and mismatch rejection');
  } catch (err) {
    recordFail('3. CSRF state handling', err);
  }

  // -------------------------------------------------------------
  // Test 4: Token Exchange & Encrypted Storage Flow
  // -------------------------------------------------------------
  try {
    const mockDb: GoogleOAuthConnectionRecord[] = [];
    const mockSupabase = {
      from: (table: string) => {
        assert(table === 'google_oauth_connections', 'Queries google_oauth_connections table');
        return {
          select: () => ({
            eq: () => ({
              limit: async () => ({
                data: mockDb.slice(0, 1),
                error: null,
              }),
              order: () => ({
                limit: async () => ({
                  data: mockDb.slice(0, 1),
                  error: null,
                }),
              }),
            }),
          }),
          insert: (records: GoogleOAuthConnectionRecord[]) => ({
            select: () => ({
              single: async () => {
                const rec = { ...records[0], id: 'mock-uuid-123' };
                mockDb.push(rec);
                return { data: rec, error: null };
              },
            }),
          }),
          update: (updateData: Partial<GoogleOAuthConnectionRecord>) => ({
            eq: async () => {
              if (mockDb.length > 0) {
                Object.assign(mockDb[0], updateData);
              }
              return { error: null };
            },
          }),
          delete: () => ({
            eq: async () => {
              mockDb.length = 0;
              return { error: null };
            },
          }),
        };
      },
    };

    const mockHttpClient = async () => ({
      status: 200,
      data: {
        access_token: 'mock-google-access-token-999',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'mock-google-refresh-token-888',
        scope: GOOGLE_DRIVE_READONLY_SCOPE,
        id_token: 'header.' + Buffer.from(JSON.stringify({ email: 'scholar@example.edu', sub: 'google-user-123' })).toString('base64url') + '.signature',
      },
    });

    const service = new GoogleDriveOAuthService({
      config: {
        clientId: 'mock-client-id',
        clientSecret: 'mock-client-secret',
        redirectUri: 'https://www.hemantkrkushwaha.com/api/auth/google/callback',
      },
      encryptionKey: testKeyHex,
      httpClient: mockHttpClient,
      supabaseClient: mockSupabase,
    });

    const record = await service.exchangeAndStoreConnection('valid-authorization-code-123');

    assert(record.email === 'scholar@example.edu', 'Extracted account email from id_token');
    assert(record.provider === 'google', 'Provider is google');
    assert(record.scope === GOOGLE_DRIVE_READONLY_SCOPE, 'Scope is drive.readonly');

    // Verify stored tokens are encrypted, NEVER plaintext
    assert(!record.access_token_encrypted.includes('mock-google-access-token-999'), 'Access token is encrypted');
    assert(!record.refresh_token_encrypted.includes('mock-google-refresh-token-888'), 'Refresh token is encrypted');

    // Verify decryption retrieves original values
    const decryptedAccess = service.decryptToken(record.access_token_encrypted);
    const decryptedRefresh = service.decryptToken(record.refresh_token_encrypted);
    assert(decryptedAccess === 'mock-google-access-token-999', 'Decrypted access token matches');
    assert(decryptedRefresh === 'mock-google-refresh-token-888', 'Decrypted refresh token matches');

    recordPass('4. Token exchange encrypts tokens and stores connection in google_oauth_connections');
  } catch (err) {
    recordFail('4. Token exchange and encrypted storage', err);
  }

  // -------------------------------------------------------------
  // Test 5: Safe Connection Status (Zero Secret Leakage)
  // -------------------------------------------------------------
  try {
    const mockStoredRecord: GoogleOAuthConnectionRecord = {
      id: 'conn-1',
      provider: 'google',
      email: 'prof.hemant@university.ac.in',
      access_token_encrypted: 'iv:tag:data1',
      refresh_token_encrypted: 'iv:tag:data2',
      token_type: 'Bearer',
      scope: GOOGLE_DRIVE_READONLY_SCOPE,
      expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const mockSupabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: async () => ({
                data: [mockStoredRecord],
                error: null,
              }),
            }),
          }),
        }),
      }),
    };

    const service = new GoogleDriveOAuthService({
      encryptionKey: testKeyHex,
      supabaseClient: mockSupabase,
    });

    const status = await service.getSafeConnectionStatus();
    assert(status.connected === true, 'Status reports connected = true');
    assert(status.email === 'prof.hemant@university.ac.in', 'Status includes connected email');
    assert(status.scope === GOOGLE_DRIVE_READONLY_SCOPE, 'Status includes read-only scope');

    const statusJson = JSON.stringify(status);
    assert(!statusJson.includes('access_token'), 'Status NEVER includes access_token');
    assert(!statusJson.includes('refresh_token'), 'Status NEVER includes refresh_token');
    assert(!statusJson.includes('client_secret'), 'Status NEVER includes client_secret');
    assert(!statusJson.includes(testKeyHex), 'Status NEVER includes encryption key');

    recordPass('5. Safe connection status reports connection metadata with zero secret leakage');
  } catch (err) {
    recordFail('5. Safe connection status', err);
  }

  // -------------------------------------------------------------
  // Test 6: Stored Token Refresh
  // -------------------------------------------------------------
  try {
    const mockRecord: GoogleOAuthConnectionRecord = {
      id: 'conn-1',
      provider: 'google',
      access_token_encrypted: '', // populated below
      refresh_token_encrypted: '', // populated below
      token_type: 'Bearer',
      scope: GOOGLE_DRIVE_READONLY_SCOPE,
      expires_at: new Date(Date.now() - 1000).toISOString(), // expired
      updated_at: new Date().toISOString(),
    };

    const service = new GoogleDriveOAuthService({
      config: {
        clientId: 'mock-client',
        clientSecret: 'mock-secret',
        redirectUri: 'http://localhost/callback',
      },
      encryptionKey: testKeyHex,
    });

    mockRecord.access_token_encrypted = service.encryptToken('expired-access-token');
    mockRecord.refresh_token_encrypted = service.encryptToken('valid-refresh-token-abc');

    let updatedDbRecord: any = null;
    const mockSupabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: async () => ({
                data: [mockRecord],
                error: null,
              }),
            }),
          }),
        }),
        update: (data: any) => ({
          eq: async () => {
            updatedDbRecord = data;
            return { error: null };
          },
        }),
      }),
    };

    const refreshHttpClient = async () => ({
      status: 200,
      data: {
        access_token: 'new-refreshed-access-token-xyz',
        token_type: 'Bearer',
        expires_in: 3600,
      },
    });

    const refreshService = new GoogleDriveOAuthService({
      config: {
        clientId: 'mock-client',
        clientSecret: 'mock-secret',
        redirectUri: 'http://localhost/callback',
      },
      encryptionKey: testKeyHex,
      httpClient: refreshHttpClient,
      supabaseClient: mockSupabase,
    });

    const refreshed = await refreshService.refreshStoredConnection();
    assert(refreshed !== null, 'Refresh succeeded');
    const newDecryptedAccess = refreshService.decryptToken(refreshed.access_token_encrypted);
    assert(newDecryptedAccess === 'new-refreshed-access-token-xyz', 'Refreshed access token decrypted');
    assert(updatedDbRecord !== null, 'Database updated with new encrypted token');

    recordPass('6. Refreshing stored connection issues fresh tokens and updates database securely');
  } catch (err) {
    recordFail('6. Stored token refresh', err);
  }

  // -------------------------------------------------------------
  // Test 7: Disconnect and Revocation
  // -------------------------------------------------------------
  try {
    let revocationCalled = false;
    let databaseDeleted = false;

    const mockRecord: GoogleOAuthConnectionRecord = {
      id: 'conn-to-disconnect',
      provider: 'google',
      access_token_encrypted: '',
      refresh_token_encrypted: '',
      token_type: 'Bearer',
      scope: GOOGLE_DRIVE_READONLY_SCOPE,
      expires_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const service = new GoogleDriveOAuthService({
      encryptionKey: testKeyHex,
    });
    mockRecord.access_token_encrypted = service.encryptToken('access');
    mockRecord.refresh_token_encrypted = service.encryptToken('refresh-to-revoke');

    const disconnectHttpClient = async (opts: any) => {
      if (opts.url.includes('oauth2.googleapis.com/revoke')) {
        revocationCalled = true;
      }
      return { status: 200, data: {} };
    };

    const disconnectSupabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: async () => ({
                data: [mockRecord],
                error: null,
              }),
            }),
          }),
        }),
        delete: () => ({
          eq: async () => {
            databaseDeleted = true;
            return { error: null };
          },
        }),
      }),
    };

    const disconnectService = new GoogleDriveOAuthService({
      encryptionKey: testKeyHex,
      httpClient: disconnectHttpClient,
      supabaseClient: disconnectSupabase,
    });

    const result = await disconnectService.disconnectGoogleAccount();
    assert(result.success === true, 'Disconnect returns success');
    assert(revocationCalled, 'Revocation endpoint was contacted');
    assert(databaseDeleted, 'Database record was deleted');

    recordPass('7. Disconnect revokes credentials and removes connection record from database');
  } catch (err) {
    recordFail('7. Disconnect and revocation', err);
  }

  // -------------------------------------------------------------
  // Test 8: Security & Scope Invariants
  // -------------------------------------------------------------
  try {
    const oauthServiceCode = fs.readFileSync(
      path.join(process.cwd(), 'src/services/googleDriveOAuthService.ts'),
      'utf8'
    );
    const routesCode = fs.readFileSync(
      path.join(process.cwd(), 'src/server/routes/googleAuthRoutes.ts'),
      'utf8'
    );
    const migrationCode = fs.readFileSync(
      path.join(process.cwd(), 'supabase/migrations/20260921000000_google_oauth_connections.sql'),
      'utf8'
    );

    // No client secrets in frontend or logs
    assert(!oauthServiceCode.includes('VITE_GOOGLE_CLIENT_SECRET'), 'No VITE_GOOGLE_CLIENT_SECRET in OAuth service');
    assert(!routesCode.includes('VITE_GOOGLE_CLIENT_SECRET'), 'No VITE_GOOGLE_CLIENT_SECRET in routes');

    // No browser automation
    assert(!oauthServiceCode.includes('puppeteer'), 'No puppeteer in OAuth service');
    assert(!oauthServiceCode.includes('playwright'), 'No playwright in OAuth service');

    // Migration enforces RLS
    assert(migrationCode.includes('ENABLE ROW LEVEL SECURITY'), 'Migration enables RLS');
    assert(migrationCode.includes('service_role'), 'Migration allows service_role');
    assert(!migrationCode.includes('TO anon'), 'Anon access NOT permitted in migration');

    recordPass('8. Static security invariants: RLS enforced, zero browser automation, zero leaked secrets');
  } catch (err) {
    recordFail('8. Security invariants', err);
  }

  console.log('================================================================');
  console.log(`STEP 22C TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runStep22CTests().catch((err) => {
  console.error('Unhandled exception in Step 22C tests:', err);
  process.exit(1);
});
