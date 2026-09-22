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
import {
  googleDriveAdapter,
  GoogleDriveAdapter,
  GOOGLE_DRIVE_NATIVE_MIME_TYPES,
} from '../../services/adapters/googleDriveAdapter.js';
import {
  MANIFEST_SECTIONS,
  MANIFEST_CONTENT_TYPES,
  ManifestSection,
  ManifestContentType,
} from '../../types/manifest.js';
import { AutomationManifest } from '../../types/automation.js';
import { DEFAULT_MAX_FILE_SIZE_BYTES } from '../../services/storageService.js';

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

/**
 * Structured error class for Google Drive Preview operations
 */
export class GoogleDrivePreviewError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly errors?: string[];
  public readonly file?: any;

  constructor(
    code: string,
    message: string,
    statusCode: number = 400,
    errors?: string[],
    file?: any
  ) {
    super(message);
    this.name = 'GoogleDrivePreviewError';
    this.code = code;
    this.statusCode = statusCode;
    this.errors = errors;
    this.file = file;
    Object.setPrototypeOf(this, GoogleDrivePreviewError.prototype);
  }
}

export interface PreviewGoogleDriveFileOptions {
  fileId: string;
  taxonomy: {
    section?: string;
    category?: string;
    topic?: string;
    content_type?: string;
    title?: string;
    description?: string;
    tags?: string[];
    subcategory?: string;
  };
  exportFormat?: string;
}

export interface PreviewGoogleDriveFileResult {
  success: true;
  manifest: AutomationManifest;
}

/**
 * Service function to transform a single Google Drive file into Content Manifest v1.0 preview.
 * Strictly READ-ONLY: Never writes to database, storage, or external services.
 */
export async function previewGoogleDriveFileService(
  options: PreviewGoogleDriveFileOptions,
  oauthService: GoogleDriveOAuthService = googleDriveOAuthService,
  driveService: GoogleDriveService = googleDriveService,
  adapter: GoogleDriveAdapter = googleDriveAdapter
): Promise<PreviewGoogleDriveFileResult> {
  const { fileId, taxonomy, exportFormat } = options;

  // 1. Validate fileId
  if (!fileId || typeof fileId !== 'string' || !fileId.trim()) {
    throw new GoogleDrivePreviewError(
      'INVALID_FILE_ID',
      'A valid Google Drive fileId must be provided in the route parameter.',
      400
    );
  }

  // 2. Validate non-negotiable user taxonomy metadata
  const validationErrors: string[] = [];
  if (!taxonomy.section || typeof taxonomy.section !== 'string' || !taxonomy.section.trim()) {
    validationErrors.push('Missing required taxonomy field: "section".');
  } else if (!MANIFEST_SECTIONS.includes(taxonomy.section.trim() as ManifestSection)) {
    validationErrors.push(
      `Invalid section "${taxonomy.section}". Allowed sections are: ${MANIFEST_SECTIONS.join(', ')}.`
    );
  }

  if (!taxonomy.category || typeof taxonomy.category !== 'string' || !taxonomy.category.trim()) {
    validationErrors.push('Missing required taxonomy field: "category".');
  }

  if (!taxonomy.topic || typeof taxonomy.topic !== 'string' || !taxonomy.topic.trim()) {
    validationErrors.push('Missing required taxonomy field: "topic".');
  }

  if (!taxonomy.content_type || typeof taxonomy.content_type !== 'string' || !taxonomy.content_type.trim()) {
    validationErrors.push('Missing required taxonomy field: "content_type".');
  } else if (!MANIFEST_CONTENT_TYPES.includes(taxonomy.content_type.trim() as ManifestContentType)) {
    validationErrors.push(
      `Invalid content_type "${taxonomy.content_type}". Allowed types are: ${MANIFEST_CONTENT_TYPES.join(', ')}.`
    );
  }

  if (!taxonomy.title || typeof taxonomy.title !== 'string' || !taxonomy.title.trim()) {
    validationErrors.push('Missing required taxonomy field: "title".');
  }

  if (validationErrors.length > 0) {
    throw new GoogleDrivePreviewError(
      'INVALID_MANIFEST_METADATA',
      `User taxonomy validation failed: ${validationErrors.join(' ')}`,
      400,
      validationErrors
    );
  }

  // 3. Retrieve valid decrypted access token (with automatic refresh if needed)
  const accessToken = await oauthService.getValidAccessToken();
  driveService.setAccessToken(accessToken);

  // 4. Retrieve Google Drive file metadata
  const file = await driveService.getFile(fileId.trim());

  // 5. Check if file is in trash
  if (file.trashed) {
    throw new GoogleDrivePreviewError(
      'TRASHED_FILE',
      `Cannot preview file "${file.name}" because it is in the Google Drive trash.`,
      400,
      undefined,
      { id: file.id, name: file.name, trashed: true }
    );
  }

  // 6. Check file size against 50 MB limit
  if (file.size !== undefined && Number(file.size) > DEFAULT_MAX_FILE_SIZE_BYTES) {
    throw new GoogleDrivePreviewError(
      'FILE_TOO_LARGE',
      `File size (${file.size} bytes) exceeds the maximum allowed limit of 50 MB (${DEFAULT_MAX_FILE_SIZE_BYTES} bytes).`,
      413,
      undefined,
      { id: file.id, name: file.name, size: file.size }
    );
  }

  // 7. Check MIME type and handle content extraction
  let bodyContent = '';
  const mimeType = file.mimeType || '';

  if (mimeType === GOOGLE_DRIVE_NATIVE_MIME_TYPES.DOCUMENT) {
    // Google Docs: Official Drive v3 export
    if (
      exportFormat === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      exportFormat === 'docx'
    ) {
      // Export as DOCX binary; platform currently has no binary DOCX text extractor
      await driveService.exportGoogleDocument(
        file.id,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        file
      );
      throw new GoogleDrivePreviewError(
        'PREVIEW_UNSUPPORTED_EXTRACTION',
        'Content extraction for Word documents (DOCX) is not supported in the current architecture. Plain text representation required.',
        422,
        undefined,
        { id: file.id, name: file.name, mimeType: file.mimeType, exportTarget: 'docx' }
      );
    }

    // Default: Official text/plain export representation
    const exportResult = await driveService.exportGoogleDocument(file.id, 'text/plain', file);
    bodyContent = exportResult.data.toString('utf-8');
  } else if (mimeType === GOOGLE_DRIVE_NATIVE_MIME_TYPES.PRESENTATION) {
    // Google Slides: Export as PPTX using official GoogleDriveService
    await driveService.exportGoogleDocument(
      file.id,
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      file
    );
    // Structured unsupported extraction error for binary presentation format
    throw new GoogleDrivePreviewError(
      'PREVIEW_UNSUPPORTED_EXTRACTION',
      'Content extraction for Google Slides (PPTX) is not supported in the current architecture. Binary presentation extractor required.',
      422,
      undefined,
      {
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        exportTarget: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      }
    );
  } else if (mimeType === GOOGLE_DRIVE_NATIVE_MIME_TYPES.SPREADSHEET) {
    // Google Sheets: Export as XLSX using official GoogleDriveService
    await driveService.exportGoogleDocument(
      file.id,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      file
    );
    // Structured unsupported extraction error for binary spreadsheet format
    throw new GoogleDrivePreviewError(
      'PREVIEW_UNSUPPORTED_EXTRACTION',
      'Content extraction for Google Sheets (XLSX) is not supported in the current architecture. Binary spreadsheet extractor required.',
      422,
      undefined,
      {
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        exportTarget: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }
    );
  } else if (
    mimeType === 'text/plain' ||
    mimeType === 'text/markdown' ||
    mimeType === 'text/x-markdown' ||
    mimeType === 'application/json' ||
    (file.name && (file.name.endsWith('.txt') || file.name.endsWith('.md')))
  ) {
    // Downloadable text file
    const downloadResult = await driveService.downloadFile(file.id, file);
    bodyContent = downloadResult.data.toString('utf-8');
  } else if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimeType === 'application/pdf'
  ) {
    // Binary document format without existing platform text extractor
    throw new GoogleDrivePreviewError(
      'PREVIEW_UNSUPPORTED_EXTRACTION',
      `Content extraction for binary format (${mimeType}) is not supported in the current architecture.`,
      422,
      undefined,
      { id: file.id, name: file.name, mimeType: file.mimeType }
    );
  } else {
    // Unsupported file type (folder, form, drawing, script, shortcut, multimedia, etc.)
    throw new GoogleDrivePreviewError(
      'PREVIEW_UNSUPPORTED_FILE_TYPE',
      `File type "${mimeType}" is not supported for content preview.`,
      415,
      undefined,
      { id: file.id, name: file.name, mimeType: file.mimeType }
    );
  }

  // 8. Transform into canonical Content Manifest v1.0 using GoogleDriveAdapter
  const sourceInput = driveService.buildSourceInput({
    file,
    taxonomy: {
      section: taxonomy.section.trim(),
      category: taxonomy.category.trim(),
      topic: taxonomy.topic.trim(),
      content_type: taxonomy.content_type.trim(),
      title: taxonomy.title.trim(),
      description: taxonomy.description?.trim(),
      tags: taxonomy.tags,
      subcategory: taxonomy.subcategory?.trim(),
    },
    body: bodyContent,
  });

  const adapted = await adapter.adapt(sourceInput);
  const manifest = adapted.manifest;

  // Provide canonical content object helper
  manifest.content = { body: manifest.body || '' };

  return {
    success: true,
    manifest,
  };
}

/**
 * Express Controller for GET /api/google-drive/files/:fileId/preview
 */
export async function handlePreviewGoogleDriveFile(req: Request, res: Response): Promise<void> {
  return executePreviewGoogleDriveFile(req, res);
}

/**
 * Controller execution logic with pluggable services for testing and direct invocation
 */
export async function executePreviewGoogleDriveFile(
  req: Request,
  res: Response,
  oauthService: GoogleDriveOAuthService = googleDriveOAuthService,
  driveService: GoogleDriveService = googleDriveService,
  adapter: GoogleDriveAdapter = googleDriveAdapter
): Promise<void> {
  try {
    const fileId = ((req.params?.fileId || req.query?.fileId) as string) || '';

    // Extract user-controlled taxonomy parameters (query primary, body fallback)
    const section = (req.query?.section || req.body?.section) as string | undefined;
    const category = (req.query?.category || req.body?.category) as string | undefined;
    const topic = (req.query?.topic || req.body?.topic) as string | undefined;
    const content_type = (req.query?.content_type || req.body?.content_type) as string | undefined;
    const title = (req.query?.title || req.body?.title) as string | undefined;
    const description = (req.query?.description || req.body?.description) as string | undefined;
    const subcategory = (req.query?.subcategory || req.body?.subcategory) as string | undefined;
    const exportFormat = (req.query?.export_format || req.query?.exportFormat || req.body?.export_format) as string | undefined;

    // Parse tags (comma-separated string or array)
    let tags: string[] | undefined;
    const rawTags = req.query?.tags !== undefined ? req.query.tags : req.body?.tags;
    if (Array.isArray(rawTags)) {
      tags = rawTags.map((t) => String(t).trim()).filter((t) => t.length > 0);
    } else if (typeof rawTags === 'string' && rawTags.trim().length > 0) {
      tags = rawTags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
    }

    const result = await previewGoogleDriveFileService(
      {
        fileId,
        taxonomy: {
          section,
          category,
          topic,
          content_type,
          title,
          description,
          tags,
          subcategory,
        },
        exportFormat,
      },
      oauthService,
      driveService,
      adapter
    );

    res.status(200).json(result);
  } catch (err: any) {
    if (err instanceof GoogleDrivePreviewError) {
      res.status(err.statusCode).json({
        success: false,
        error: err.code,
        message: err.message,
        ...(err.errors ? { errors: err.errors } : {}),
        ...(err.file ? { file: err.file } : {}),
      });
      return;
    }

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

    if (err instanceof GoogleDriveServiceError) {
      if (err.statusCode === 404 || err.code === 'FILE_NOT_FOUND') {
        res.status(404).json({
          success: false,
          error: 'DRIVE_FILE_NOT_FOUND',
          message: err.message || 'Google Drive file not found.',
        });
        return;
      }

      if (err.statusCode === 401 || err.code === 'MISSING_ACCESS_TOKEN') {
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
          error: 'GOOGLE_API_RATE_LIMITED',
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

    res.status(500).json({
      success: false,
      error: 'GOOGLE_DRIVE_PREVIEW_FAILED',
      message: err.message || 'Failed to preview Google Drive file.',
    });
  }
}

