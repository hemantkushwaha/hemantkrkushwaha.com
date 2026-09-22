/**
 * Controlled Google Drive Ingestion Service Foundation
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Step 25 — Controlled Google Drive to Website Ingestion Foundation
 * 
 * Flow:
 * Google Drive Preview Manifest (Content Manifest v1.0)
 *       ↓
 * Google Drive Ingestion Service (Step 25 Foundation)
 *       ↓ (Strict validation + deterministic idempotency key + published=false safety)
 * Gateway HTTP POST (POST /api/automation/ingest with Bearer auth)
 *       ↓
 * Existing Content Ingestion Pipeline (contentIngestionService)
 *       ↓
 * Supabase Database + Storage
 * 
 * ARCHITECTURAL INVARIANTS:
 * 1. Single Ingestion Pipeline: Strictly submits to existing POST /api/automation/ingest.
 *    Does NOT import Supabase client.
 *    Does NOT perform direct database operations or queries.
 *    Does NOT upload to Storage buckets directly.
 * 2. User Taxonomy Supremacy: Section, category, topic, content_type, and title are authoritative.
 *    NEVER infers, alters, or uses AI to reclassify metadata.
 * 3. Content Integrity: Preserves verbatim markdown, plain text, and math notation.
 * 4. Source Provenance Preservation: Preserves source.system='google-drive', source.source_id,
 *    source.source_name, source.source_url, source.generated_at.
 * 5. Publishing Safety: Default manifests to published=false. Never publishes content during ingestion foundation.
 * 6. Explicit Confirmation Required: Ingestion will NOT proceed to network transmission without confirm=true.
 * 7. Dry-Run Mode: Validates, computes slug and deterministic idempotency key, reports what WOULD be ingested,
 *    and performs ZERO network/DB/Storage operations.
 * 8. Zero Secret Leaking: Never logs or returns CONTENT_INGESTION_API_KEY.
 * 9. Deterministic Idempotency Key: Uses SHA-256 over stable manifest attributes.
 * 10. Single Gateway Call: Exactly ONE authenticated request on confirm; NO automatic retry loops.
 */

import crypto from 'crypto';
import { AutomationManifest } from '../types/automation.js';
import { validateAutomationManifest } from './manifestService.js';
import { generateDeterministicSlug } from './contentIngestionService.js';
import {
  GoogleDriveIngestOptions,
  GoogleDriveIngestResult,
  SafeGoogleDriveIngestionMetadata,
} from '../types/googleDriveIngestion.js';

export * from '../types/googleDriveIngestion.js';

/**
 * Generates a deterministic Idempotency-Key for a Google Drive Content Manifest.
 * 
 * Rules:
 * - Uses SHA-256 over stable, canonical manifest attributes:
 *   system, source_id, section, category, topic, content_type, title, body content.
 * - Produces the identical key for identical documents and metadata.
 * - Produces distinct keys when document content or user taxonomy changes.
 * - Formatted as 'gdrive_<32-char-hex-digest>' (safe for HTTP headers).
 */
export function generateGoogleDriveIdempotencyKey(manifest: AutomationManifest): string {
  const hash = crypto.createHash('sha256');
  const stablePayload = JSON.stringify({
    system: manifest.source?.system || 'google-drive',
    source_id: manifest.source?.source_id ? String(manifest.source.source_id).trim() : '',
    section: manifest.section ? String(manifest.section).trim() : '',
    category: manifest.category ? String(manifest.category).trim() : '',
    topic: manifest.topic ? String(manifest.topic).trim() : '',
    content_type: manifest.content_type ? String(manifest.content_type).trim() : '',
    title: manifest.title ? String(manifest.title).trim() : '',
    body: (manifest.body || (manifest as any).content?.body || '').trim(),
  });

  hash.update(stablePayload, 'utf8');
  return `gdrive_${hash.digest('hex').substring(0, 32)}`;
}

/**
 * Extracts a safe metadata summary guaranteed to contain zero credentials, tokens, or private buffers.
 */
export function extractSafeGoogleDriveMetadata(
  manifest: AutomationManifest,
  idempotencyKey: string
): SafeGoogleDriveIngestionMetadata {
  const rawBody = manifest.body || (manifest as any).content?.body || '';
  return {
    title: String(manifest.title || ''),
    section: String(manifest.section || ''),
    category: String(manifest.category || ''),
    topic: String(manifest.topic || ''),
    contentType: String(manifest.content_type || ''),
    tags: Array.isArray(manifest.tags) ? [...manifest.tags] : [],
    sourceSystem: manifest.source?.system || 'google-drive',
    sourceId: manifest.source?.source_id,
    sourceUrl: manifest.source?.source_url,
    sourceName: manifest.source?.source_name,
    generatedAt: manifest.source?.generated_at,
    idempotencyKey,
    calculatedSlug: generateDeterministicSlug(manifest.title || ''),
    manifestVersion: manifest.manifest_version || '1.0',
    published: Boolean(manifest.published),
    contentLength: typeof rawBody === 'string' ? rawBody.length : 0,
  };
}

/**
 * Executes controlled Google Drive preview manifest ingestion.
 * 
 * Supports:
 * - dryRun mode (zero network/database/storage mutations)
 * - confirm mode (requires explicit confirm=true)
 * - deterministic idempotency key computation
 * - publishing safety (forces published=false)
 * - single gateway call with no retries
 */
export async function runGoogleDriveIngestion(
  options: GoogleDriveIngestOptions
): Promise<GoogleDriveIngestResult> {
  const logger = options.logger || {
    log: (msg: string) => console.log(msg),
    warn: (msg: string) => console.warn(msg),
    error: (msg: string) => console.error(msg),
  };

  const rawManifest = options.manifest;

  // 1. Structural check
  if (!rawManifest || typeof rawManifest !== 'object' || Array.isArray(rawManifest)) {
    const errorMsg = 'Invalid manifest: Manifest must be a non-null JSON object.';
    logger.error(`[Google Drive Ingestion] ${errorMsg}`);
    return {
      success: false,
      dryRun: Boolean(options.dryRun),
      error: {
        code: 'INVALID_MANIFEST',
        message: errorMsg,
      },
    };
  }

  // 2. Deep clone manifest to prevent caller object pollution
  const manifest: AutomationManifest = JSON.parse(JSON.stringify(rawManifest));

  // 3. Publishing safety invariant: Ensure published is strictly false
  manifest.published = false;

  // 4. Validate manifest against canonical platform validation rules
  const validation = validateAutomationManifest(manifest);
  if (!validation.valid) {
    const primaryError = validation.errors[0] || 'Manifest validation failed.';
    const errorCode = validation.errorCode || 'INVALID_MANIFEST';
    logger.error(`[Google Drive Ingestion] ${errorCode}: ${primaryError}`);
    return {
      success: false,
      dryRun: Boolean(options.dryRun),
      error: {
        code: errorCode,
        message: primaryError,
        details: validation.errors,
      },
    };
  }

  // 5. Generate deterministic idempotency key and safe metadata
  const idempotencyKey = generateGoogleDriveIdempotencyKey(manifest);
  const safeMetadata = extractSafeGoogleDriveMetadata(manifest, idempotencyKey);

  // 6. DRY-RUN MODE: Zero HTTP calls, zero DB operations, zero Storage operations
  if (options.dryRun) {
    logger.log('================================================================');
    logger.log('🔍 GOOGLE DRIVE INGESTION DRY-RUN (ZERO MUTATIONS)');
    logger.log('================================================================');
    logger.log(`Title:           ${safeMetadata.title}`);
    logger.log(`Section:         ${safeMetadata.section}`);
    logger.log(`Category:        ${safeMetadata.category}`);
    logger.log(`Topic:           ${safeMetadata.topic}`);
    logger.log(`Content Type:    ${safeMetadata.contentType}`);
    logger.log(`Source System:   ${safeMetadata.sourceSystem}`);
    logger.log(`Source ID:       ${safeMetadata.sourceId || '(none)'}`);
    logger.log(`Calculated Slug: ${safeMetadata.calculatedSlug}`);
    logger.log(`Idempotency-Key: ${idempotencyKey}`);
    logger.log(`Published:       ${safeMetadata.published} (Strict Safety Enforced)`);
    logger.log(`Content Length:  ${safeMetadata.contentLength} characters`);
    logger.log('================================================================');
    logger.log('Dry-run complete. Zero HTTP calls, zero database writes, zero storage uploads.');

    return {
      success: true,
      dryRun: true,
      metadata: safeMetadata,
      manifest,
    };
  }

  // 7. CONFIRMATION BOUNDARY: Explicit confirmation required before network transmission
  if (!options.confirm) {
    const notice =
      'Explicit confirmation required to submit Google Drive manifest to the Gateway. Pass "confirm: true" or CLI flag "--confirm".';
    logger.warn(`⚠️  ${notice}`);
    return {
      success: false,
      dryRun: false,
      confirmationRequired: true,
      metadata: safeMetadata,
      manifest,
      error: {
        code: 'CONFIRMATION_REQUIRED',
        message: notice,
      },
    };
  }

  // 8. PRODUCTION SUBMISSION PREPARATION
  const rawBaseUrl = options.baseUrl !== undefined ? options.baseUrl : process.env.CONTENT_INGESTION_BASE_URL;
  if (!rawBaseUrl || rawBaseUrl.trim().length === 0) {
    const errorMsg =
      'Missing required environment variable: CONTENT_INGESTION_BASE_URL. Please set CONTENT_INGESTION_BASE_URL (e.g. https://hemantkrkushwaha.com).';
    logger.error(`[Google Drive Ingestion] ${errorMsg}`);
    return {
      success: false,
      dryRun: false,
      error: {
        code: 'MISSING_CONFIG_BASE_URL',
        message: errorMsg,
      },
    };
  }

  const rawApiKey = options.apiKey !== undefined ? options.apiKey : process.env.CONTENT_INGESTION_API_KEY;
  if (!rawApiKey || rawApiKey.trim().length === 0) {
    const errorMsg =
      'Missing required environment variable: CONTENT_INGESTION_API_KEY. Please configure CONTENT_INGESTION_API_KEY in server environment.';
    logger.error(`[Google Drive Ingestion] ${errorMsg}`);
    return {
      success: false,
      dryRun: false,
      error: {
        code: 'MISSING_CONFIG_API_KEY',
        message: errorMsg,
      },
    };
  }

  const baseUrl = rawBaseUrl.trim().replace(/\/+$/, '');
  const targetEndpoint = `${baseUrl}/api/automation/ingest`;

  // 9. Execute exactly ONE authenticated POST request (NO automatic retries)
  const fetchClient = options.fetchFn || globalThis.fetch;
  if (typeof fetchClient !== 'function') {
    const errorMsg = 'Global fetch function is not available in current runtime.';
    logger.error(`[Google Drive Ingestion] ${errorMsg}`);
    return {
      success: false,
      dryRun: false,
      error: {
        code: 'RUNTIME_ERROR',
        message: errorMsg,
      },
    };
  }

  logger.log(`🚀 Submitting Google Drive manifest to gateway: ${targetEndpoint}`);
  logger.log(`🔑 Idempotency-Key: ${idempotencyKey}`);

  let response: Response;
  try {
    const jsonPayload = {
      manifest,
      source: manifest.source,
    };

    response = await fetchClient(targetEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${rawApiKey.trim()}`,
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(jsonPayload),
    });
  } catch (networkErr: any) {
    const safeErrorMsg = `Network error: Failed to reach gateway at ${baseUrl}: ${networkErr?.message || 'Connection failed'}`;
    logger.error(`[Google Drive Ingestion] ${safeErrorMsg}`);
    return {
      success: false,
      dryRun: false,
      error: {
        code: 'NETWORK_FAILURE',
        message: safeErrorMsg,
      },
    };
  }

  // 10. Parse gateway response safely
  let responseData: any = null;
  try {
    const textBody = await response.text();
    responseData = textBody ? JSON.parse(textBody) : null;
  } catch {
    // Non-JSON response
  }

  const httpStatus = response.status;
  if (response.ok && (httpStatus === 200 || httpStatus === 201)) {
    const data = responseData?.data || responseData;
    const contentId = data?.content_id || data?.contentId || data?.id;
    const slug = data?.slug || safeMetadata.calculatedSlug;
    const title = data?.title || manifest.title;

    logger.log('================================================================');
    logger.log('🎉 GOOGLE DRIVE INGESTION SUCCESSFUL');
    logger.log('================================================================');
    logger.log(`Title:        ${title}`);
    logger.log(`Slug:         ${slug}`);
    if (contentId) {
      logger.log(`Content ID:   ${contentId}`);
    }
    logger.log('================================================================');

    return {
      success: true,
      dryRun: false,
      httpStatus,
      metadata: safeMetadata,
      manifest,
      data: {
        contentId,
        slug,
        title,
        fileUploaded: data?.fileUploaded,
        storagePath: data?.storagePath,
      },
    };
  }

  // Handle errors deterministically based on HTTP status
  let errorCode = responseData?.error?.code || responseData?.error_code || 'INGESTION_FAILED';
  let errorMessage =
    responseData?.error?.message ||
    (typeof responseData?.error === 'string' ? responseData.error : undefined) ||
    `Gateway request failed with HTTP ${httpStatus}.`;

  if (httpStatus === 401) {
    errorCode = 'UNAUTHORIZED';
    errorMessage = 'Authentication failed (HTTP 401). Verify that CONTENT_INGESTION_API_KEY is configured correctly.';
  } else if (httpStatus === 409) {
    errorCode = 'CONFLICT_DUPLICATE_SLUG';
    errorMessage = `Conflict (HTTP 409): Content with slug "${responseData?.slug || safeMetadata.calculatedSlug}" already exists.`;
  } else if (httpStatus === 413) {
    errorCode = 'PAYLOAD_TOO_LARGE';
    errorMessage = 'Payload Too Large (HTTP 413): Manifest payload exceeds gateway limit.';
  }

  logger.error(`[Google Drive Ingestion Error ${httpStatus}] (${errorCode}): ${errorMessage}`);
  return {
    success: false,
    dryRun: false,
    httpStatus,
    error: {
      code: errorCode,
      message: errorMessage,
      details: responseData?.error_details || responseData?.errors,
    },
  };
}
