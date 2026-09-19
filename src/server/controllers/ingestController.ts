/**
 * Content Ingestion Controller
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Step 10 — Secure Server-Side Content Ingestion API
 * 
 * Flow:
 * Route → Controller → Ingestion Service → Supabase
 * 
 * Responsibilities:
 * - Validates incoming request structure and payload.
 * - Invokes ingestContent() with server-side administrative Supabase client.
 * - Handles duplicate content conflicts with HTTP 409.
 * - Sanitizes all responses to prevent database/secret leakage.
 */

import { Request, Response } from 'express';
import { ingestContent } from '../../services/contentIngestionService.js';
import { validateContentManifest } from '../../services/manifestService.js';
import { getServerSupabaseClient } from '../lib/supabaseServer.js';
import { IngestionRequest } from '../middleware/multipartMiddleware.js';
import { AutomationErrorCode } from '../../types/automation.js';

/**
 * Request-Level In-Memory Idempotency Cache (Part D)
 * 
 * Stores recent responses for external automation retries within the server process.
 * NOTE: Database schema is NOT modified. This provides request-level idempotency,
 * while underlying PostgreSQL slug uniqueness prevents duplicate database writes.
 */
interface IdempotencyRecord {
  statusCode: number;
  body: any;
  timestamp: number;
}

const IDEMPOTENCY_TTL_MS = 5 * 60 * 1000; // 5 minutes TTL
const MAX_IDEMPOTENCY_ENTRIES = 1000;
const idempotencyCache = new Map<string, IdempotencyRecord>();

export function getCachedIdempotencyRecord(key: string): IdempotencyRecord | null {
  const record = idempotencyCache.get(key);
  if (!record) return null;
  if (Date.now() - record.timestamp > IDEMPOTENCY_TTL_MS) {
    idempotencyCache.delete(key);
    return null;
  }
  return record;
}

export function setCachedIdempotencyRecord(key: string, statusCode: number, body: any): void {
  if (idempotencyCache.size >= MAX_IDEMPOTENCY_ENTRIES) {
    const oldestKey = idempotencyCache.keys().next().value;
    if (oldestKey) idempotencyCache.delete(oldestKey);
  }
  idempotencyCache.set(key, {
    statusCode,
    body,
    timestamp: Date.now(),
  });
}

/**
 * Helper to format error responses adhering to Part G while preserving backward compatibility.
 */
function sendErrorResponse(
  req: Request,
  res: Response,
  statusCode: number,
  errorCode: AutomationErrorCode,
  errorMessage: string,
  extra: Record<string, unknown> = {}
): void {
  const rawManifest = req.body?.manifest || req.body;
  const isAutomationRequest =
    req.headers?.['x-api-version'] === '1.0' ||
    req.headers?.['x-client-type'] === 'automation' ||
    (rawManifest && typeof rawManifest === 'object' && rawManifest.manifest_version === '1.0');

  if (isAutomationRequest) {
    res.status(statusCode).json({
      success: false,
      error: {
        code: errorCode,
        message: errorMessage,
      },
      error_code: errorCode,
      ...extra,
    });
  } else {
    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      error_code: errorCode,
      error_details: {
        code: errorCode,
        message: errorMessage,
      },
      ...extra,
    });
  }
}

export async function handleContentIngestion(req: Request, res: Response): Promise<void> {
  const ingReq = req as IngestionRequest;

  // 1. Check Idempotency-Key header (Part D)
  const rawIdempotencyKey = req.headers?.['idempotency-key'];
  const idempotencyKey = typeof rawIdempotencyKey === 'string' ? rawIdempotencyKey.trim() : null;

  if (idempotencyKey) {
    if (idempotencyKey.length === 0 || idempotencyKey.length > 128) {
      sendErrorResponse(
        req,
        res,
        400,
        'MALFORMED_REQUEST',
        'Bad Request: Idempotency-Key header must be between 1 and 128 characters.'
      );
      return;
    }

    const cached = getCachedIdempotencyRecord(idempotencyKey);
    if (cached) {
      res.setHeader('X-Cache-Lookup', 'HIT');
      res.status(cached.statusCode).json(cached.body);
      return;
    }
  }

  // 2. Single-file enforcement check (Step 13 only permits manifest-only or manifest + 1 file)
  if (
    ingReq.multipleFilesDetected ||
    (Array.isArray(req.body?.files) && req.body.files.length > 1) ||
    (Array.isArray(req.body?.file) && req.body.file.length > 1)
  ) {
    sendErrorResponse(
      req,
      res,
      400,
      'INVALID_MANIFEST',
      'Bad Request: Multiple files are not supported in Step 13. Only one file may be uploaded per ingestion request.'
    );
    return;
  }

  // 3. Extract Manifest and File Resource
  let rawManifest: any = req.body;
  let fileResource: any = ingReq.fileResource || null;

  // If manifest was provided under 'manifest' key (JSON payload or multipart field)
  if (req.body && typeof req.body === 'object' && 'manifest' in req.body) {
    rawManifest = req.body.manifest;
    if (typeof rawManifest === 'string') {
      try {
        rawManifest = JSON.parse(rawManifest);
      } catch {
        sendErrorResponse(
          req,
          res,
          400,
          'MALFORMED_REQUEST',
          'Bad Request: Field "manifest" contains invalid JSON string.'
        );
        return;
      }
    }
  }

  // If file was provided in JSON body
  if (!fileResource && req.body && typeof req.body === 'object') {
    if (req.body.file && typeof req.body.file === 'object' && !Array.isArray(req.body.file)) {
      const f = req.body.file;
      fileResource = {
        fileName: f.fileName || f.file_name,
        fileType: f.fileType || f.file_type || f.contentType,
        fileSize: f.fileSize || f.file_size,
        data: f.data || f.content,
        filePath: f.filePath || f.file_path,
      };
    } else if (req.body.file_data || req.body.file_content) {
      fileResource = {
        fileName: req.body.file_name,
        fileType: req.body.file_type,
        fileSize: req.body.file_size,
        data: req.body.file_data || req.body.file_content,
        filePath: req.body.file_path,
      };
    }
  }

  // If body is clean manifest object (remove transport keys from manifest validation)
  if (rawManifest && typeof rawManifest === 'object' && !Array.isArray(rawManifest)) {
    const { file, files, file_data, file_content, ...cleanManifest } = rawManifest;
    rawManifest = cleanManifest;
  }

  // 4. Request Body Structure Validation
  if (!rawManifest || typeof rawManifest !== 'object' || Array.isArray(rawManifest) || Object.keys(rawManifest).length === 0) {
    sendErrorResponse(
      req,
      res,
      400,
      'MALFORMED_REQUEST',
      'Bad Request: Request body must be a non-empty JSON object containing a ContentManifest.'
    );
    return;
  }

  // 5. Version check (Part C): If manifest_version is provided, enforce "1.0"
  if (rawManifest.manifest_version !== undefined && rawManifest.manifest_version !== null) {
    if (rawManifest.manifest_version !== '1.0') {
      sendErrorResponse(
        req,
        res,
        400,
        'UNSUPPORTED_MANIFEST_VERSION',
        `Bad Request: Unsupported manifest_version "${rawManifest.manifest_version}". Only version "1.0" is supported.`
      );
      return;
    }
  }

  // 6. Manifest Schema Validation
  const validation = validateContentManifest(rawManifest);
  if (!validation.valid) {
    sendErrorResponse(
      req,
      res,
      400,
      'INVALID_MANIFEST',
      'Bad Request: ContentManifest validation failed.',
      { validationErrors: validation.errors }
    );
    return;
  }

  // 7. Resolve Server-Side Administrative Supabase Client
  const serverClient = getServerSupabaseClient();
  const isDryRun = req.query.dryRun === 'true';

  if (!serverClient && !isDryRun) {
    // Database credentials not present on server
    sendErrorResponse(
      req,
      res,
      503,
      'SERVICE_UNAVAILABLE',
      'Service Unavailable: Server-side database connection is not configured.'
    );
    return;
  }

  try {
    // 8. Delegate to Ingestion Service (passing validated manifest and optional file)
    const result = await ingestContent(rawManifest, {
      client: serverClient || undefined,
      fileResource: fileResource || undefined,
      dryRun: isDryRun,
    });

    // 9. Handle Duplicate Content Conflict (HTTP 409)
    if (!result.success && result.errors.some((e) => e.toLowerCase().includes('duplicate content error') || e.toLowerCase().includes('already exists'))) {
      const conflictMsg = 'Conflict: A publication with this slug already exists.';
      const isAutomationRequest =
        req.headers['x-api-version'] === '1.0' ||
        req.headers['x-client-type'] === 'automation' ||
        (rawManifest && rawManifest.manifest_version === '1.0');

      const conflictPayload = isAutomationRequest
        ? {
            success: false,
            error: {
              code: 'CONFLICT_DUPLICATE_SLUG',
              message: conflictMsg,
            },
            error_code: 'CONFLICT_DUPLICATE_SLUG',
            slug: result.slug,
          }
        : {
            success: false,
            error: conflictMsg,
            error_code: 'CONFLICT_DUPLICATE_SLUG',
            slug: result.slug,
          };

      if (idempotencyKey) {
        setCachedIdempotencyRecord(idempotencyKey, 409, conflictPayload);
      }

      res.status(409).json(conflictPayload);
      return;
    }

    // 10. Handle General Ingestion Failure (HTTP 400 or 500)
    if (!result.success) {
      const isInputIssue = result.errors.some((e) =>
        e.includes('cannot be empty') ||
        e.includes('Invalid') ||
        e.includes('Unsupported') ||
        e.includes('exceeds the maximum') ||
        e.includes('must not contain') ||
        e.includes('lacks a valid') ||
        e.includes('Malformed file data') ||
        e.includes('Missing file data') ||
        e.includes('Self-relationship')
      );

      sendErrorResponse(
        req,
        res,
        isInputIssue ? 400 : 500,
        isInputIssue ? 'INVALID_MANIFEST' : 'INTERNAL_SERVER_ERROR',
        isInputIssue ? 'Bad Request: Invalid content manifest or file resource.' : 'Content ingestion encountered an error.',
        { errors: result.errors }
      );
      return;
    }

    // 11. Standardized Successful Ingestion Response (HTTP 201) (Part F)
    const contentId = result.content?.id || (isDryRun ? 'dry-run-preview-id' : undefined);
    const slug = result.slug;
    const title = result.title || rawManifest.title;

    const fileInfo = (result.fileUploaded || result.filePath) ? {
      name: result.fileName || rawManifest.file_name || 'file',
      type: result.fileType || rawManifest.file_type || 'application/octet-stream',
      size: result.fileSize || rawManifest.file_size || 0,
      path: result.filePath || '',
    } : undefined;

    const responsePayload: Record<string, unknown> = {
      success: true,
      data: {
        content_id: contentId,
        slug,
        title,
        ...(fileInfo ? { file: fileInfo } : {}),
      },
      // Backward compatibility fields for existing test assertions
      contentId,
      id: contentId,
      slug,
      title,
      ...(result.fileUploaded || result.filePath ? {
        fileUploaded: true,
        fileName: result.fileName,
        fileType: result.fileType,
        fileSize: result.fileSize,
        storagePath: result.filePath,
        filePath: result.filePath,
      } : {}),
    };

    if (idempotencyKey) {
      setCachedIdempotencyRecord(idempotencyKey, 201, responsePayload);
    }

    res.status(201).json(responsePayload);
  } catch (err: any) {
    // Safe operational logging without secret exposure
    console.error('[ingestController] Ingestion error:', err?.message || 'Unknown error');

    sendErrorResponse(
      req,
      res,
      500,
      'INTERNAL_SERVER_ERROR',
      'Internal Server Error: Failed to complete content ingestion.'
    );
  }
}
