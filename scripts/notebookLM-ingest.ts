/**
 * Controlled NotebookLM Export Ingestion Runner
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Step 19 — Controlled NotebookLM Export Ingestion Runner
 * 
 * Execution Topology:
 * NotebookLM
 *     ↓ (Manual user export/copy)
 * NotebookLM Export Package v1.0 (Local JSON)
 *     ↓
 * Step 19 Runner (scripts/notebookLM-ingest.ts)
 *     ↓ (Validates package + reuses NotebookLMAdapter)
 * Content Manifest v1.0
 *     ↓ (HTTP POST with Idempotency-Key & Bearer token)
 * Authenticated Automation Gateway (POST /api/automation/ingest)
 *     ↓
 * Existing Content Ingestion Pipeline
 *     ↓
 * Supabase PostgreSQL + Private Storage
 * 
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * 1. Zero Direct Database Access: Never imports Supabase client libraries, never queries database.
 * 2. Zero Direct Storage Access: Never imports storage service, never uploads directly to buckets.
 * 3. Zero Browser Automation: No Puppeteer, Playwright, scraping, session hijacking, or cookies.
 * 4. Zero Secret Leakage: Never logs, prints, or exposes CONTENT_INGESTION_API_KEY.
 * 5. Production Safety: Requires explicit --confirm flag to execute HTTP request. No retry loops.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import {
  NotebookLMExportPackage,
  NotebookLMExportPackageValidationResult,
  NOTEBOOKLM_PACKAGE_VERSION,
} from '../src/types/notebookLMExportPackage.js';
import {
  parseNotebookLMExportPackage,
  convertNotebookLMExportPackageToManifest,
  validateNotebookLMExportPackage,
  MAX_PACKAGE_FILE_SIZE_BYTES,
  NotebookLMExportPackageError,
} from '../src/services/notebookLMExportPackageService.js';
import { AutomationManifest } from '../src/types/automation.js';

/**
 * Safe metadata representation for console/dry-run display.
 * Strictly free of secrets, credentials, or private buffers.
 */
export interface SafePackageMetadata {
  title: string;
  section: string;
  category: string;
  topic: string;
  contentType: string;
  tags?: string[];
  sourceSystem: string;
  sourceId?: string;
  sourceUrl?: string;
  generatedAt?: string;
  idempotencyKey: string;
  hasFile: boolean;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  manifestVersion: string;
}

/**
 * Configuration options passed to the ingestion runner.
 */
export interface NotebookLMIngestOptions {
  packagePath: string;
  dryRun?: boolean;
  confirm?: boolean;
  baseUrl?: string;
  apiKey?: string;
  fetchFn?: typeof fetch;
  logger?: {
    log: (msg: string) => void;
    warn: (msg: string) => void;
    error: (msg: string) => void;
  };
}

/**
 * Standardized execution result returned by the runner.
 */
export interface NotebookLMIngestResult {
  success: boolean;
  dryRun: boolean;
  confirmationRequired?: boolean;
  metadata?: SafePackageMetadata;
  manifest?: AutomationManifest;
  data?: {
    contentId?: string;
    slug: string;
    title: string;
    fileUploaded?: boolean;
    storagePath?: string;
  };
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  httpStatus?: number;
}

/**
 * Generates a deterministic Idempotency-Key for a NotebookLM Export Package.
 * 
 * Rules:
 * - Uses SHA-256 over stable, canonical fields:
 *   source system, source ID, section, category, topic, content_type, title,
 *   content body, and file name/size (if present).
 * - Produces the exact same key for identical content packages.
 * - Produces different keys when package contents or taxonomies diverge.
 * - Formatted as 'nlm_<32-char-hex-digest>' (safe for HTTP headers).
 */
export function generateNotebookLMIdempotencyKey(pkg: NotebookLMExportPackage): string {
  const hash = crypto.createHash('sha256');
  const stablePayload = JSON.stringify({
    system: pkg.source?.system || 'notebooklm',
    source_id: pkg.source?.source_id ? String(pkg.source.source_id).trim() : '',
    section: pkg.metadata?.section ? String(pkg.metadata.section).trim() : '',
    category: pkg.metadata?.category ? String(pkg.metadata.category).trim() : '',
    topic: pkg.metadata?.topic ? String(pkg.metadata.topic).trim() : '',
    content_type: pkg.metadata?.content_type ? String(pkg.metadata.content_type).trim() : '',
    title: pkg.metadata?.title ? String(pkg.metadata.title).trim() : '',
    body: pkg.content?.body ? String(pkg.content.body) : '',
    file_name: pkg.file?.file_name ? String(pkg.file.file_name).trim() : '',
    file_size: pkg.file?.file_size ? String(pkg.file.file_size) : '',
  });

  hash.update(stablePayload, 'utf8');
  return `nlm_${hash.digest('hex').substring(0, 32)}`;
}

/**
 * Extracts safe display metadata from a validated package.
 */
export function extractSafePackageMetadata(
  pkg: NotebookLMExportPackage,
  idempotencyKey: string
): SafePackageMetadata {
  const hasFile = Boolean(pkg.file?.file_name || pkg.file?.file_data || pkg.file?.file_path);
  const parsedSize =
    typeof pkg.file?.file_size === 'number'
      ? pkg.file.file_size
      : typeof pkg.file?.file_size === 'string'
        ? parseInt(pkg.file.file_size, 10)
        : undefined;

  return {
    title: String(pkg.metadata.title).trim(),
    section: String(pkg.metadata.section).trim(),
    category: String(pkg.metadata.category).trim(),
    topic: String(pkg.metadata.topic).trim(),
    contentType: String(pkg.metadata.content_type).trim(),
    tags: pkg.metadata.tags,
    sourceSystem: pkg.source.system,
    sourceId: pkg.source.source_id,
    sourceUrl: pkg.source.source_url,
    generatedAt: pkg.source.generated_at,
    idempotencyKey,
    hasFile,
    fileName: pkg.file?.file_name,
    fileType: pkg.file?.file_type,
    fileSize: parsedSize,
    manifestVersion: NOTEBOOKLM_PACKAGE_VERSION,
  };
}

/**
 * Main execution logic for the NotebookLM ingestion runner.
 */
export async function runNotebookLMIngestion(
  options: NotebookLMIngestOptions
): Promise<NotebookLMIngestResult> {
  const logger = options.logger || console;
  const isDryRun = Boolean(options.dryRun);
  const isConfirmed = Boolean(options.confirm);
  const packagePath = options.packagePath;

  // 1. Validate package path input
  if (!packagePath || typeof packagePath !== 'string' || packagePath.trim().length === 0) {
    const errorMsg = 'Package path is required. Usage: npm run ingest:notebooklm -- <path/to/package.json>';
    logger.error(`[Runner Error] ${errorMsg}`);
    return {
      success: false,
      dryRun: isDryRun,
      error: {
        code: 'MISSING_PACKAGE_PATH',
        message: errorMsg,
      },
    };
  }

  const resolvedPath = path.resolve(process.cwd(), packagePath.trim());

  // 2. Read file from disk
  let rawJsonContent: string;
  try {
    if (!fs.existsSync(resolvedPath)) {
      const errorMsg = `Package file not found at: ${resolvedPath}`;
      logger.error(`[Runner Error] ${errorMsg}`);
      return {
        success: false,
        dryRun: isDryRun,
        error: {
          code: 'FILE_NOT_FOUND',
          message: errorMsg,
        },
      };
    }
    rawJsonContent = fs.readFileSync(resolvedPath, 'utf8');
  } catch (readErr: any) {
    const errorMsg = `Failed to read package file: ${readErr?.message || 'Unknown read error'}`;
    logger.error(`[Runner Error] ${errorMsg}`);
    return {
      success: false,
      dryRun: isDryRun,
      error: {
        code: 'FILE_READ_ERROR',
        message: errorMsg,
      },
    };
  }

  // 3. Parse JSON safely
  let rawParsedObject: unknown;
  try {
    rawParsedObject = JSON.parse(rawJsonContent);
  } catch (jsonErr: any) {
    const errorMsg = `Invalid JSON in package file: ${jsonErr?.message || 'Parse error'}`;
    logger.error(`[Runner Error] ${errorMsg}`);
    return {
      success: false,
      dryRun: isDryRun,
      error: {
        code: 'MALFORMED_REQUEST',
        message: errorMsg,
      },
    };
  }

  // 4. Validate Package Contract via existing NotebookLM Export Package Engine
  const validationResult: NotebookLMExportPackageValidationResult =
    validateNotebookLMExportPackage(rawParsedObject);

  if (!validationResult.valid) {
    const primaryError = validationResult.errors[0] || 'Package validation failed.';
    logger.error(`[Validation Failed] ${primaryError}`);
    return {
      success: false,
      dryRun: isDryRun,
      error: {
        code: validationResult.errorCode || 'INVALID_MANIFEST',
        message: primaryError,
        details: validationResult.errors,
      },
    };
  }

  // Parse into standardized package object
  let parsedPackage: NotebookLMExportPackage;
  try {
    parsedPackage = parseNotebookLMExportPackage(rawParsedObject);
  } catch (parseErr: any) {
    return {
      success: false,
      dryRun: isDryRun,
      error: {
        code: parseErr instanceof NotebookLMExportPackageError ? parseErr.code : 'INVALID_MANIFEST',
        message: parseErr?.message || 'Failed to normalize package.',
        details: parseErr instanceof NotebookLMExportPackageError ? parseErr.errors : undefined,
      },
    };
  }

  // Check file attachment limits if file is present
  let resolvedFileBuffer: Buffer | undefined = undefined;
  if (parsedPackage.file) {
    // If file_path is specified, attempt to resolve from disk
    if (parsedPackage.file.file_path) {
      const packageDir = path.dirname(resolvedPath);
      const filePath = path.isAbsolute(parsedPackage.file.file_path)
        ? parsedPackage.file.file_path
        : path.resolve(packageDir, parsedPackage.file.file_path);

      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        if (stats.size > MAX_PACKAGE_FILE_SIZE_BYTES) {
          const errorMsg = `Attached file "${parsedPackage.file.file_name || path.basename(filePath)}" exceeds 50MB limit (${stats.size} bytes).`;
          logger.error(`[Runner Error] ${errorMsg}`);
          return {
            success: false,
            dryRun: isDryRun,
            error: {
              code: 'PAYLOAD_TOO_LARGE',
              message: errorMsg,
            },
          };
        }
        resolvedFileBuffer = fs.readFileSync(filePath);
        parsedPackage.file.file_size = stats.size;
        parsedPackage.file.file_data = resolvedFileBuffer;
      }
    } else if (parsedPackage.file.file_data) {
      if (Buffer.isBuffer(parsedPackage.file.file_data)) {
        resolvedFileBuffer = parsedPackage.file.file_data;
      } else if (typeof parsedPackage.file.file_data === 'string') {
        if (parsedPackage.file.file_data.startsWith('data:')) {
          const base64Data = parsedPackage.file.file_data.split(',')[1] || '';
          resolvedFileBuffer = Buffer.from(base64Data, 'base64');
        } else {
          resolvedFileBuffer = Buffer.from(parsedPackage.file.file_data, 'utf8');
        }
      }
      if (resolvedFileBuffer && resolvedFileBuffer.length > MAX_PACKAGE_FILE_SIZE_BYTES) {
        const errorMsg = `Attached in-memory file exceeds 50MB limit (${resolvedFileBuffer.length} bytes).`;
        logger.error(`[Runner Error] ${errorMsg}`);
        return {
          success: false,
          dryRun: isDryRun,
          error: {
            code: 'PAYLOAD_TOO_LARGE',
            message: errorMsg,
          },
        };
      }
    }
  }

  // 5. Convert Package to Canonical Manifest v1.0 reusing existing Adapter
  const conversion = convertNotebookLMExportPackageToManifest(parsedPackage);
  if (!conversion.success || !conversion.manifest) {
    const errorMsg = conversion.errors?.[0] || 'Adapter conversion to Manifest v1.0 failed.';
    logger.error(`[Conversion Failed] ${errorMsg}`);
    return {
      success: false,
      dryRun: isDryRun,
      error: {
        code: conversion.errorCode || 'INVALID_MANIFEST',
        message: errorMsg,
        details: conversion.errors,
      },
    };
  }

  const manifest: AutomationManifest = conversion.manifest;

  // 6. Generate Deterministic Idempotency Key
  const idempotencyKey = generateNotebookLMIdempotencyKey(parsedPackage);
  const safeMetadata = extractSafePackageMetadata(parsedPackage, idempotencyKey);

  // 7. DRY-RUN MODE (Zero Network I/O, Zero Content Creation)
  if (isDryRun) {
    logger.log('================================================================');
    logger.log('🔍 NOTEBOOKLM INGESTION RUNNER — DRY RUN (ZERO NETWORK CALLS)');
    logger.log('================================================================');
    logger.log(`Title:           ${safeMetadata.title}`);
    logger.log(`Section:         ${safeMetadata.section}`);
    logger.log(`Category:        ${safeMetadata.category}`);
    logger.log(`Topic:           ${safeMetadata.topic}`);
    logger.log(`Content Type:    ${safeMetadata.contentType}`);
    logger.log(`Source System:   ${safeMetadata.sourceSystem}`);
    if (safeMetadata.sourceId) {
      logger.log(`Source ID:       ${safeMetadata.sourceId}`);
    }
    if (safeMetadata.tags && safeMetadata.tags.length > 0) {
      logger.log(`Tags:            ${safeMetadata.tags.join(', ')}`);
    }
    logger.log(`Idempotency-Key: ${safeMetadata.idempotencyKey}`);
    logger.log(`Attachment:      ${safeMetadata.hasFile ? `${safeMetadata.fileName} (${safeMetadata.fileSize || 0} bytes)` : 'None'}`);
    logger.log('----------------------------------------------------------------');
    logger.log('✅ Validation:     PASSED');
    logger.log('✅ Manifest v1.0:  READY');
    logger.log('ℹ️  Action:         Dry run complete. No network calls made.');
    logger.log('================================================================');

    return {
      success: true,
      dryRun: true,
      metadata: safeMetadata,
      manifest,
    };
  }

  // 8. SAFETY CHECK: Require explicit --confirm flag to execute production network call
  if (!isConfirmed) {
    const notice =
      'Safety check: Ingestion was not confirmed. To preview conversion, supply "--dry-run". To submit to production gateway, supply "--confirm".';
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

  // 9. PRODUCTION SUBMISSION PREPARATION
  // Check required environment variables
  const rawBaseUrl = options.baseUrl || process.env.CONTENT_INGESTION_BASE_URL;
  if (!rawBaseUrl || rawBaseUrl.trim().length === 0) {
    const errorMsg =
      'Missing required environment variable: CONTENT_INGESTION_BASE_URL. Please set CONTENT_INGESTION_BASE_URL (e.g. https://hemantkrkushwaha.com).';
    logger.error(`[Runner Error] ${errorMsg}`);
    return {
      success: false,
      dryRun: false,
      error: {
        code: 'MISSING_CONFIG_BASE_URL',
        message: errorMsg,
      },
    };
  }

  const rawApiKey = options.apiKey || process.env.CONTENT_INGESTION_API_KEY;
  if (!rawApiKey || rawApiKey.trim().length === 0) {
    const errorMsg =
      'Missing required environment variable: CONTENT_INGESTION_API_KEY. Please set CONTENT_INGESTION_API_KEY locally before submitting.';
    logger.error(`[Runner Error] ${errorMsg}`);
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

  // 10. Execute Single Authenticated POST Request (No Automatic Retries)
  const fetchClient = options.fetchFn || globalThis.fetch;
  if (typeof fetchClient !== 'function') {
    const errorMsg = 'Global fetch function is not available in current runtime.';
    logger.error(`[Runner Error] ${errorMsg}`);
    return {
      success: false,
      dryRun: false,
      error: {
        code: 'RUNTIME_ERROR',
        message: errorMsg,
      },
    };
  }

  logger.log(`🚀 Submitting NotebookLM export package to gateway: ${targetEndpoint}`);
  logger.log(`🔑 Idempotency-Key: ${idempotencyKey}`);

  let response: Response;
  try {
    if (resolvedFileBuffer && parsedPackage.file?.file_name) {
      // Multipart/form-data upload when binary file resource is attached
      const formData = new FormData();
      formData.append('manifest', JSON.stringify(manifest));
      if (manifest.source) {
        formData.append('source', JSON.stringify(manifest.source));
      }

      const fileBlob = new Blob([resolvedFileBuffer], {
        type: parsedPackage.file.file_type || 'application/octet-stream',
      });
      formData.append('file', fileBlob, parsedPackage.file.file_name);

      response = await fetchClient(targetEndpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${rawApiKey.trim()}`,
          'Idempotency-Key': idempotencyKey,
        },
        body: formData,
      });
    } else {
      // Clean JSON payload for metadata-only packages
      const jsonPayload = {
        manifest,
        source: manifest.source,
        ...(parsedPackage.file ? { file: parsedPackage.file } : {}),
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
    }
  } catch (networkErr: any) {
    const safeErrorMsg = `Network error: Failed to reach gateway at ${baseUrl}: ${networkErr?.message || 'Connection failed'}`;
    logger.error(`[Runner Error] ${safeErrorMsg}`);
    return {
      success: false,
      dryRun: false,
      error: {
        code: 'NETWORK_FAILURE',
        message: safeErrorMsg,
      },
    };
  }

  // 11. Parse Gateway Response Safely
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
    const slug = data?.slug || manifest.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const title = data?.title || manifest.title;

    logger.log('================================================================');
    logger.log('🎉 INGESTION SUCCESSFUL (HTTP 201)');
    logger.log('================================================================');
    logger.log(`Title:        ${title}`);
    logger.log(`Slug:         ${slug}`);
    if (contentId) {
      logger.log(`Content ID:   ${contentId}`);
    }
    if (data?.fileUploaded || data?.storagePath) {
      logger.log(`Storage Path: ${data?.storagePath || 'Private Content File Stored'}`);
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
    errorMessage = `Conflict (HTTP 409): Content with slug "${responseData?.slug || ''}" already exists.`;
  } else if (httpStatus === 413) {
    errorCode = 'PAYLOAD_TOO_LARGE';
    errorMessage = 'Payload Too Large (HTTP 413): Attached file exceeds the 50MB gateway limit.';
  }

  logger.error(`[Ingestion Error ${httpStatus}] (${errorCode}): ${errorMessage}`);

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

/**
 * Parses CLI command line arguments.
 */
export function parseCliArgs(argv: string[]): {
  packagePath?: string;
  dryRun: boolean;
  confirm: boolean;
} {
  let packagePath: string | undefined = undefined;
  let dryRun = false;
  let confirm = false;

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--confirm') {
      confirm = true;
    } else if (!arg.startsWith('--') && !packagePath) {
      packagePath = arg;
    }
  }

  return { packagePath, dryRun, confirm };
}

/**
 * CLI Entry Point
 */
export async function cliMain(): Promise<void> {
  const { packagePath, dryRun, confirm } = parseCliArgs(process.argv);

  if (!packagePath) {
    console.log(`
NotebookLM Export Ingestion Runner (Step 19)

Usage:
  npm run ingest:notebooklm -- <path/to/package.json> [flags]

Flags:
  --dry-run   Validate and inspect package conversion without network transmission.
  --confirm   Confirm production transmission to POST /api/automation/ingest.

Environment Variables:
  CONTENT_INGESTION_BASE_URL  Base domain (e.g. https://hemantkrkushwaha.com)
  CONTENT_INGESTION_API_KEY   Local server-side Bearer authentication secret

Examples:
  # Inspect and validate safely:
  npm run ingest:notebooklm -- ./examples/notebooklm-export-package.json --dry-run

  # Submit with explicit confirmation:
  npm run ingest:notebooklm -- ./examples/notebooklm-export-package.json --confirm
`);
    process.exit(1);
  }

  const result = await runNotebookLMIngestion({
    packagePath,
    dryRun,
    confirm,
  });

  if (!result.success) {
    process.exit(1);
  }
}

// Execute if run directly from CLI
const isDirectExecution =
  process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isDirectExecution) {
  cliMain().catch((err) => {
    console.error(`[Fatal Error] ${err?.message || err}`);
    process.exit(1);
  });
}
