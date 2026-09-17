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

export async function handleContentIngestion(req: Request, res: Response): Promise<void> {
  // 1. Request Body Structure Validation
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body) || Object.keys(req.body).length === 0) {
    res.status(400).json({
      success: false,
      error: 'Bad Request: Request body must be a non-empty JSON object containing a ContentManifest.',
    });
    return;
  }

  // 2. Manifest Schema Validation
  const validation = validateContentManifest(req.body);
  if (!validation.valid) {
    res.status(400).json({
      success: false,
      error: 'Bad Request: ContentManifest validation failed.',
      validationErrors: validation.errors,
    });
    return;
  }

  // 3. Resolve Server-Side Administrative Supabase Client
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
    // 4. Delegate to Ingestion Service
    const result = await ingestContent(req.body, {
      client: serverClient || undefined,
      dryRun: isDryRun,
    });

    // 5. Handle Duplicate Content Conflict (HTTP 409)
    if (!result.success && result.errors.some((e) => e.toLowerCase().includes('duplicate content error') || e.toLowerCase().includes('already exists'))) {
      res.status(409).json({
        success: false,
        error: 'Conflict: A publication with this slug already exists.',
        slug: result.slug,
      });
      return;
    }

    // 6. Handle General Ingestion Failure (HTTP 400 or 500)
    if (!result.success) {
      // Determine if failure was due to bad input or system error
      const isInputIssue = result.errors.some((e) =>
        e.includes('cannot be empty') || e.includes('Invalid') || e.includes('Self-relationship')
      );

      res.status(isInputIssue ? 400 : 500).json({
        success: false,
        error: isInputIssue ? 'Bad Request: Invalid content manifest payload.' : 'Content ingestion encountered an error.',
        errors: result.errors,
      });
      return;
    }

    // 7. Successful Ingestion Response (HTTP 201)
    res.status(201).json({
      success: true,
      contentId: result.content?.id || (isDryRun ? 'dry-run-preview-id' : undefined),
      slug: result.slug,
    });
  } catch (err: any) {
    // Safe operational logging without secret exposure
    console.error('[ingestController] Ingestion error:', err?.message || 'Unknown error');

    res.status(500).json({
      success: false,
      error: 'Internal Server Error: Failed to complete content ingestion.',
    });
  }
}
