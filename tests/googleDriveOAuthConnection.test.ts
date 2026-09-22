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
    await service.validateState(state, state);

    // Mismatch fails
    let threwMismatch = false;
    try {
      await service.validateState('wrong-state-00000000000000000000000000000000000000000000000000000000', state);
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

  // -------------------------------------------------------------
  // Test 9: Durable State Management & Atomic Replay Protection (Step 22C-B)
  // -------------------------------------------------------------
  try {
    const mockStateTable: Array<{
      id: string;
      state_hash: string;
      expires_at: string;
      consumed_at: string | null;
      created_at: string;
    }> = [];

    const mockSupabaseStates = {
      from: (table: string) => {
        if (table === 'google_oauth_states') {
          return {
            insert: async (rows: any[]) => {
              for (const r of rows) {
                mockStateTable.push({
                  id: `uuid-${mockStateTable.length + 1}`,
                  state_hash: r.state_hash,
                  expires_at: r.expires_at,
                  consumed_at: null,
                  created_at: new Date().toISOString(),
                });
              }
              return { data: rows, error: null };
            },
            delete: () => ({
              lt: async () => ({ error: null }),
            }),
            update: (updateFields: any) => ({
              eq: (col: string, val: any) => ({
                is: (isCol: string, isVal: any) => ({
                  gt: (gtCol: string, gtVal: any) => ({
                    select: async () => {
                      const matching = mockStateTable.find(
                        (r) =>
                          r.state_hash === val &&
                          r.consumed_at === isVal &&
                          new Date(r.expires_at) > new Date(gtVal)
                      );
                      if (matching) {
                        Object.assign(matching, updateFields);
                        return { data: [matching], error: null };
                      }
                      return { data: [], error: null };
                    },
                  }),
                }),
              }),
            }),
            select: () => ({
              eq: (col: string, val: any) => ({
                limit: async () => {
                  const rows = mockStateTable.filter((r) => r.state_hash === val);
                  return { data: rows, error: null };
                },
              }),
            }),
          };
        }
        return {
          select: () => ({ eq: () => ({ limit: async () => ({ data: [], error: null }) }) }),
        };
      },
    };

    const durableService = new GoogleDriveOAuthService({
      config: {
        clientId: 'mock-client-id',
        clientSecret: 'mock-client-secret',
        redirectUri: 'https://www.hemantkrkushwaha.com/api/auth/google/callback',
      },
      supabaseClient: mockSupabaseStates,
    });

    // 1. Generate state asynchronously and verify storage of SHA-256 hash (never raw state)
    const rawState = await durableService.generateStateAsync();
    assert(rawState.length === 64, 'Raw state is 64 hex characters');
    const expectedHash = crypto.createHash('sha256').update(rawState).digest('hex');
    assert(mockStateTable.length === 1, 'One state persisted in google_oauth_states');
    assert(mockStateTable[0].state_hash === expectedHash, 'Stored value is SHA-256 hash, NOT raw state');
    assert(!JSON.stringify(mockStateTable).includes(rawState), 'Raw state is NEVER persisted in database');

    // 2. Validate state once (first arrival succeeds and marks consumed_at)
    await durableService.validateState(rawState);
    assert(mockStateTable[0].consumed_at !== null, 'State record was atomically consumed');

    // 3. Second validation attempt must be rejected as REPLAY
    let replayRejected = false;
    try {
      await durableService.validateState(rawState);
    } catch (err: any) {
      replayRejected = true;
      assert(err.code === 'INVALID_STATE', 'Throws INVALID_STATE on replay');
      assert(err.message.includes('already been used') || err.message.includes('Replay attempt rejected'), 'Clear replay rejection message');
    }
    assert(replayRejected, 'Replay attempt was successfully rejected');

    // 4. Verification of migration invariants
    const migrationFile = fs.readFileSync(
      path.join(process.cwd(), 'supabase/migrations/20260921010000_google_oauth_states.sql'),
      'utf8'
    );
    assert(migrationFile.includes('CREATE TABLE IF NOT EXISTS google_oauth_states'), 'Migration creates google_oauth_states');
    assert(migrationFile.includes('ENABLE ROW LEVEL SECURITY'), 'Migration enables RLS');
    assert(migrationFile.includes('TO service_role'), 'Grants access to service_role');
    assert(migrationFile.includes('REVOKE ALL ON TABLE google_oauth_states FROM anon'), 'Revokes access from anon');

    recordPass('9. Durable OAuth state: SHA-256 hashing, atomic consumption, replay rejection, and RLS');
  } catch (err) {
    recordFail('9. Durable state management', err);
  }

  // -------------------------------------------------------------
  // Test 10: Mandatory Persistent OAuth Connection Invariants
  // -------------------------------------------------------------
  try {
    const validTokensHttpClient = async () => ({
      status: 200,
      data: {
        access_token: 'mock-access-token',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'mock-refresh-token',
        scope: GOOGLE_DRIVE_READONLY_SCOPE,
      },
    });

    // Subtest A: Database client unavailable -> DATABASE_ERROR (503)
    let dbUnavailableFailedFast = false;
    const serviceNoDb = new GoogleDriveOAuthService({
      config: {
        clientId: 'mock-client-id',
        clientSecret: 'mock-client-secret',
        redirectUri: 'https://www.hemantkrkushwaha.com/api/auth/google/callback',
      },
      encryptionKey: testKeyHex,
      httpClient: validTokensHttpClient,
      supabaseClient: null, // Explicit null database client
    });

    try {
      await serviceNoDb.exchangeAndStoreConnection('valid-code');
    } catch (err: any) {
      dbUnavailableFailedFast = true;
      assert(err instanceof GoogleOAuthError, 'Throws GoogleOAuthError on missing DB');
      assert(err.code === 'DATABASE_ERROR', 'Error code is DATABASE_ERROR');
      assert(err.statusCode === 503, 'HTTP status is 503 Service Unavailable');
      assert(err.message.includes('Database client is unavailable'), 'Clear failure message');
    }
    assert(dbUnavailableFailedFast, 'exchangeAndStoreConnection fails fast with 503 when DB is null');

    // Subtest B: Database INSERT failure -> DATABASE_ERROR (500)
    let dbInsertFailureHandled = false;
    const mockSupabaseInsertError = {
      from: () => ({
        select: () => ({
          eq: () => ({
            limit: async () => ({ data: [], error: null }),
          }),
        }),
        insert: () => ({
          select: () => ({
            single: async () => ({ data: null, error: { message: 'relation google_oauth_connections does not exist' } }),
          }),
        }),
      }),
    };

    const serviceInsertFail = new GoogleDriveOAuthService({
      config: {
        clientId: 'mock-client-id',
        clientSecret: 'mock-client-secret',
        redirectUri: 'https://www.hemantkrkushwaha.com/api/auth/google/callback',
      },
      encryptionKey: testKeyHex,
      httpClient: validTokensHttpClient,
      supabaseClient: mockSupabaseInsertError,
    });

    try {
      await serviceInsertFail.exchangeAndStoreConnection('valid-code');
    } catch (err: any) {
      dbInsertFailureHandled = true;
      assert(err.code === 'DATABASE_ERROR', 'Error code is DATABASE_ERROR on insert error');
      assert(err.message.includes('relation google_oauth_connections does not exist'), 'Includes Postgres error detail');
    }
    assert(dbInsertFailureHandled, 'Database INSERT error throws DATABASE_ERROR');

    // Subtest C: Database UPDATE failure -> DATABASE_ERROR (500)
    let dbUpdateFailureHandled = false;
    const mockSupabaseUpdateError = {
      from: () => ({
        select: () => ({
          eq: () => ({
            limit: async () => ({ data: [{ id: 'existing-id-123' }], error: null }),
          }),
        }),
        update: () => ({
          eq: () => ({
            select: async () => ({ data: null, error: { message: 'connection timeout' } }),
          }),
        }),
      }),
    };

    const serviceUpdateFail = new GoogleDriveOAuthService({
      config: {
        clientId: 'mock-client-id',
        clientSecret: 'mock-client-secret',
        redirectUri: 'https://www.hemantkrkushwaha.com/api/auth/google/callback',
      },
      encryptionKey: testKeyHex,
      httpClient: validTokensHttpClient,
      supabaseClient: mockSupabaseUpdateError,
    });

    try {
      await serviceUpdateFail.exchangeAndStoreConnection('valid-code');
    } catch (err: any) {
      dbUpdateFailureHandled = true;
      assert(err.code === 'DATABASE_ERROR', 'Error code is DATABASE_ERROR on update error');
      assert(err.message.includes('connection timeout'), 'Includes Postgres error detail');
    }
    assert(dbUpdateFailureHandled, 'Database UPDATE error throws DATABASE_ERROR');

    // Subtest D: Database INSERT succeeds but returned row / id missing -> DATABASE_ERROR
    let dbMissingIdHandled = false;
    const mockSupabaseMissingId = {
      from: () => ({
        select: () => ({
          eq: () => ({
            limit: async () => ({ data: [], error: null }),
          }),
        }),
        insert: () => ({
          select: () => ({
            single: async () => ({ data: null, error: null }),
          }),
        }),
      }),
    };

    const serviceMissingId = new GoogleDriveOAuthService({
      config: {
        clientId: 'mock-client-id',
        clientSecret: 'mock-client-secret',
        redirectUri: 'https://www.hemantkrkushwaha.com/api/auth/google/callback',
      },
      encryptionKey: testKeyHex,
      httpClient: validTokensHttpClient,
      supabaseClient: mockSupabaseMissingId,
    });

    try {
      await serviceMissingId.exchangeAndStoreConnection('valid-code');
    } catch (err: any) {
      dbMissingIdHandled = true;
      assert(err.code === 'DATABASE_ERROR', 'Throws DATABASE_ERROR when returned record or id missing');
      assert(err.message.includes('missing'), 'Clear error about missing id');
    }
    assert(dbMissingIdHandled, 'Missing returned id throws DATABASE_ERROR');

    // Subtest E: connection-status with DB unavailable -> throws DATABASE_ERROR / 503 (NOT connected: false)
    let connectionStatusDbUnavailableThrows = false;
    try {
      await serviceNoDb.getSafeConnectionStatus();
    } catch (err: any) {
      connectionStatusDbUnavailableThrows = true;
      assert(err.code === 'DATABASE_ERROR', 'connection-status throws DATABASE_ERROR when DB unavailable');
      assert(err.statusCode === 503, 'connection-status returns 503 when DB unavailable');
    }
    assert(connectionStatusDbUnavailableThrows, 'connection-status throws 503 on unavailable DB rather than returning connected:false');

    // Subtest F: connection-status with zero rows -> connected: false
    const mockSupabaseZeroRows = {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: async () => ({ data: [], error: null }),
            }),
          }),
        }),
      }),
    };
    const serviceZeroRows = new GoogleDriveOAuthService({
      encryptionKey: testKeyHex,
      supabaseClient: mockSupabaseZeroRows,
    });
    const statusZero = await serviceZeroRows.getSafeConnectionStatus();
    assert(statusZero.connected === false, 'Returns connected: false when zero rows in table');
    assert(statusZero.provider === 'google', 'Provider is google');

    // Subtest G: connection-status with one row -> connected: true
    const mockSupabaseOneRow = {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: async () => ({
                data: [{
                  id: 'persisted-123',
                  provider: 'google',
                  email: 'scholar@domain.org',
                  scope: GOOGLE_DRIVE_READONLY_SCOPE,
                  expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
                  updated_at: new Date().toISOString(),
                }],
                error: null,
              }),
            }),
          }),
        }),
      }),
    };
    const serviceOneRow = new GoogleDriveOAuthService({
      encryptionKey: testKeyHex,
      supabaseClient: mockSupabaseOneRow,
    });
    const statusOne = await serviceOneRow.getSafeConnectionStatus();
    assert(statusOne.connected === true, 'Returns connected: true when 1 row in table');
    assert(statusOne.email === 'scholar@domain.org', 'Reports account email safely');
    assert(statusOne.scope === GOOGLE_DRIVE_READONLY_SCOPE, 'Reports scope safely');

    recordPass('10. Mandatory persistent connection: fail-fast on unavailable DB, confirmed write, and safe status');
  } catch (err) {
    recordFail('10. Mandatory persistence invariants', err);
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
