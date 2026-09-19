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
import { ingestContent } from '../../services/contentIngestionService';
import { validateContentManifest } from '../../services/manifestService';
import { getServerSupabaseClient } from '../lib/supabaseServer';
import { IngestionRequest } from '../middleware/multipartMiddleware';

export async function handleContentIngestion(req: Request, res: Response): Promise<void> {
  const ingReq = req as IngestionRequest;

  // 1. Single-file enforcement check (Step 13 only permits manifest-only or manifest + 1 file)
  if (
    ingReq.multipleFilesDetected ||
    (Array.isArray(req.body?.files) && req.body.files.length > 1) ||
    (Array.isArray(req.body?.file) && req.body.file.length > 1)
  ) {
    res.status(400).json({
      success: false,
      error: 'Bad Request: Multiple files are not supported in Step 13. Only one file may be uploaded per ingestion request.',
    });
    return;
  }

  // 2. Extract Manifest and File Resource
  let rawManifest: any = req.body;
  let fileResource: any = ingReq.fileResource || null;

  // If manifest was provided under 'manifest' key (JSON payload or multipart field)
  if (req.body && typeof req.body === 'object' && 'manifest' in req.body) {
    rawManifest = req.body.manifest;
    if (typeof rawManifest === 'string') {
      try {
        rawManifest = JSON.parse(rawManifest);
      } catch {
        res.status(400).json({
          success: false,
          error: 'Bad Request: Field "manifest" contains invalid JSON string.',
        });
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

  // 3. Request Body Structure Validation
  if (!rawManifest || typeof rawManifest !== 'object' || Array.isArray(rawManifest) || Object.keys(rawManifest).length === 0) {
    res.status(400).json({
      success: false,
      error: 'Bad Request: Request body must be a non-empty JSON object containing a ContentManifest.',
    });
    return;
  }

  // 4. Manifest Schema Validation
  const validation = validateContentManifest(rawManifest);
  if (!validation.valid) {
    res.status(400).json({
      success: false,
      error: 'Bad Request: ContentManifest validation failed.',
      validationErrors: validation.errors,
    });
    return;
  }

  // 5. Resolve Server-Side Administrative Supabase Client
  const serverClient = getServerSupabaseClient();
  const isDryRun = req.query.dryRun === 'true';

  if (!serverClient && !isDryRun) {
    // Database credentials not present on server
    res.status(503).json({
      success: false,
      error: 'Service Unavailable: Server-side database connection is not configured.',
    });
    return;
  }

  try {
    // 6. Delegate to Ingestion Service (passing validated manifest and optional file)
    const result = await ingestContent(rawManifest, {
      client: serverClient || undefined,
      fileResource: fileResource || undefined,
      dryRun: isDryRun,
    });

    // 7. Handle Duplicate Content Conflict (HTTP 409)
    if (!result.success && result.errors.some((e) => e.toLowerCase().includes('duplicate content error') || e.toLowerCase().includes('already exists'))) {
      res.status(409).json({
        success: false,
        error: 'Conflict: A publication with this slug already exists.',
        slug: result.slug,
      });
      return;
    }

    // 8. Handle General Ingestion Failure (HTTP 400 or 500)
    if (!result.success) {
      // Determine if failure was due to input/file validation or system error
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

      res.status(isInputIssue ? 400 : 500).json({
        success: false,
        error: isInputIssue ? 'Bad Request: Invalid content manifest or file resource.' : 'Content ingestion encountered an error.',
        errors: result.errors,
      });
      return;
    }

    // 9. Successful Ingestion Response (HTTP 201)
    // Structured according to Part G requirements
    const responsePayload: Record<string, unknown> = {
      success: true,
      contentId: result.content?.id || (isDryRun ? 'dry-run-preview-id' : undefined),
      id: result.content?.id || (isDryRun ? 'dry-run-preview-id' : undefined),
      slug: result.slug,
      title: result.title || rawManifest.title,
    };

    // If a file accompanied the ingestion, additionally return file metadata and storage reference
    if (result.fileUploaded || result.filePath) {
      responsePayload.fileUploaded = true;
      responsePayload.fileName = result.fileName;
      responsePayload.fileType = result.fileType;
      responsePayload.fileSize = result.fileSize;
      responsePayload.storagePath = result.filePath;
      responsePayload.filePath = result.filePath;
    }

    res.status(201).json(responsePayload);
  } catch (err: any) {
    // Safe operational logging without secret exposure
    console.error('[ingestController] Ingestion error:', err?.message || 'Unknown error');

    res.status(500).json({
      success: false,
      error: 'Internal Server Error: Failed to complete content ingestion.',
    });
  }
}
