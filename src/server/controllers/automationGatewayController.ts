/**
 * External Automation Gateway Controller
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Step 16 — External Automation Gateway Foundation
 * 
 * Flow:
 * POST /api/automation/ingest -> authenticateIngestionRequest -> parseMultipartIngestion -> handleAutomationGatewayIngest -> processAutomationGatewayRequest
 * 
 * Responsibilities:
 * - Pure boundary/controller: extracts request payload, headers, idempotency key.
 * - Enforces zero direct database access (delegates strictly to automationGatewayService).
 * - Maps gateway result to appropriate HTTP status code (201, 400, 409, 413, 500).
 * - Guarantees zero secret leakage in all responses and logs.
 */

import { Request, Response } from 'express';
import { IngestionRequest } from '../middleware/multipartMiddleware.js';
import { getServerSupabaseClient } from '../lib/supabaseServer.js';
import { processAutomationGatewayRequest } from '../../services/automationGatewayService.js';
import { AutomationErrorCode, AutomationGatewayRequest } from '../../types/automation.js';

export async function handleAutomationGatewayIngest(req: Request, res: Response): Promise<void> {
  const ingReq = req as IngestionRequest;

  // 1. Extract Idempotency-Key header (Part F)
  const rawIdempotencyKey = req.headers?.['idempotency-key'];
  const idempotencyKey = typeof rawIdempotencyKey === 'string' ? rawIdempotencyKey.trim() : undefined;

  // 2. Reject multiple files (single file boundary)
  if (
    ingReq.multipleFilesDetected ||
    (Array.isArray(req.body?.files) && req.body.files.length > 1) ||
    (Array.isArray(req.body?.file) && req.body.file.length > 1)
  ) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_MANIFEST',
        message: 'Bad Request: Only one file may be uploaded per automation ingestion request.',
      },
      error_code: 'INVALID_MANIFEST',
    });
    return;
  }

  // 3. Extract manifest, source metadata, and file resource
  let rawManifest: any = req.body?.manifest || req.body;
  let rawSource: any = req.body?.source || undefined;

  if (typeof rawManifest === 'string') {
    try {
      rawManifest = JSON.parse(rawManifest);
    } catch {
      res.status(400).json({
        success: false,
        error: {
          code: 'MALFORMED_REQUEST',
          message: 'Bad Request: Field "manifest" contains invalid JSON string.',
        },
        error_code: 'MALFORMED_REQUEST',
      });
      return;
    }
  }

  // Strip transport fields from manifest if passed in root
  if (rawManifest && typeof rawManifest === 'object' && !Array.isArray(rawManifest)) {
    const { file, files, file_data, file_content, source, ...cleanManifest } = rawManifest;
    if (source && !rawSource) {
      rawSource = source;
    }
    rawManifest = cleanManifest;
  }

  let fileResource: any = ingReq.fileResource || undefined;
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

  // 4. Resolve Server-Side Administrative Supabase Client
  const serverClient = getServerSupabaseClient();
  const isDryRun = req.query.dryRun === 'true';

  if (!serverClient && !isDryRun) {
    res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Service Unavailable: Server-side database connection is not configured.',
      },
      error_code: 'SERVICE_UNAVAILABLE',
    });
    return;
  }

  // 5. Construct AutomationGatewayRequest
  const gatewayRequest: AutomationGatewayRequest = {
    manifest: rawManifest,
    source: rawSource,
    fileResource,
    idempotencyKey,
    dryRun: isDryRun,
  };

  // 6. Delegate to pure service
  const result = await processAutomationGatewayRequest(gatewayRequest, {
    client: serverClient || undefined,
  });

  // 7. Map to HTTP status codes
  if (result.success) {
    res.status(201).json({
      success: true,
      data: result.data,
      slug: result.slug,
    });
    return;
  }

  const errorCode = (result.error?.code || 'INTERNAL_SERVER_ERROR') as AutomationErrorCode;
  let statusCode = 400;

  if (errorCode === 'CONFLICT_DUPLICATE_SLUG') {
    statusCode = 409;
  } else if (errorCode === 'PAYLOAD_TOO_LARGE') {
    statusCode = 413;
  } else if (errorCode === 'UNSUPPORTED_MEDIA_TYPE') {
    statusCode = 415;
  } else if (errorCode === 'INTERNAL_SERVER_ERROR') {
    statusCode = 500;
  }

  res.status(statusCode).json({
    success: false,
    error: result.error,
    error_details: result.error_details,
    error_code: errorCode,
    errors: result.errors,
    slug: result.slug,
  });
}
