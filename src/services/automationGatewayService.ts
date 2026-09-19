/**
 * External Automation Gateway Service
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Step 16 — External Automation Gateway Foundation
 * 
 * Architectural Role:
 * Provider-neutral gateway through which future external automation systems
 * (NotebookLM, Google Slides, Google AI Studio, Google Drive, Manual) can submit
 * Content Manifest v1.0 to the existing content ingestion pipeline.
 * 
 * Pipeline Topology:
 * External Automation Systems
 *             │
 *             ▼
 *   Automation Gateway (Step 16)
 *             │
 *             ▼
 *      Manifest v1.0
 *             │
 *             ▼
 *    Existing ingestContent(...) (Step 9/10/11/13)
 *             │
 *             ▼
 *     Supabase + Storage
 *             │
 *             ▼
 *         Website
 * 
 * Architectural Invariants:
 * 1. Single Ingestion Pipeline: Delegates strictly to ingestContent(). Does NOT create
 *    a secondary database or storage implementation.
 * 2. User Taxonomy Authority: Gateway NEVER infers or alters section, category, topic,
 *    content_type, or title. Zero AI reclassification.
 * 3. Zero Secret Leaks: Never accepts, handles, or exposes client-side secrets. Never logs
 *    sensitive API keys, authorization headers, or database credentials.
 * 4. Idempotency Preservation: Integrates with the existing Step 14 idempotency caching
 *    mechanism to prevent duplicate external executions.
 * 5. Zero External Network Calls: Gateway does NOT call Google APIs, NotebookLM, or external webhooks.
 */

import {
  AutomationGatewayRequest,
  AutomationGatewayResult,
  AutomationGatewayAuditContext,
  AutomationGatewayOptions,
  AutomationManifest,
  AutomationSourceMetadata,
  SUPPORTED_SOURCE_SYSTEMS,
  AutomationErrorCode,
  AutomationErrorDetail,
  AutomationResponseData,
} from '../types/automation.js';
import {
  validateAutomationManifest,
  validateSourceMetadata,
} from './manifestService.js';
import {
  ingestContent,
  IngestionOptions,
  IngestionResult,
} from './contentIngestionService.js';
import {
  getCachedIdempotencyRecord,
  setCachedIdempotencyRecord,
} from '../server/controllers/ingestController.js';

export * from '../types/automation.js';

/**
 * Maximum permitted payload file size (50MB) matching platform storage boundary.
 */
export const MAX_GATEWAY_FILE_SIZE = 50 * 1024 * 1024;

/**
 * Creates a safe, non-sensitive audit context for internal logging and execution telemetry (Part I).
 * Strictly omits: API keys, database credentials, authorization headers, passwords, and file contents.
 */
export function createSafeAuditContext(
  request: AutomationGatewayRequest
): AutomationGatewayAuditContext {
  const manifest = request?.manifest;
  const source = request?.source || (manifest as any)?.source;
  const hasFile = Boolean(
    request?.file ||
    request?.fileResource ||
    (manifest as any)?.file_name ||
    (manifest as any)?.file_data
  );

  return {
    source_system: source?.system,
    source_id: source?.source_id,
    idempotency_key_present: Boolean(request?.idempotencyKey),
    has_file: hasFile,
    section: manifest?.section,
    category: manifest?.category,
    topic: manifest?.topic,
    content_type: manifest?.content_type,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Formats a standardized error response adhering to Part H & J.
 */
function buildGatewayError(
  code: AutomationErrorCode | string,
  message: string,
  auditContext: AutomationGatewayAuditContext,
  errors: string[] = [],
  slug?: string
): AutomationGatewayResult {
  const errorDetail: AutomationErrorDetail = { code, message };
  return {
    success: false,
    error: errorDetail,
    error_details: errorDetail,
    errors: errors.length > 0 ? errors : [message],
    slug,
    auditContext,
  };
}

/**
 * Core Automation Gateway Processor
 * 
 * Orchestrates incoming provider-neutral requests:
 * 1. Sanitizes audit context (zero secret leakage)
 * 2. Checks and enforces request-level idempotency
 * 3. Validates request structure and ContentManifest v1.0
 * 4. Preserves user taxonomy verbatim (zero AI inference)
 * 5. Enforces payload and file boundaries (<= 50MB)
 * 6. Delegates to existing ingestContent(...)
 * 7. Formats standard response envelope
 */
export async function processAutomationGatewayRequest(
  request: AutomationGatewayRequest,
  options: AutomationGatewayOptions = {}
): Promise<AutomationGatewayResult> {
  const auditContext = createSafeAuditContext(request);

  // 1. Validate request shape
  if (!request || typeof request !== 'object' || Array.isArray(request)) {
    return buildGatewayError(
      'MALFORMED_REQUEST',
      'Bad Request: Request must be a non-empty object containing a valid manifest.',
      auditContext
    );
  }

  // 2. Check Idempotency-Key if present (Part F)
  const idempotencyKey = request.idempotencyKey?.trim();
  if (idempotencyKey) {
    if (idempotencyKey.length === 0 || idempotencyKey.length > 128) {
      return buildGatewayError(
        'MALFORMED_REQUEST',
        'Bad Request: Idempotency key must be between 1 and 128 characters.',
        auditContext
      );
    }

    const cached = getCachedIdempotencyRecord(idempotencyKey);
    if (cached) {
      // Replay identical response from in-memory cache
      return {
        ...cached.body,
        auditContext,
      };
    }
  }

  // 3. Validate Manifest existence (Part C & M: test 8)
  if (!request.manifest || typeof request.manifest !== 'object' || Array.isArray(request.manifest)) {
    return buildGatewayError(
      'MISSING_REQUIRED_FIELD',
      'Missing required field: "manifest".',
      auditContext,
      ['Field "manifest" is required and must be a valid ContentManifest object.']
    );
  }

  // Clone manifest to prevent accidental caller object mutation
  const manifest: AutomationManifest = {
    ...(request.manifest as AutomationManifest),
  };

  // 4. Source Metadata Extraction & Validation (Part C & M: test 2-7, 17)
  const sourceMetadata: AutomationSourceMetadata | undefined =
    request.source || manifest.source;

  if (sourceMetadata) {
    const sourceValidation = validateSourceMetadata(sourceMetadata);
    if (!sourceValidation.valid) {
      return buildGatewayError(
        'INVALID_SOURCE_METADATA',
        'Invalid source metadata.',
        auditContext,
        sourceValidation.errors
      );
    }
    // Attach validated source metadata to manifest
    manifest.source = sourceMetadata;
  }

  // 5. Version check and Manifest validation (Part A & M: test 1, 9-16)
  if (manifest.manifest_version !== undefined && manifest.manifest_version !== null) {
    if (manifest.manifest_version !== '1.0') {
      return buildGatewayError(
        'UNSUPPORTED_MANIFEST_VERSION',
        `Unsupported manifest_version "${manifest.manifest_version}". Only version "1.0" is currently supported.`,
        auditContext,
        [`manifest_version "${manifest.manifest_version}" is not supported.`]
      );
    }
  } else {
    // If not supplied, enforce 1.0 standard for automation gateway
    manifest.manifest_version = '1.0';
  }

  const manifestValidation = validateAutomationManifest(manifest);
  if (!manifestValidation.valid) {
    return buildGatewayError(
      manifestValidation.errorCode || 'INVALID_MANIFEST',
      'Invalid ContentManifest: manifest validation failed.',
      auditContext,
      manifestValidation.errors
    );
  }

  // 6. User Taxonomy Preservation Authority (Part D)
  // Non-negotiable invariant: section, category, topic, content_type, and title
  // are strictly preserved from the caller. Zero AI inference or override.

  // 7. Resolve File Resource and Enforce Payload Boundaries (Part G & M: test 27)
  let resolvedFileResource: IngestionOptions['fileResource'] | undefined;
  const rawFile = request.fileResource || request.file;

  if (rawFile) {
    const fileName = (rawFile as any).fileName || (rawFile as any).file_name || manifest.file_name;
    const fileType = (rawFile as any).fileType || (rawFile as any).file_type || manifest.file_type;
    const fileSize = (rawFile as any).fileSize || (rawFile as any).file_size || manifest.file_size;
    const fileData = (rawFile as any).data || (rawFile as any).file_data || (manifest as any).file_data;
    const filePath = (rawFile as any).filePath || (rawFile as any).file_path;

    if (fileSize !== undefined && fileSize > MAX_GATEWAY_FILE_SIZE) {
      return buildGatewayError(
        'PAYLOAD_TOO_LARGE',
        `File size (${fileSize} bytes) exceeds the maximum permitted limit of 50MB.`,
        auditContext,
        ['File payload too large.']
      );
    }

    if (fileName && fileData) {
      resolvedFileResource = {
        fileName,
        fileType,
        fileSize,
        data: fileData,
        filePath,
      };
    }
  }

  // 8. Single Pipeline Delegation to existing ingestContent(...) (Part B & M: test 18)
  try {
    const ingestionOptions: IngestionOptions = {
      client: options.client,
      dryRun: request.dryRun,
      fileResource: resolvedFileResource,
      storageService: options.storageService,
    };

    const ingestionResult: IngestionResult = await ingestContent(manifest, ingestionOptions);

    // 9. Handle Duplicate Slug Conflict (Part H)
    if (
      !ingestionResult.success &&
      ingestionResult.errors.some((e) =>
        e.toLowerCase().includes('duplicate content error') ||
        e.toLowerCase().includes('already exists')
      )
    ) {
      const conflictResult = buildGatewayError(
        'CONFLICT_DUPLICATE_SLUG',
        'Conflict: A publication with this slug already exists.',
        auditContext,
        ingestionResult.errors,
        ingestionResult.slug || undefined
      );

      if (idempotencyKey) {
        setCachedIdempotencyRecord(idempotencyKey, 409, conflictResult);
      }

      return conflictResult;
    }

    // 10. Handle General Ingestion Failure
    if (!ingestionResult.success) {
      const isInputIssue = ingestionResult.errors.some((e) =>
        e.includes('cannot be empty') ||
        e.includes('Invalid') ||
        e.includes('Unsupported') ||
        e.includes('exceeds the maximum') ||
        e.includes('must not contain') ||
        e.includes('lacks a valid') ||
        e.includes('Malformed file data') ||
        e.includes('Missing file data')
      );

      const errorCode: AutomationErrorCode = isInputIssue ? 'INVALID_MANIFEST' : 'INTERNAL_SERVER_ERROR';
      const failResult = buildGatewayError(
        errorCode,
        isInputIssue
          ? 'Bad Request: Content manifest or file validation failed.'
          : 'Content ingestion encountered an internal processing error.',
        auditContext,
        ingestionResult.errors
      );

      return failResult;
    }

    // 11. Build Standardized Success Response (Part H)
    const contentId =
      ingestionResult.content?.id || (request.dryRun ? 'dry-run-preview-id' : undefined);
    const slug = ingestionResult.slug!;
    const title = ingestionResult.title || manifest.title;

    const fileResponse =
      ingestionResult.fileUploaded || ingestionResult.filePath
        ? {
            name: ingestionResult.fileName || manifest.file_name || 'file',
            type: ingestionResult.fileType || manifest.file_type || 'application/octet-stream',
            size: ingestionResult.fileSize || manifest.file_size || 0,
            path: ingestionResult.filePath || '',
          }
        : undefined;

    const responseData: AutomationResponseData = {
      content_id: contentId,
      slug,
      title,
      ...(fileResponse ? { file: fileResponse } : {}),
    };

    const successResult: AutomationGatewayResult = {
      success: true,
      data: responseData,
      slug,
      auditContext,
    };

    // Cache successful execution for idempotency if key was provided
    if (idempotencyKey) {
      setCachedIdempotencyRecord(idempotencyKey, 201, successResult);
    }

    return successResult;
  } catch (err: any) {
    // Safe operational logging with zero secret leakage
    console.error('[automationGateway] Gateway delegation error:', err?.message || 'Unknown error');

    return buildGatewayError(
      'INTERNAL_SERVER_ERROR',
      'Internal Server Error: Failed to complete automation gateway processing.',
      auditContext,
      [err?.message || 'Unknown processing error']
    );
  }
}
