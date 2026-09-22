/**
 * Google Drive Controller & Read-Only Listing Service
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Step 23 — Google Drive Read-Only Access Layer
 * 
 * Controller Responsibilities:
 * - Query parameter validation (safe pageSize 1-100, pageToken, optional folderId)
 * - Delegation to server-side GoogleDriveService using decrypted valid access token
 * - Automatic refresh handling for expired credentials
 * - Normalized safe file metadata projection (zero secrets, zero tokens)
 * - Production-safe error mapping (404 no connection, 401 auth/expired, 403 forbidden, 429 rate limit, 502 upstream)
 * 
 * Invariants:
 * - READ-ONLY: Never downloads content, exports docs, or mutates Drive files
 * - ZERO token leakage: Access/refresh/encryption keys never emitted in responses or logs
 */

import { Request, Response } from 'express';
import {
  googleDriveOAuthService,
  GoogleDriveOAuthService,
  GoogleOAuthError,
} from '../../services/googleDriveOAuthService.js';
import {
  googleDriveService,
  GoogleDriveService,
  GoogleDriveServiceError,
} from '../../services/googleDriveService.js';

export interface ListGoogleDriveFilesOptions {
  pageSize?: number;
  pageToken?: string;
  folderId?: string;
  q?: string;
}

export interface SafeGoogleDriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
  parents: string[];
}

export interface ListGoogleDriveFilesResult {
  success: true;
  files: SafeGoogleDriveFileItem[];
  nextPageToken?: string;
}

/**
 * Service function to list Google Drive files using the active OAuth connection.
 * Can be called with injected service instances for deterministic unit testing.
 */
export async function listGoogleDriveFilesService(
  options: ListGoogleDriveFilesOptions = {},
  oauthService: GoogleDriveOAuthService = googleDriveOAuthService,
  driveService: GoogleDriveService = googleDriveService
): Promise<ListGoogleDriveFilesResult> {
  // 1. Retrieve a valid, decrypted access token (with auto-refresh if expired)
  const accessToken = await oauthService.getValidAccessToken();

  // 2. Configure GoogleDriveService with active access token
  driveService.setAccessToken(accessToken);

  // 3. Query files using official Drive v3 files.list endpoint
  // Safe default: trashed = false is enforced by default in GoogleDriveService
  const listResult = await driveService.listFiles({
    pageSize: options.pageSize,
    pageToken: options.pageToken,
    folderId: options.folderId,
    q: options.q,
    fields: 'nextPageToken, files(id, name, mimeType, size, modifiedTime, webViewLink, parents)',
  });

  // 4. Map to normalized safe response ensuring ZERO credential leakage
  const files: SafeGoogleDriveFileItem[] = (listResult.files || []).map((file) => ({
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    size: file.size !== undefined ? String(file.size) : undefined,
    modifiedTime: file.modifiedTime,
    webViewLink: file.webViewLink,
    parents: Array.isArray(file.parents) ? file.parents : [],
  }));

  const result: ListGoogleDriveFilesResult = {
    success: true,
    files,
  };

  if (listResult.nextPageToken) {
    result.nextPageToken = listResult.nextPageToken;
  }

  return result;
}

/**
 * Express Controller for GET /api/google-drive/files
 */
export async function handleListGoogleDriveFiles(req: Request, res: Response): Promise<void> {
  try {
    // 1. Validate pageSize query parameter if provided
    let pageSize: number | undefined;
    if (req.query?.pageSize !== undefined && req.query?.pageSize !== '') {
      const rawPageSize = req.query.pageSize;
      const parsed = Number(rawPageSize);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
        res.status(400).json({
          success: false,
          error: 'INVALID_PAGE_SIZE',
          message: "Query parameter 'pageSize' must be an integer between 1 and 100.",
        });
        return;
      }
      pageSize = parsed;
    } else {
      pageSize = 100; // Safe default maximum
    }

    // 2. Validate pageToken query parameter if provided
    let pageToken: string | undefined;
    if (req.query?.pageToken !== undefined && req.query?.pageToken !== '') {
      if (typeof req.query.pageToken !== 'string') {
        res.status(400).json({
          success: false,
          error: 'INVALID_PAGE_TOKEN',
          message: "Query parameter 'pageToken' must be a valid string.",
        });
        return;
      }
      pageToken = req.query.pageToken.trim();
    }

    // 3. Optional folderId query parameter
    let folderId: string | undefined;
    if (typeof req.query?.folderId === 'string' && req.query.folderId.trim()) {
      folderId = req.query.folderId.trim();
    }

    // 4. Optional search query parameter
    let q: string | undefined;
    if (typeof req.query?.q === 'string' && req.query.q.trim()) {
      q = req.query.q.trim();
    }

    // 5. Execute list service
    const result = await listGoogleDriveFilesService({
      pageSize,
      pageToken,
      folderId,
      q,
    });

    res.status(200).json(result);
  } catch (err: any) {
    // Handle OAuth related failures
    if (err instanceof GoogleOAuthError) {
      if (err.code === 'NOT_CONNECTED') {
        res.status(404).json({
          success: false,
          error: 'NO_GOOGLE_CONNECTION',
          message: 'No active Google Drive connection found. Please authenticate via /api/auth/google/url.',
        });
        return;
      }

      if (err.code === 'REFRESH_TOKEN_FAILED' || err.statusCode === 401) {
        res.status(401).json({
          success: false,
          error: 'GOOGLE_AUTH_EXPIRED',
          message: 'Google Drive authentication failed or refresh token expired. Re-authorization required.',
        });
        return;
      }

      res.status(err.statusCode || 500).json({
        success: false,
        error: err.code,
        message: err.message,
      });
      return;
    }

    // Handle Google Drive API v3 errors
    if (err instanceof GoogleDriveServiceError) {
      if (err.statusCode === 401) {
        res.status(401).json({
          success: false,
          error: 'GOOGLE_API_UNAUTHORIZED',
          message: 'Google Drive API access token was rejected (401). Re-authentication may be required.',
        });
        return;
      }

      if (err.statusCode === 403) {
        res.status(403).json({
          success: false,
          error: 'GOOGLE_API_FORBIDDEN',
          message: 'Google Drive API access forbidden (403). Ensure drive.readonly scope is granted.',
        });
        return;
      }

      if (err.statusCode === 429) {
        res.status(429).json({
          success: false,
          error: 'RATE_LIMIT_EXCEEDED',
          message: 'Google Drive API rate limit exceeded (429). Please retry later.',
        });
        return;
      }

      if (err.statusCode >= 500 && err.statusCode < 600) {
        res.status(502).json({
          success: false,
          error: 'GOOGLE_API_UNAVAILABLE',
          message: `Google Drive API is temporarily unavailable (HTTP ${err.statusCode}). Please retry later.`,
        });
        return;
      }

      res.status(err.statusCode || 400).json({
        success: false,
        error: err.code || 'DRIVE_API_ERROR',
        message: err.message,
      });
      return;
    }

    // Generic safe fallback
    res.status(500).json({
      success: false,
      error: 'GOOGLE_DRIVE_LIST_FAILED',
      message: err.message || 'Failed to list Google Drive files.',
    });
  }
}
