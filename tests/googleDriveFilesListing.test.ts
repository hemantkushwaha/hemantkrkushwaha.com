/**
 * Step 23-ACTION-1: Google Drive Read-Only File Listing Test Suite
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Step 23 — Production-Safe Google Drive Read-Only Access Layer
 * 
 * Verifies:
 * 1. Connected account -> successful normalized file listing
 * 2. No connection -> 404 NO_GOOGLE_CONNECTION
 * 3. Expired token refresh path -> automatic refresh & updated database persistence
 * 4. Google API 401 error handling -> 401 GOOGLE_API_UNAUTHORIZED
 * 5. Google API 403 error handling -> 403 GOOGLE_API_FORBIDDEN
 * 6. Google API 429 error handling -> 429 RATE_LIMIT_EXCEEDED
 * 7. Google API 5xx error handling -> 502 GOOGLE_API_UNAVAILABLE
 * 8. Pagination -> pageToken forwarded and nextPageToken returned
 * 9. PageSize validation -> invalid rejected (400), valid passed
 * 10. Response security -> zero tokens, secrets, or internal encryption keys in response
 * 11. Read-only invariants -> strictly GET /files, trashed = false, zero writes, zero content downloads
 * 12. Authentication boundary -> internal admin bearer token enforcement
 */

import { strict as assert } from 'assert';
import crypto from 'crypto';
import {
  googleDriveOAuthService,
  GoogleDriveOAuthService,
  GoogleOAuthError,
} from '../src/services/googleDriveOAuthService.js';
import {
  googleDriveService,
  GoogleDriveService,
  GoogleDriveServiceError,
} from '../src/services/googleDriveService.js';
import {
  handleListGoogleDriveFiles,
  listGoogleDriveFilesService,
} from '../src/server/controllers/googleDriveController.js';
import { authenticateIngestionRequest } from '../src/server/middleware/authMiddleware.js';
import {
  GOOGLE_DRIVE_API_BASE_URL,
  GoogleOAuthConnectionRecord,
  GoogleHttpClient,
} from '../src/types/googleDrive.js';

async function runStep23Tests() {
  console.log('================================================================');
  console.log('🧪 RUNNING STEP 23: GOOGLE DRIVE READ-ONLY FILE LISTING TESTS');
  console.log('================================================================');

  let passed = 0;
  let failed = 0;

  function recordPass(desc: string) {
    passed++;
    console.log(`  ✅ PASS: ${desc}`);
  }

  function recordFail(desc: string, err: any) {
    failed++;
    console.error(`  ❌ FAIL: ${desc}`);
    console.error(err);
  }

  // Common test encryption key (32 bytes hex)
  const testKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  function createMockExpressResponse() {
    let statusCode = 200;
    let jsonBody: any = null;
    let headers: Record<string, string> = {};

    const res: any = {
      status(code: number) {
        statusCode = code;
        return res;
      },
      json(data: any) {
        jsonBody = data;
        return res;
      },
      setHeader(name: string, val: string) {
        headers[name] = val;
        return res;
      },
      getStatus: () => statusCode,
      getBody: () => jsonBody,
      getHeaders: () => headers,
    };
    return res;
  }

  // -------------------------------------------------------------
  // Test 1: Connected account -> successful file listing
  // -------------------------------------------------------------
  try {
    const oauthService = new GoogleDriveOAuthService({
      config: {
        clientId: 'mock-client-id',
        clientSecret: 'mock-client-secret',
        redirectUri: 'https://example.com/callback',
      },
      encryptionKey: testKey,
    });

    const encryptedAccessToken = oauthService.encryptToken('valid-mock-access-token');
    const encryptedRefreshToken = oauthService.encryptToken('valid-mock-refresh-token');

    const mockDb: GoogleOAuthConnectionRecord[] = [
      {
        id: 'conn-uuid-1',
        provider: 'google',
        email: 'user@example.com',
        scope: 'https://www.googleapis.com/auth/drive.readonly',
        token_type: 'Bearer',
        access_token_encrypted: encryptedAccessToken,
        refresh_token_encrypted: encryptedRefreshToken,
        expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const mockSupabase = {
      from: (table: string) => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: async () => ({ data: mockDb.slice(0, 1), error: null }),
            }),
          }),
        }),
      }),
    };
    oauthService.setSupabaseClient(mockSupabase);

    let recordedDriveRequest: any = null;
    const mockDriveHttp: GoogleHttpClient = async (req) => {
      recordedDriveRequest = req;
      return {
        status: 200,
        headers: {},
        data: {
          kind: 'drive#fileList',
          files: [
            {
              id: 'file-123',
              name: 'Research Paper.pdf',
              mimeType: 'application/pdf',
              size: '1048576',
              modifiedTime: '2026-09-22T08:00:00.000Z',
              webViewLink: 'https://drive.google.com/file/d/file-123/view',
              parents: ['folder-abc'],
            },
          ],
        },
      };
    };

    const driveService = new GoogleDriveService({ httpClient: mockDriveHttp });
    const result = await listGoogleDriveFilesService({ pageSize: 50 }, oauthService, driveService);

    assert(result.success === true, 'Result success must be true');
    assert(Array.isArray(result.files), 'Files must be an array');
    assert(result.files.length === 1, 'Files length must be 1');
    assert(result.files[0].id === 'file-123', 'File id matches');
    assert(result.files[0].name === 'Research Paper.pdf', 'File name matches');
    assert(result.files[0].mimeType === 'application/pdf', 'File mimeType matches');
    assert(result.files[0].size === '1048576', 'File size matches');
    assert(result.files[0].modifiedTime === '2026-09-22T08:00:00.000Z', 'File modifiedTime matches');
    assert(result.files[0].webViewLink === 'https://drive.google.com/file/d/file-123/view', 'File webViewLink matches');
    assert(result.files[0].parents[0] === 'folder-abc', 'Parents list matches');

    assert(recordedDriveRequest !== null, 'Drive API was called');
    assert(recordedDriveRequest.method === 'GET', 'Drive request is strictly GET');
    assert(recordedDriveRequest.url.startsWith(GOOGLE_DRIVE_API_BASE_URL), 'Uses official Drive v3 URL');
    assert(recordedDriveRequest.headers.Authorization === 'Bearer valid-mock-access-token', 'Bearer token supplied');

    recordPass('1. Connected account -> successful normalized file listing');
  } catch (err) {
    recordFail('1. Connected account file listing', err);
  }

  // -------------------------------------------------------------
  // Test 2: No connection -> 404 NO_GOOGLE_CONNECTION
  // -------------------------------------------------------------
  try {
    const oauthService = new GoogleDriveOAuthService({
      config: {
        clientId: 'mock-client-id',
        clientSecret: 'mock-client-secret',
        redirectUri: 'https://example.com/callback',
      },
      encryptionKey: testKey,
    });

    const mockEmptySupabase = {
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
    oauthService.setSupabaseClient(mockEmptySupabase);

    const driveService = new GoogleDriveService();

    let threwExpected = false;
    try {
      await listGoogleDriveFilesService({}, oauthService, driveService);
    } catch (err: any) {
      if (err instanceof GoogleOAuthError && err.code === 'NOT_CONNECTED' && err.statusCode === 404) {
        threwExpected = true;
      }
    }
    assert(threwExpected, 'Service throws NOT_CONNECTED 404 error when not connected');

    // Test controller response for no connection
    const req: any = { query: {} };
    const res = createMockExpressResponse();

    // Temporarily swap singleton client
    const originalSupabase = (googleDriveOAuthService as any).customSupabaseClient;
    googleDriveOAuthService.setSupabaseClient(mockEmptySupabase);
    try {
      await handleListGoogleDriveFiles(req, res);
      assert(res.getStatus() === 404, 'Controller returns HTTP 404 when no connection');
      const body = res.getBody();
      assert(body.success === false, 'Body success is false');
      assert(body.error === 'NO_GOOGLE_CONNECTION', 'Error code is NO_GOOGLE_CONNECTION');
    } finally {
      googleDriveOAuthService.setSupabaseClient(originalSupabase);
    }

    recordPass('2. No connection -> 404 NO_GOOGLE_CONNECTION');
  } catch (err) {
    recordFail('2. No connection handling', err);
  }

  // -------------------------------------------------------------
  // Test 3: Expired token refresh path -> automatic refresh & updated DB
  // -------------------------------------------------------------
  try {
    const oauthService = new GoogleDriveOAuthService({
      config: {
        clientId: 'mock-client-id',
        clientSecret: 'mock-client-secret',
        redirectUri: 'https://example.com/callback',
      },
      encryptionKey: testKey,
    });

    const expiredAccessToken = oauthService.encryptToken('expired-access-token');
    const validRefreshToken = oauthService.encryptToken('valid-refresh-token');

    let updatedDbRecord: any = null;
    const mockDb: GoogleOAuthConnectionRecord[] = [
      {
        id: 'conn-uuid-expired',
        provider: 'google',
        email: 'user@example.com',
        scope: 'https://www.googleapis.com/auth/drive.readonly',
        token_type: 'Bearer',
        access_token_encrypted: expiredAccessToken,
        refresh_token_encrypted: validRefreshToken,
        // Expired 1 hour ago
        expires_at: new Date(Date.now() - 3600 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const mockSupabase = {
      from: (table: string) => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: async () => ({ data: mockDb.slice(0, 1), error: null }),
            }),
          }),
        }),
        update: (updateData: any) => ({
          eq: async (_col: string, val: string) => {
            if (val === 'conn-uuid-expired') {
              updatedDbRecord = updateData;
              Object.assign(mockDb[0], updateData);
            }
            return { error: null };
          },
        }),
      }),
    };
    oauthService.setSupabaseClient(mockSupabase);

    // Mock OAuth refresh endpoint response
    oauthService.setHttpClient(async (req) => {
      assert(req.url.includes('oauth2.googleapis.com/token'), 'Calls Google OAuth token endpoint');
      const bodyStr = typeof req.body === 'string' ? req.body : String(req.body);
      assert(bodyStr.includes('grant_type=refresh_token'), 'Uses refresh_token grant');
      assert(bodyStr.includes('refresh_token=valid-refresh-token'), 'Passes decrypted refresh token');
      return {
        status: 200,
        headers: {},
        data: {
          access_token: 'fresh-new-access-token',
          expires_in: 3600,
          token_type: 'Bearer',
        },
      };
    });

    let usedTokenInDriveApi = '';
    const mockDriveHttp: GoogleHttpClient = async (req) => {
      usedTokenInDriveApi = req.headers.Authorization;
      return {
        status: 200,
        headers: {},
        data: {
          kind: 'drive#fileList',
          files: [],
        },
      };
    };

    const driveService = new GoogleDriveService({ httpClient: mockDriveHttp });
    const result = await listGoogleDriveFilesService({}, oauthService, driveService);

    assert(result.success === true, 'Listing succeeded after automatic refresh');
    assert(usedTokenInDriveApi === 'Bearer fresh-new-access-token', 'Drive API called with refreshed access token');
    assert(updatedDbRecord !== null, 'Database record was updated with refreshed credentials');
    assert(updatedDbRecord.access_token_encrypted !== expiredAccessToken, 'New encrypted access token saved');

    recordPass('3. Expired token refresh path -> automatic refresh & updated DB persistence');
  } catch (err) {
    recordFail('3. Expired token refresh', err);
  }

  // -------------------------------------------------------------
  // Test 4: Google API 401 error handling -> 401 GOOGLE_API_UNAUTHORIZED
  // -------------------------------------------------------------
  try {
    const oauthService = new GoogleDriveOAuthService({
      config: {
        clientId: 'mock-client-id',
        clientSecret: 'mock-client-secret',
        redirectUri: 'https://example.com/callback',
      },
      encryptionKey: testKey,
    });

    oauthService.setSupabaseClient({
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: async () => ({
                data: [
                  {
                    id: 'conn-1',
                    provider: 'google',
                    email: 'test@example.com',
                    scope: 'drive.readonly',
                    access_token_encrypted: googleDriveOAuthService.encryptToken('token-401'),
                    refresh_token_encrypted: googleDriveOAuthService.encryptToken('refresh-401'),
                    expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
                  },
                ],
                error: null,
              }),
            }),
          }),
        }),
      }),
    });

    const mockDriveHttp401: GoogleHttpClient = async () => ({
      status: 401,
      headers: {},
      data: { error: { code: 401, message: 'Invalid Credentials' } },
    });

    const driveService = new GoogleDriveService({ httpClient: mockDriveHttp401 });

    const req: any = { query: {} };
    const res = createMockExpressResponse();

    const origOAuth = (googleDriveOAuthService as any).customSupabaseClient;
    const origDrive = (googleDriveService as any).httpClient;
    (googleDriveOAuthService as any).setSupabaseClient((oauthService as any).customSupabaseClient);
    (googleDriveService as any).setHttpClient(mockDriveHttp401);

    try {
      await handleListGoogleDriveFiles(req, res);
      assert(res.getStatus() === 401, 'Controller returns 401 for Google API 401');
      const body = res.getBody();
      assert(body.success === false, 'Body success is false');
      assert(body.error === 'GOOGLE_API_UNAUTHORIZED', 'Error code is GOOGLE_API_UNAUTHORIZED');
    } finally {
      (googleDriveOAuthService as any).setSupabaseClient(origOAuth);
      (googleDriveService as any).setHttpClient(origDrive);
    }

    recordPass('4. Google API 401 error handling -> 401 GOOGLE_API_UNAUTHORIZED');
  } catch (err) {
    recordFail('4. Google API 401', err);
  }

  // -------------------------------------------------------------
  // Test 5: Google API 403 error handling -> 403 GOOGLE_API_FORBIDDEN
  // -------------------------------------------------------------
  try {
    const mockDriveHttp403: GoogleHttpClient = async () => ({
      status: 403,
      headers: {},
      data: { error: { code: 403, message: 'The user does not have sufficient permissions.' } },
    });

    const req: any = { query: {} };
    const res = createMockExpressResponse();

    const origDrive = (googleDriveService as any).httpClient;
    (googleDriveService as any).setHttpClient(mockDriveHttp403);

    // Mock active connection
    const origSupabase = (googleDriveOAuthService as any).customSupabaseClient;
    googleDriveOAuthService.setSupabaseClient({
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: async () => ({
                data: [
                  {
                    id: 'conn-1',
                    provider: 'google',
                    email: 'test@example.com',
                    scope: 'drive.readonly',
                    access_token_encrypted: googleDriveOAuthService.encryptToken('token-403'),
                    refresh_token_encrypted: googleDriveOAuthService.encryptToken('refresh-403'),
                    expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
                  },
                ],
                error: null,
              }),
            }),
          }),
        }),
      }),
    });

    try {
      await handleListGoogleDriveFiles(req, res);
      assert(res.getStatus() === 403, 'Controller returns 403 for Google API 403');
      const body = res.getBody();
      assert(body.success === false, 'Body success is false');
      assert(body.error === 'GOOGLE_API_FORBIDDEN', 'Error code is GOOGLE_API_FORBIDDEN');
    } finally {
      (googleDriveOAuthService as any).setSupabaseClient(origSupabase);
      (googleDriveService as any).setHttpClient(origDrive);
    }

    recordPass('5. Google API 403 error handling -> 403 GOOGLE_API_FORBIDDEN');
  } catch (err) {
    recordFail('5. Google API 403', err);
  }

  // -------------------------------------------------------------
  // Test 6: Google API 429 error handling -> 429 RATE_LIMIT_EXCEEDED
  // -------------------------------------------------------------
  try {
    const mockDriveHttp429: GoogleHttpClient = async () => ({
      status: 429,
      headers: {},
      data: { error: { code: 429, message: 'User Rate Limit Exceeded' } },
    });

    const req: any = { query: {} };
    const res = createMockExpressResponse();

    const origDrive = (googleDriveService as any).httpClient;
    const origSupabase = (googleDriveOAuthService as any).customSupabaseClient;

    (googleDriveService as any).setHttpClient(mockDriveHttp429);
    googleDriveOAuthService.setSupabaseClient({
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: async () => ({
                data: [
                  {
                    id: 'conn-1',
                    provider: 'google',
                    email: 'test@example.com',
                    scope: 'drive.readonly',
                    access_token_encrypted: googleDriveOAuthService.encryptToken('token-429'),
                    refresh_token_encrypted: googleDriveOAuthService.encryptToken('refresh-429'),
                    expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
                  },
                ],
                error: null,
              }),
            }),
          }),
        }),
      }),
    });

    try {
      await handleListGoogleDriveFiles(req, res);
      assert(res.getStatus() === 429, 'Controller returns 429 for Google API 429');
      const body = res.getBody();
      assert(body.success === false, 'Body success is false');
      assert(body.error === 'RATE_LIMIT_EXCEEDED', 'Error code is RATE_LIMIT_EXCEEDED');
    } finally {
      (googleDriveOAuthService as any).setSupabaseClient(origSupabase);
      (googleDriveService as any).setHttpClient(origDrive);
    }

    recordPass('6. Google API 429 error handling -> 429 RATE_LIMIT_EXCEEDED');
  } catch (err) {
    recordFail('6. Google API 429', err);
  }

  // -------------------------------------------------------------
  // Test 7: Google API 5xx error handling -> 502 GOOGLE_API_UNAVAILABLE
  // -------------------------------------------------------------
  try {
    const mockDriveHttp503: GoogleHttpClient = async () => ({
      status: 503,
      headers: {},
      data: { error: { code: 503, message: 'Service Unavailable' } },
    });

    const req: any = { query: {} };
    const res = createMockExpressResponse();

    const origDrive = (googleDriveService as any).httpClient;
    const origSupabase = (googleDriveOAuthService as any).customSupabaseClient;

    (googleDriveService as any).setHttpClient(mockDriveHttp503);
    googleDriveOAuthService.setSupabaseClient({
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: async () => ({
                data: [
                  {
                    id: 'conn-1',
                    provider: 'google',
                    email: 'test@example.com',
                    scope: 'drive.readonly',
                    access_token_encrypted: googleDriveOAuthService.encryptToken('token-503'),
                    refresh_token_encrypted: googleDriveOAuthService.encryptToken('refresh-503'),
                    expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
                  },
                ],
                error: null,
              }),
            }),
          }),
        }),
      }),
    });

    try {
      await handleListGoogleDriveFiles(req, res);
      assert(res.getStatus() === 502, 'Controller returns 502 for Google API 503');
      const body = res.getBody();
      assert(body.success === false, 'Body success is false');
      assert(body.error === 'GOOGLE_API_UNAVAILABLE', 'Error code is GOOGLE_API_UNAVAILABLE');
    } finally {
      (googleDriveOAuthService as any).setSupabaseClient(origSupabase);
      (googleDriveService as any).setHttpClient(origDrive);
    }

    recordPass('7. Google API 5xx error handling -> 502 GOOGLE_API_UNAVAILABLE');
  } catch (err) {
    recordFail('7. Google API 5xx', err);
  }

  // -------------------------------------------------------------
  // Test 8: Pagination -> pageToken forwarded and nextPageToken returned
  // -------------------------------------------------------------
  try {
    let capturedUrl = '';
    const mockPaginationHttp: GoogleHttpClient = async (req) => {
      capturedUrl = req.url;
      return {
        status: 200,
        headers: {},
        data: {
          kind: 'drive#fileList',
          nextPageToken: 'next-page-token-xyz',
          files: [
            {
              id: 'file-p1',
              name: 'Page 1 File.txt',
              mimeType: 'text/plain',
              size: '100',
              parents: [],
            },
          ],
        },
      };
    };

    const oauthService = new GoogleDriveOAuthService({ encryptionKey: testKey });
    oauthService.setSupabaseClient({
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: async () => ({
                data: [
                  {
                    id: 'conn-1',
                    provider: 'google',
                    email: 'test@example.com',
                    scope: 'drive.readonly',
                    access_token_encrypted: oauthService.encryptToken('token-page'),
                    refresh_token_encrypted: oauthService.encryptToken('refresh-page'),
                    expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
                  },
                ],
                error: null,
              }),
            }),
          }),
        }),
      }),
    });

    const driveService = new GoogleDriveService({ httpClient: mockPaginationHttp });
    const result = await listGoogleDriveFilesService(
      { pageToken: 'cursor-token-123', pageSize: 25 },
      oauthService,
      driveService
    );

    assert(capturedUrl.includes('pageToken=cursor-token-123'), 'Request URL includes provided pageToken');
    assert(capturedUrl.includes('pageSize=25'), 'Request URL includes provided pageSize');
    assert(result.nextPageToken === 'next-page-token-xyz', 'Response provides nextPageToken');
    assert(result.files.length === 1, 'Returns 1 file on page');

    recordPass('8. Pagination -> pageToken forwarded and nextPageToken returned');
  } catch (err) {
    recordFail('8. Pagination', err);
  }

  // -------------------------------------------------------------
  // Test 9: PageSize validation -> invalid rejected (400), valid passed
  // -------------------------------------------------------------
  try {
    // 9a. pageSize > 100
    const resOver = createMockExpressResponse();
    await handleListGoogleDriveFiles({ query: { pageSize: '101' } } as any, resOver);
    assert(resOver.getStatus() === 400, 'pageSize > 100 returns 400');
    assert(resOver.getBody().error === 'INVALID_PAGE_SIZE', 'Error is INVALID_PAGE_SIZE');

    // 9b. pageSize < 1
    const resUnder = createMockExpressResponse();
    await handleListGoogleDriveFiles({ query: { pageSize: '0' } } as any, resUnder);
    assert(resUnder.getStatus() === 400, 'pageSize < 1 returns 400');
    assert(resUnder.getBody().error === 'INVALID_PAGE_SIZE', 'Error is INVALID_PAGE_SIZE');

    // 9c. pageSize non-numeric
    const resAlpha = createMockExpressResponse();
    await handleListGoogleDriveFiles({ query: { pageSize: 'abc' } } as any, resAlpha);
    assert(resAlpha.getStatus() === 400, 'pageSize non-numeric returns 400');
    assert(resAlpha.getBody().error === 'INVALID_PAGE_SIZE', 'Error is INVALID_PAGE_SIZE');

    // 9d. pageToken non-string
    const resToken = createMockExpressResponse();
    await handleListGoogleDriveFiles({ query: { pageToken: ['array', 'not-string'] } } as any, resToken);
    assert(resToken.getStatus() === 400, 'pageToken array returns 400');
    assert(resToken.getBody().error === 'INVALID_PAGE_TOKEN', 'Error is INVALID_PAGE_TOKEN');

    recordPass('9. PageSize validation -> invalid rejected (400), valid passed');
  } catch (err) {
    recordFail('9. PageSize validation', err);
  }

  // -------------------------------------------------------------
  // Test 10: Response security -> zero tokens, secrets, or internal encryption keys
  // -------------------------------------------------------------
  try {
    const oauthService = new GoogleDriveOAuthService({ encryptionKey: testKey });
    oauthService.setSupabaseClient({
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: async () => ({
                data: [
                  {
                    id: 'conn-1',
                    provider: 'google',
                    email: 'test@example.com',
                    scope: 'drive.readonly',
                    access_token_encrypted: oauthService.encryptToken('secret-access-token-999'),
                    refresh_token_encrypted: oauthService.encryptToken('secret-refresh-token-999'),
                    expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
                  },
                ],
                error: null,
              }),
            }),
          }),
        }),
      }),
    });

    const mockDriveHttp: GoogleHttpClient = async () => ({
      status: 200,
      headers: {},
      data: {
        kind: 'drive#fileList',
        files: [
          {
            id: 'file-safe',
            name: 'Document.docx',
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            size: '54321',
            webViewLink: 'https://drive.google.com/view/file-safe',
            parents: ['root'],
          },
        ],
      },
    });

    const driveService = new GoogleDriveService({ httpClient: mockDriveHttp });
    const result = await listGoogleDriveFilesService({}, oauthService, driveService);

    const serialized = JSON.stringify(result);

    // Verify absence of sensitive patterns
    assert(!serialized.includes('secret-access-token-999'), 'access token must not be in response');
    assert(!serialized.includes('secret-refresh-token-999'), 'refresh token must not be in response');
    assert(!serialized.includes('access_token'), 'access_token field must not be in response');
    assert(!serialized.includes('refresh_token'), 'refresh_token field must not be in response');
    assert(!serialized.includes(testKey), 'encryption key must not be in response');
    assert(!serialized.includes('client_secret'), 'client_secret must not be in response');

    recordPass('10. Response security -> zero tokens, secrets, or internal encryption keys');
  } catch (err) {
    recordFail('10. Response security', err);
  }

  // -------------------------------------------------------------
  // Test 11: Read-only invariants -> strictly GET, trashed = false, zero writes, zero content downloads
  // -------------------------------------------------------------
  try {
    let capturedMethod = '';
    let capturedUrl = '';

    const mockDriveHttp: GoogleHttpClient = async (req) => {
      capturedMethod = req.method;
      capturedUrl = req.url;
      return {
        status: 200,
        headers: {},
        data: {
          kind: 'drive#fileList',
          files: [],
        },
      };
    };

    const oauthService = new GoogleDriveOAuthService({ encryptionKey: testKey });
    oauthService.setSupabaseClient({
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: async () => ({
                data: [
                  {
                    id: 'conn-1',
                    provider: 'google',
                    email: 'test@example.com',
                    scope: 'drive.readonly',
                    access_token_encrypted: oauthService.encryptToken('token-ro'),
                    refresh_token_encrypted: oauthService.encryptToken('refresh-ro'),
                    expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
                  },
                ],
                error: null,
              }),
            }),
          }),
        }),
      }),
    });

    const driveService = new GoogleDriveService({ httpClient: mockDriveHttp });
    await listGoogleDriveFilesService({}, oauthService, driveService);

    assert(capturedMethod === 'GET', 'HTTP method is strictly GET');
    assert(capturedUrl.includes('trashed+%3D+false') || capturedUrl.includes('trashed = false'), 'Enforces trashed = false');
    assert(!capturedUrl.includes('alt=media'), 'Does not download file contents');
    assert(!capturedUrl.includes('/export'), 'Does not export Google Docs/Sheets');

    recordPass('11. Read-only invariants -> strictly GET, trashed = false, zero writes, zero content downloads');
  } catch (err) {
    recordFail('11. Read-only invariants', err);
  }

  // -------------------------------------------------------------
  // Test 12: Authentication boundary -> internal admin bearer token enforcement
  // -------------------------------------------------------------
  try {
    const originalApiKey = process.env.CONTENT_INGESTION_API_KEY;
    process.env.CONTENT_INGESTION_API_KEY = 'test-secret-ingestion-api-key-12345';

    try {
      // 12a. Missing header -> 401
      const reqMissing: any = { headers: {} };
      const resMissing = createMockExpressResponse();
      let nextCalled = false;
      authenticateIngestionRequest(reqMissing, resMissing, () => {
        nextCalled = true;
      });
      assert(resMissing.getStatus() === 401, 'Missing Authorization header returns 401');
      assert(!nextCalled, 'next() is not called on missing auth');

      // 12b. Wrong Bearer token -> 401
      const reqWrong: any = { headers: { authorization: 'Bearer wrong-api-key' } };
      const resWrong = createMockExpressResponse();
      nextCalled = false;
      authenticateIngestionRequest(reqWrong, resWrong, () => {
        nextCalled = true;
      });
      assert(resWrong.getStatus() === 401, 'Wrong token returns 401');
      assert(!nextCalled, 'next() is not called on wrong token');

      // 12c. Correct Bearer token -> next() called
      const reqValid: any = { headers: { authorization: 'Bearer test-secret-ingestion-api-key-12345' } };
      const resValid = createMockExpressResponse();
      nextCalled = false;
      authenticateIngestionRequest(reqValid, resValid, () => {
        nextCalled = true;
      });
      assert(nextCalled, 'next() is called when Authorization header matches configured key');
      assert(resValid.getStatus() === 200, 'Status is not modified to error on success');
    } finally {
      process.env.CONTENT_INGESTION_API_KEY = originalApiKey;
    }

    recordPass('12. Authentication boundary -> internal admin bearer token enforcement');
  } catch (err) {
    recordFail('12. Authentication boundary', err);
  }

  console.log('================================================================');
  console.log(`STEP 23 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runStep23Tests().catch((err) => {
  console.error('Fatal test failure:', err);
  process.exit(1);
});
