/**
 * NotebookLM Export Package Service & Transformation Engine
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Step 17 — NotebookLM Export Package & Automation Workflow
 * 
 * Responsibilities:
 * - Validate NotebookLM Export Packages against the v1.0 specification.
 * - Parse and safely unpack export packages from JSON strings or raw objects.
 * - Enforce User Taxonomy Supremacy: section, category, topic, content_type, and title
 *   are NEVER inferred, classified, or altered. Missing fields trigger immediate rejection.
 * - Preserve Content Integrity: markdown headings, lists, tables, code blocks, math notation,
 *   links, and line breaks remain semantically and textually verbatim.
 * - Validate file metadata and in-memory buffers (<= 50MB limit, supported extensions).
 * - Transform validated packages into Canonical Content Manifest v1.0 by reusing
 *   the existing NotebookLMAdapter.
 * 
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * 1. Zero Direct Database Access: Never imports database clients, never executes queries.
 * 2. Zero Storage Uploads: Never imports storage services, never uploads files, never writes to disk.
 * 3. Zero Network Access: Never calls external APIs, NotebookLM, Google, or webhooks.
 * 4. Zero Gateway Delegation: Pure transformation/validation layer only.
 */

import {
  NotebookLMExportPackage,
  NotebookLMExportPackageValidationResult,
  NotebookLMExportPackageConversionResult,
  NOTEBOOKLM_PACKAGE_VERSION,
  SUPPORTED_NOTEBOOKLM_PACKAGE_VERSIONS,
} from '../types/notebookLMExportPackage.js';
import {
  AutomationErrorCode,
  NotebookLMSourceInput,
  AutomationSourceMetadata,
} from '../types/automation.js';
import {
  MANIFEST_SECTIONS,
  MANIFEST_CONTENT_TYPES,
  ManifestSection,
  ManifestContentType,
} from '../types/manifest.js';
import { validateSourceMetadata } from './manifestService.js';
import { notebookLMAdapter, NotebookLMAdapterError } from './adapters/notebookLMAdapter.js';

/**
 * Maximum allowed file size for package file attachments (50MB in bytes).
 */
export const MAX_PACKAGE_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 52,428,800 bytes

/**
 * Allowed file extensions supported on the platform.
 */
export const ALLOWED_FILE_EXTENSIONS = [
  'pdf',
  'ppt',
  'pptx',
  'doc',
  'docx',
  'png',
  'jpg',
  'jpeg',
  'webp',
  'mp4',
  'webm',
] as const;

/**
 * Allowed MIME types for supported file extensions.
 */
export const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  pdf: ['application/pdf'],
  ppt: ['application/vnd.ms-powerpoint'],
  pptx: [
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint',
  ],
  doc: ['application/msword'],
  docx: [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
  ],
  png: ['image/png'],
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  webp: ['image/webp'],
  mp4: ['video/mp4'],
  webm: ['video/webm'],
};

/**
 * Custom Error for NotebookLM Export Package validation and parsing failures.
 */
export class NotebookLMExportPackageError extends Error {
  readonly code: AutomationErrorCode;
  readonly errors: string[];

  constructor(
    message: string,
    code: AutomationErrorCode = 'INVALID_MANIFEST',
    errors: string[] = [message]
  ) {
    super(message);
    this.name = 'NotebookLMExportPackageError';
    this.code = code;
    this.errors = errors;
  }
}

/**
 * Validates file metadata and optional buffer attached to the export package.
 */
function validatePackageFileMetadata(file: unknown): {
  valid: boolean;
  errors: string[];
  errorCode?: AutomationErrorCode;
} {
  const errors: string[] = [];

  if (file === undefined || file === null) {
    return { valid: true, errors };
  }

  if (typeof file !== 'object' || Array.isArray(file)) {
    return {
      valid: false,
      errors: ['File metadata must be a non-null object.'],
      errorCode: 'INVALID_MANIFEST',
    };
  }

  const raw = file as Record<string, unknown>;

  // 1. Validate file_name if present
  let detectedExtension: string | null = null;
  if (raw.file_name !== undefined && raw.file_name !== null) {
    if (typeof raw.file_name !== 'string') {
      errors.push('Field "file_name" must be a string.');
    } else {
      const fileName = raw.file_name.trim();
      if (fileName.length === 0) {
        errors.push('Field "file_name" cannot be empty.');
      } else {
        // Path traversal and safety checks
        if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\') || fileName.includes('\0')) {
          errors.push('Field "file_name" contains unsafe characters or directory traversal sequences.');
        }

        const dotIdx = fileName.lastIndexOf('.');
        if (dotIdx === -1 || dotIdx === fileName.length - 1) {
          errors.push('Field "file_name" lacks a valid file extension.');
        } else {
          detectedExtension = fileName.substring(dotIdx + 1).toLowerCase();
          if (!ALLOWED_FILE_EXTENSIONS.includes(detectedExtension as any)) {
            errors.push(
              `Unsupported file extension ".${detectedExtension}". Allowed extensions are: ${ALLOWED_FILE_EXTENSIONS.join(', ')}.`
            );
            return {
              valid: false,
              errors,
              errorCode: 'UNSUPPORTED_MEDIA_TYPE',
            };
          }
        }
      }
    }
  }

  // 2. Validate file_type if present
  if (raw.file_type !== undefined && raw.file_type !== null) {
    if (typeof raw.file_type !== 'string') {
      errors.push('Field "file_type" must be a string.');
    } else {
      const fileType = raw.file_type.trim().toLowerCase();
      if (detectedExtension && ALLOWED_MIME_TYPES[detectedExtension]) {
        const allowedMimes = ALLOWED_MIME_TYPES[detectedExtension];
        if (!allowedMimes.includes(fileType)) {
          errors.push(
            `MIME type "${fileType}" is incompatible with file extension ".${detectedExtension}". Expected: ${allowedMimes.join(', ')}.`
          );
          return {
            valid: false,
            errors,
            errorCode: 'UNSUPPORTED_MEDIA_TYPE',
          };
        }
      }
    }
  }

  // 3. Validate file_size if present
  let parsedSize: number | undefined = undefined;
  if (raw.file_size !== undefined && raw.file_size !== null) {
    if (typeof raw.file_size === 'number') {
      parsedSize = raw.file_size;
    } else if (typeof raw.file_size === 'string') {
      parsedSize = parseInt(raw.file_size, 10);
      if (isNaN(parsedSize)) {
        errors.push('Field "file_size" must be a valid number.');
      }
    } else {
      errors.push('Field "file_size" must be a number or numeric string.');
    }

    if (parsedSize !== undefined) {
      if (parsedSize < 0) {
        errors.push('Field "file_size" cannot be negative.');
      } else if (parsedSize > MAX_PACKAGE_FILE_SIZE_BYTES) {
        errors.push(`File size ${parsedSize} bytes exceeds the maximum allowed limit of 50MB.`);
        return {
          valid: false,
          errors,
          errorCode: 'PAYLOAD_TOO_LARGE',
        };
      }
    }
  }

  // 4. Validate file_data buffer or base64 if present
  if (raw.file_data !== undefined && raw.file_data !== null) {
    let dataByteLength = 0;
    if (Buffer.isBuffer(raw.file_data) || raw.file_data instanceof Uint8Array) {
      dataByteLength = raw.file_data.byteLength;
    } else if (typeof raw.file_data === 'string') {
      if (raw.file_data.startsWith('data:')) {
        const base64Str = raw.file_data.split(',')[1] || '';
        dataByteLength = Math.floor((base64Str.length * 3) / 4);
      } else {
        dataByteLength = Buffer.byteLength(raw.file_data, 'utf8');
      }
    }

    if (dataByteLength > MAX_PACKAGE_FILE_SIZE_BYTES) {
      errors.push(`File data byte length (${dataByteLength} bytes) exceeds the maximum allowed limit of 50MB.`);
      return {
        valid: false,
        errors,
        errorCode: 'PAYLOAD_TOO_LARGE',
      };
    }
  }

  if (errors.length > 0) {
    return {
      valid: false,
      errors,
      errorCode: 'INVALID_MANIFEST',
    };
  }

  return { valid: true, errors: [] };
}

/**
 * Validates a NotebookLM Export Package against all structural, taxonomical, and content invariants.
 * 
 * Enforces:
 * - package_version must be "1.0"
 * - source.system must be "notebooklm"
 * - source metadata adheres to platform validation
 * - metadata.section, metadata.category, metadata.topic, metadata.content_type, metadata.title are non-empty and valid
 * - content.body is a non-empty string
 * - optional file metadata meets platform limits (<= 50MB) and supported formats
 */
export function validateNotebookLMExportPackage(
  pkg: unknown
): NotebookLMExportPackageValidationResult {
  if (!pkg || typeof pkg !== 'object' || Array.isArray(pkg)) {
    return {
      valid: false,
      errors: ['NotebookLM Export Package must be a non-null JSON object.'],
      errorCode: 'MALFORMED_REQUEST',
    };
  }

  const raw = pkg as Record<string, unknown>;
  const errors: string[] = [];

  // 1. Validate package_version
  if (raw.package_version === undefined || raw.package_version === null) {
    return {
      valid: false,
      errors: ['Missing required field: "package_version".'],
      errorCode: 'MISSING_MANIFEST_VERSION',
    };
  }

  if (typeof raw.package_version !== 'string' || raw.package_version.trim().length === 0) {
    return {
      valid: false,
      errors: ['Field "package_version" must be a non-empty string.'],
      errorCode: 'MISSING_MANIFEST_VERSION',
    };
  }

  const packageVersion = raw.package_version.trim();
  if (packageVersion !== NOTEBOOKLM_PACKAGE_VERSION) {
    return {
      valid: false,
      errors: [
        `Unsupported package_version "${packageVersion}". Currently supported versions: ${SUPPORTED_NOTEBOOKLM_PACKAGE_VERSIONS.join(', ')}.`,
      ],
      errorCode: 'UNSUPPORTED_MANIFEST_VERSION',
    };
  }

  // 2. Validate source block
  if (raw.source === undefined || raw.source === null) {
    return {
      valid: false,
      errors: ['Missing required block: "source".'],
      errorCode: 'INVALID_SOURCE_METADATA',
    };
  }

  if (typeof raw.source !== 'object' || Array.isArray(raw.source)) {
    return {
      valid: false,
      errors: ['Field "source" must be a non-null JSON object.'],
      errorCode: 'INVALID_SOURCE_METADATA',
    };
  }

  const rawSource = raw.source as Record<string, unknown>;
  if (rawSource.system === undefined || rawSource.system === null) {
    return {
      valid: false,
      errors: ['Source metadata field "system" is required.'],
      errorCode: 'INVALID_SOURCE_METADATA',
    };
  }

  if (typeof rawSource.system !== 'string' || rawSource.system.trim().length === 0) {
    return {
      valid: false,
      errors: ['Source metadata field "system" must be a non-empty string.'],
      errorCode: 'INVALID_SOURCE_METADATA',
    };
  }

  if (rawSource.system.trim() !== 'notebooklm') {
    return {
      valid: false,
      errors: [`Source system must be strictly "notebooklm", received "${rawSource.system}".`],
      errorCode: 'INVALID_SOURCE_METADATA',
    };
  }

  // Delegate detailed source validation to canonical validateSourceMetadata
  const sourceValidation = validateSourceMetadata(rawSource);
  if (!sourceValidation.valid) {
    return {
      valid: false,
      errors: sourceValidation.errors,
      errorCode: 'INVALID_SOURCE_METADATA',
    };
  }

  // 3. Validate metadata block
  if (raw.metadata === undefined || raw.metadata === null) {
    return {
      valid: false,
      errors: ['Missing required block: "metadata".'],
      errorCode: 'MISSING_REQUIRED_FIELD',
    };
  }

  if (typeof raw.metadata !== 'object' || Array.isArray(raw.metadata)) {
    return {
      valid: false,
      errors: ['Field "metadata" must be a non-null JSON object.'],
      errorCode: 'MISSING_REQUIRED_FIELD',
    };
  }

  const rawMetadata = raw.metadata as Record<string, unknown>;

  // User-Controlled Taxonomy Preservation: Check required taxonomy fields
  if (rawMetadata.section === undefined || rawMetadata.section === null) {
    errors.push('Missing required field: "section".');
  } else if (typeof rawMetadata.section !== 'string' || rawMetadata.section.trim().length === 0) {
    errors.push('Field "section" must be a non-empty string.');
  } else if (!MANIFEST_SECTIONS.includes(rawMetadata.section.trim() as any)) {
    return {
      valid: false,
      errors: [
        `Invalid section "${rawMetadata.section}". Allowed sections are: ${MANIFEST_SECTIONS.join(', ')}.`,
      ],
      errorCode: 'INVALID_SECTION',
    };
  }

  if (rawMetadata.category === undefined || rawMetadata.category === null) {
    errors.push('Missing required field: "category".');
  } else if (typeof rawMetadata.category !== 'string' || rawMetadata.category.trim().length === 0) {
    errors.push('Field "category" must be a non-empty string.');
  }

  if (rawMetadata.topic === undefined || rawMetadata.topic === null) {
    errors.push('Missing required field: "topic".');
  } else if (typeof rawMetadata.topic !== 'string' || rawMetadata.topic.trim().length === 0) {
    errors.push('Field "topic" must be a non-empty string.');
  }

  if (rawMetadata.content_type === undefined || rawMetadata.content_type === null) {
    errors.push('Missing required field: "content_type".');
  } else if (typeof rawMetadata.content_type !== 'string' || rawMetadata.content_type.trim().length === 0) {
    errors.push('Field "content_type" must be a non-empty string.');
  } else if (!MANIFEST_CONTENT_TYPES.includes(rawMetadata.content_type.trim() as any)) {
    return {
      valid: false,
      errors: [
        `Invalid content_type "${rawMetadata.content_type}". Allowed content types are: ${MANIFEST_CONTENT_TYPES.join(', ')}.`,
      ],
      errorCode: 'INVALID_CONTENT_TYPE',
    };
  }

  if (rawMetadata.title === undefined || rawMetadata.title === null) {
    errors.push('Missing required field: "title".');
  } else if (typeof rawMetadata.title !== 'string' || rawMetadata.title.trim().length === 0) {
    errors.push('Field "title" must be a non-empty string.');
  }

  if (errors.length > 0) {
    return {
      valid: false,
      errors,
      errorCode: 'MISSING_REQUIRED_FIELD',
    };
  }

  // Optional metadata validations
  if (rawMetadata.tags !== undefined && rawMetadata.tags !== null && !Array.isArray(rawMetadata.tags)) {
    errors.push('Field "tags", when provided, must be an array of strings.');
  }

  if (rawMetadata.description !== undefined && rawMetadata.description !== null && typeof rawMetadata.description !== 'string') {
    errors.push('Field "description", when provided, must be a string.');
  }

  // 4. Validate content block
  if (raw.content === undefined || raw.content === null) {
    return {
      valid: false,
      errors: ['Missing required block: "content".'],
      errorCode: 'MISSING_REQUIRED_FIELD',
    };
  }

  if (typeof raw.content !== 'object' || Array.isArray(raw.content)) {
    return {
      valid: false,
      errors: ['Field "content" must be a non-null JSON object.'],
      errorCode: 'MISSING_REQUIRED_FIELD',
    };
  }

  const rawContent = raw.content as Record<string, unknown>;
  if (rawContent.body === undefined || rawContent.body === null) {
    return {
      valid: false,
      errors: ['Missing required field: "body" in content block.'],
      errorCode: 'MISSING_REQUIRED_FIELD',
    };
  }

  if (typeof rawContent.body !== 'string') {
    return {
      valid: false,
      errors: ['Field "body" in content block must be a string.'],
      errorCode: 'INVALID_MANIFEST',
    };
  }

  if (rawContent.body.trim().length === 0) {
    return {
      valid: false,
      errors: ['Field "body" in content block cannot be empty.'],
      errorCode: 'INVALID_MANIFEST',
    };
  }

  // 5. Validate file block if provided
  if (raw.file !== undefined && raw.file !== null) {
    const fileVal = validatePackageFileMetadata(raw.file);
    if (!fileVal.valid) {
      return {
        valid: false,
        errors: fileVal.errors,
        errorCode: fileVal.errorCode || 'INVALID_MANIFEST',
      };
    }
  }

  if (errors.length > 0) {
    return {
      valid: false,
      errors,
      errorCode: 'INVALID_MANIFEST',
    };
  }

  return { valid: true, errors: [] };
}

/**
 * Parses and validates an unknown input as a NotebookLMExportPackage.
 * 
 * Accepts either:
 * - A valid JSON string containing the export package
 * - A JavaScript object adhering to the NotebookLMExportPackage contract
 * 
 * @throws NotebookLMExportPackageError if parsing or validation fails.
 */
export function parseNotebookLMExportPackage(raw: unknown): NotebookLMExportPackage {
  let parsedObj: unknown = raw;

  if (typeof raw === 'string') {
    try {
      parsedObj = JSON.parse(raw);
    } catch {
      throw new NotebookLMExportPackageError(
        'Failed to parse export package: invalid JSON string.',
        'MALFORMED_REQUEST',
        ['Failed to parse export package: invalid JSON string.']
      );
    }
  }

  const validation = validateNotebookLMExportPackage(parsedObj);
  if (!validation.valid) {
    throw new NotebookLMExportPackageError(
      validation.errors[0] || 'NotebookLM export package validation failed.',
      validation.errorCode || 'INVALID_MANIFEST',
      validation.errors
    );
  }

  const pkg = parsedObj as NotebookLMExportPackage;

  // Safe structural normalization without altering educational content body
  return {
    package_version: String(pkg.package_version).trim() as any,
    source: {
      system: 'notebooklm',
      ...(pkg.source.source_id ? { source_id: String(pkg.source.source_id).trim() } : {}),
      ...(pkg.source.source_url ? { source_url: String(pkg.source.source_url).trim() } : {}),
      ...(pkg.source.source_name ? { source_name: String(pkg.source.source_name).trim() } : {}),
      ...(pkg.source.generated_at ? { generated_at: String(pkg.source.generated_at).trim() } : {}),
    },
    metadata: {
      section: String(pkg.metadata.section).trim() as ManifestSection,
      category: String(pkg.metadata.category).trim(),
      topic: String(pkg.metadata.topic).trim(),
      content_type: String(pkg.metadata.content_type).trim() as ManifestContentType,
      title: String(pkg.metadata.title).trim(),
      ...(pkg.metadata.description !== undefined ? { description: String(pkg.metadata.description).trim() } : {}),
      ...(Array.isArray(pkg.metadata.tags)
        ? {
            tags: pkg.metadata.tags
              .filter((t) => typeof t === 'string' && t.trim().length > 0)
              .map((t) => t.trim()),
          }
        : {}),
      ...(pkg.metadata.subcategory !== undefined ? { subcategory: String(pkg.metadata.subcategory).trim() } : {}),
      ...(pkg.metadata.language !== undefined ? { language: String(pkg.metadata.language).trim() } : {}),
      ...(pkg.metadata.visibility !== undefined ? { visibility: pkg.metadata.visibility } : {}),
      ...(pkg.metadata.is_featured !== undefined ? { is_featured: Boolean(pkg.metadata.is_featured) } : {}),
      ...(pkg.metadata.published !== undefined ? { published: Boolean(pkg.metadata.published) } : {}),
      ...(pkg.metadata.external_url !== undefined ? { external_url: String(pkg.metadata.external_url).trim() } : {}),
    },
    content: {
      // Content body is preserved textually and structurally verbatim
      body: String(pkg.content.body),
    },
    ...(pkg.file ? { file: pkg.file } : {}),
  };
}

/**
 * Non-throwing parser for NotebookLM Export Package.
 */
export function tryParseNotebookLMExportPackage(
  raw: unknown
): { success: true; package: NotebookLMExportPackage } | { success: false; errors: string[]; errorCode: AutomationErrorCode } {
  try {
    const pkg = parseNotebookLMExportPackage(raw);
    return { success: true, package: pkg };
  } catch (err: any) {
    if (err instanceof NotebookLMExportPackageError) {
      return {
        success: false,
        errors: err.errors,
        errorCode: err.code,
      };
    }
    return {
      success: false,
      errors: [err?.message || 'Unknown parsing error'],
      errorCode: 'MALFORMED_REQUEST',
    };
  }
}

/**
 * Converts a validated NotebookLM Export Package to Canonical Content Manifest v1.0.
 * 
 * Reuses the existing NotebookLMAdapter to ensure unified validation and transformation logic.
 * 
 * Flow:
 * Export Package → Package Validation → NotebookLM Adapter → Content Manifest v1.0
 */
export function convertNotebookLMExportPackageToManifest(
  pkg: NotebookLMExportPackage | unknown
): NotebookLMExportPackageConversionResult {
  // 1. Validate & Parse package first
  let validPackage: NotebookLMExportPackage;
  try {
    validPackage = parseNotebookLMExportPackage(pkg);
  } catch (err: any) {
    if (err instanceof NotebookLMExportPackageError) {
      return {
        success: false,
        errors: err.errors,
        errorCode: err.code,
      };
    }
    return {
      success: false,
      errors: [err?.message || 'Failed to parse NotebookLM export package.'],
      errorCode: 'INVALID_MANIFEST',
    };
  }

  // 2. Extract in-memory binary buffer if provided
  let fileDataBuffer: Buffer | Uint8Array | undefined = undefined;
  if (validPackage.file?.file_data) {
    if (Buffer.isBuffer(validPackage.file.file_data) || validPackage.file.file_data instanceof Uint8Array) {
      fileDataBuffer = validPackage.file.file_data;
    } else if (typeof validPackage.file.file_data === 'string') {
      if (validPackage.file.file_data.startsWith('data:')) {
        const base64Part = validPackage.file.file_data.split(',')[1] || '';
        fileDataBuffer = Buffer.from(base64Part, 'base64');
      } else {
        fileDataBuffer = Buffer.from(validPackage.file.file_data, 'utf8');
      }
    }
  }

  const parsedFileSize =
    typeof validPackage.file?.file_size === 'number'
      ? validPackage.file.file_size
      : typeof validPackage.file?.file_size === 'string'
        ? parseInt(validPackage.file.file_size, 10)
        : undefined;

  // 3. Map package directly to NotebookLMSourceInput
  const sourceInput: NotebookLMSourceInput = {
    section: validPackage.metadata.section,
    category: validPackage.metadata.category,
    topic: validPackage.metadata.topic,
    content_type: validPackage.metadata.content_type,
    title: validPackage.metadata.title,
    description: validPackage.metadata.description,
    tags: validPackage.metadata.tags,
    subcategory: validPackage.metadata.subcategory,
    language: validPackage.metadata.language,
    visibility: validPackage.metadata.visibility,
    is_featured: validPackage.metadata.is_featured,
    published: validPackage.metadata.published,
    external_url: validPackage.metadata.external_url,

    // Content body preserved verbatim
    body: validPackage.content.body,

    // Provenance metadata
    source_id: validPackage.source.source_id,
    source_url: validPackage.source.source_url,
    source_name: validPackage.source.source_name,
    generated_at: validPackage.source.generated_at,

    // Optional file attachment metadata
    file_name: validPackage.file?.file_name,
    file_type: validPackage.file?.file_type,
    file_size: parsedFileSize,
    file_data: fileDataBuffer,
  };

  // 4. Delegate to existing canonical NotebookLM Adapter
  const adaptResult = notebookLMAdapter.tryAdapt(sourceInput);

  if (adaptResult.success === false) {
    const failedResult = adaptResult as { success: false; errors: string[]; errorCode?: AutomationErrorCode };
    return {
      success: false,
      errors: failedResult.errors,
      errorCode: failedResult.errorCode,
    };
  }

  return {
    success: true,
    manifest: adaptResult.result.manifest,
    fileResource: adaptResult.result.fileResource,
  };
}
