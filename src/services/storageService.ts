/**
 * Supabase Storage Service & File Ingestion Boundary
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Step 11 — File Ingestion Foundation
 * 
 * Responsibilities:
 * - Clean storage abstraction: uploadFile(), deleteFile(), getFileUrl().
 * - Deterministic, safe storage-path generation and sanitization.
 * - File validation: extension, MIME type, file size, path traversal.
 * - Strict public access protection: only exposes files where status = 'published' AND visibility = 'public'.
 * - Safe error handling: never leaks secret keys, database credentials, or binary contents.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../lib/supabase';
import { ContentStatus, ContentVisibility } from '../types/content';
import {
  FileMetadata,
  FileValidationResult,
  StorageUploadParams,
  StorageUploadResult,
  StorageDeleteParams,
  StorageDeleteResult,
  StorageFileUrlResult,
  StorageUrlContext,
  SupportedFileExtension,
  SUPPORTED_FILE_EXTENSIONS,
  SUPPORTED_MIME_TYPES,
  SignedUrlParams,
  SignedUrlResult,
  AccessUser,
  StorageAccessDecision,
  SecureContentFileResponse,
} from '../types/storage';

export * from '../types/storage';

/**
 * Default storage bucket name.
 * Configurable via SUPABASE_STORAGE_BUCKET environment variable.
 */
export const DEFAULT_STORAGE_BUCKET = 'content-files';

/**
 * Default maximum file size limit: 50MB (52,428,800 bytes).
 * Configurable via MAX_FILE_SIZE_BYTES environment variable.
 */
export const DEFAULT_MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

/**
 * Default signed URL expiration: 15 minutes (900 seconds).
 * Configurable per request within safe boundary limits [60s, 86400s].
 */
export const DEFAULT_SIGNED_URL_EXPIRES_IN_SECONDS = 900;
export const MIN_SIGNED_URL_EXPIRES_IN_SECONDS = 60; // 1 minute
export const MAX_SIGNED_URL_EXPIRES_IN_SECONDS = 86400; // 24 hours

/**
 * Returns the configured storage bucket name.
 */
export function getStorageBucketName(): string {
  if (typeof process !== 'undefined' && process.env?.SUPABASE_STORAGE_BUCKET) {
    return process.env.SUPABASE_STORAGE_BUCKET.trim();
  }
  return DEFAULT_STORAGE_BUCKET;
}

/**
 * Validates that an accessed or requested bucket matches the platform's canonical bucket.
 * Prevents arbitrary bucket access or bucket-name injection.
 */
export function validateBucketName(bucket?: string): { valid: boolean; error?: string; bucket: string } {
  const canonicalBucket = getStorageBucketName();
  if (!bucket || typeof bucket !== 'string' || bucket.trim().length === 0) {
    return { valid: true, bucket: canonicalBucket };
  }

  const normalized = bucket.trim();
  if (normalized !== canonicalBucket) {
    return {
      valid: false,
      error: `Arbitrary bucket access is forbidden. Target bucket must resolve to "${canonicalBucket}".`,
      bucket: normalized,
    };
  }

  return { valid: true, bucket: canonicalBucket };
}

/**
 * Returns the maximum allowed file size in bytes.
 * Configured via MAX_FILE_SIZE_BYTES environment variable.
 */
export function getMaxFileSizeBytes(): number {
  if (typeof process !== 'undefined' && process.env?.MAX_FILE_SIZE_BYTES) {
    const parsed = parseInt(process.env.MAX_FILE_SIZE_BYTES, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return DEFAULT_MAX_FILE_SIZE_BYTES;
}

/**
 * Sanitizes a file name to prevent directory traversal and unsafe characters.
 * - Extracts base file name (strips path separators)
 * - Removes control characters, null bytes, and unsafe characters
 * - Preserves alphanumeric characters, hyphens, underscores, and dots
 */
export function sanitizeFileName(rawFileName: string): string {
  if (!rawFileName || typeof rawFileName !== 'string') {
    return '';
  }

  // Strip directory paths (both forward and backward slashes)
  const baseName = rawFileName.replace(/^.*[\\/]/, '').trim();

  // Remove null bytes, control characters, and unsafe characters
  const sanitized = baseName
    .replace(/\0/g, '')
    .replace(/[^\w.-]/g, '_')
    .replace(/\.\.+/g, '.'); // Collapse multiple consecutive dots to prevent traversal

  return sanitized;
}

/**
 * Validates a storage path for safety.
 * Rejects:
 * - Empty or whitespace paths
 * - Relative traversal (..) or single dot segments (.)
 * - Absolute paths (/ or \)
 * - Windows drive letters (C:)
 * - Double slashes (// or \\)
 * - Null bytes and ASCII control characters
 * - URL-encoded traversal sequences (%2e, %2f, %5c)
 * - Bucket name prefixes (e.g. content-files/...)
 */
export function validateStoragePath(path: string): { valid: boolean; error?: string } {
  if (!path || typeof path !== 'string' || path.trim().length === 0) {
    return { valid: false, error: 'Storage path cannot be empty.' };
  }

  if (path.includes('\0')) {
    return { valid: false, error: 'Storage path contains null bytes.' };
  }

  // Reject ASCII control characters (0-31 and 127)
  if (/[\x00-\x1F\x7F]/.test(path)) {
    return { valid: false, error: 'Storage path contains invalid control characters.' };
  }

  // Reject URL-encoded path traversal or separators
  if (/%2e|%2f|%5c/i.test(path)) {
    return { valid: false, error: 'Storage path contains encoded traversal sequences.' };
  }

  // Reject leading slashes or Windows backslashes
  if (path.startsWith('/') || path.startsWith('\\')) {
    return { valid: false, error: 'Storage path must be relative and cannot begin with a slash.' };
  }

  // Reject Windows drive letters (e.g. C:, D:)
  if (/^[a-zA-Z]:/.test(path)) {
    return { valid: false, error: 'Storage path must be relative and cannot contain drive letters.' };
  }

  // Reject consecutive slashes (// or \\)
  if (/\/{2,}|\\{2,}/.test(path)) {
    return { valid: false, error: 'Storage path contains invalid double slashes.' };
  }

  // Check for path traversal components (.. as a path segment)
  const segments = path.split(/[/\\]/);
  for (const seg of segments) {
    if (seg === '..' || seg === '.') {
      return { valid: false, error: 'Storage path contains unsafe path traversal elements ("..").' };
    }
    if (seg.trim() !== seg) {
      return { valid: false, error: 'Storage path segments cannot contain leading or trailing whitespace.' };
    }
  }

  // Prevent bucket name injection in relative path (e.g. content-files/section/...)
  const canonicalBucket = getStorageBucketName().toLowerCase();
  const lowerPath = path.toLowerCase();
  if (lowerPath.startsWith(`${canonicalBucket}/`) || lowerPath.startsWith(`${canonicalBucket}\\`)) {
    return { valid: false, error: 'Storage path must not include the bucket name prefix.' };
  }

  return { valid: true };
}

/**
 * Generates a deterministic, URL-safe storage path.
 * 
 * Hierarchy:
 * section/category/topic/content-type/file-name
 * 
 * Example:
 * academics/computer-networks/arp/study-material/arp-lecture-notes.pdf
 */
export function generateDeterministicStoragePath(params: {
  section: string;
  category: string;
  topic: string;
  contentType: string;
  fileName: string;
}): string {
  const sanitizeSlugSegment = (val: string): string => {
    return (val || '')
      .toLowerCase()
      .trim()
      .replace(/[\s_]+/g, '-')
      .replace(/[^\w-]/g, '')
      .replace(/--+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const cleanSection = sanitizeSlugSegment(params.section) || 'general';
  const cleanCategory = sanitizeSlugSegment(params.category) || 'general';
  const cleanTopic = sanitizeSlugSegment(params.topic) || 'general';
  const cleanType = sanitizeSlugSegment(params.contentType) || 'resource';
  const cleanFile = sanitizeFileName(params.fileName) || 'file.bin';

  return `${cleanSection}/${cleanCategory}/${cleanTopic}/${cleanType}/${cleanFile}`;
}

/**
 * Validates file metadata against the platform's supported file types, MIME types, and size limits.
 * 
 * Rules:
 * 1. file_name must be present and non-empty.
 * 2. Extension must match one of the supported types:
 *    PDF, PPT, PPTX, DOC, DOCX, PNG, JPG, JPEG, WEBP, MP4, WEBM.
 * 3. MIME type, when provided, must be compatible with the file extension.
 *    (The system does not rely only on file extension when MIME type is provided).
 * 4. file_size, when provided, must be a positive number and not exceed MAX_FILE_SIZE_BYTES.
 * 5. file_path, when provided, must be a safe storage path free from directory traversal.
 */
export function validateFileMetadata(metadata: unknown): FileValidationResult {
  const errors: string[] = [];

  if (!metadata || typeof metadata !== 'object') {
    return {
      valid: false,
      errors: ['File metadata must be a non-null object.'],
      detectedExtension: null,
      sanitizedFileName: null,
    };
  }

  const raw = metadata as Record<string, unknown>;

  // 1. File Name Validation
  if (raw.file_name === undefined || raw.file_name === null) {
    errors.push('Missing required field: "file_name".');
    return {
      valid: false,
      errors,
      detectedExtension: null,
      sanitizedFileName: null,
    };
  }

  if (typeof raw.file_name !== 'string') {
    errors.push('Field "file_name" must be a string.');
    return {
      valid: false,
      errors,
      detectedExtension: null,
      sanitizedFileName: null,
    };
  }

  const rawFileName = raw.file_name.trim();
  if (rawFileName.length === 0) {
    errors.push('Field "file_name" cannot be empty or contain only whitespace.');
    return {
      valid: false,
      errors,
      detectedExtension: null,
      sanitizedFileName: null,
    };
  }

  // Reject explicit path traversal sequences, slashes, or null bytes in file_name
  if (
    rawFileName.includes('..') ||
    rawFileName.includes('/') ||
    rawFileName.includes('\\') ||
    rawFileName.includes('\0') ||
    rawFileName.toLowerCase().includes('%2e%2e') ||
    rawFileName.toLowerCase().includes('%2f')
  ) {
    errors.push('Field "file_name" must not contain path traversal characters (".."), path separators ("/", "\\"), or null bytes.');
    return {
      valid: false,
      errors,
      detectedExtension: null,
      sanitizedFileName: null,
    };
  }

  const sanitized = sanitizeFileName(rawFileName);
  if (sanitized.length === 0) {
    errors.push('Field "file_name" contains no valid characters.');
    return {
      valid: false,
      errors,
      detectedExtension: null,
      sanitizedFileName: null,
    };
  }

  // 2. Extension Extraction & Validation
  const lastDot = sanitized.lastIndexOf('.');
  if (lastDot === -1 || lastDot === sanitized.length - 1 || lastDot === 0) {
    errors.push(`File "${rawFileName}" lacks a valid file extension or base name.`);
    return {
      valid: false,
      errors,
      detectedExtension: null,
      sanitizedFileName: sanitized,
    };
  }

  const ext = sanitized.substring(lastDot + 1).toLowerCase();
  if (!SUPPORTED_FILE_EXTENSIONS.includes(ext as SupportedFileExtension)) {
    errors.push(
      `Unsupported file extension ".${ext}". Supported extensions are: ${SUPPORTED_FILE_EXTENSIONS.map((e) => `.${e}`).join(', ')}.`
    );
    return {
      valid: false,
      errors,
      detectedExtension: null,
      sanitizedFileName: sanitized,
    };
  }

  const detectedExtension = ext as SupportedFileExtension;

  // 3. MIME Type Validation (when provided, must match extension)
  if (raw.file_type !== undefined && raw.file_type !== null) {
    if (typeof raw.file_type !== 'string') {
      errors.push('Field "file_type" must be a string representing the MIME type.');
    } else {
      const mime = raw.file_type.trim().toLowerCase();
      const allowedMimes = SUPPORTED_MIME_TYPES[detectedExtension] || [];
      if (!allowedMimes.includes(mime)) {
        errors.push(
          `Invalid MIME type "${raw.file_type}" for file extension ".${detectedExtension}" (MIME mismatch). Expected one of: ${allowedMimes.join(', ')}.`
        );
      }
    }
  }

  // 4. File Size Validation (when provided)
  if (raw.file_size !== undefined && raw.file_size !== null) {
    if (typeof raw.file_size !== 'number' || isNaN(raw.file_size)) {
      errors.push('Field "file_size" must be a valid number of bytes.');
    } else if (raw.file_size < 0) {
      errors.push('Field "file_size" cannot be negative.');
    } else {
      const maxLimit = getMaxFileSizeBytes();
      if (raw.file_size > maxLimit) {
        const maxMb = Math.round(maxLimit / (1024 * 1024));
        errors.push(
          `File size (${raw.file_size} bytes) exceeds the maximum allowed limit of ${maxLimit} bytes (${maxMb}MB).`
        );
      }
    }
  }

  // 5. File Path Validation (when provided)
  if (raw.file_path !== undefined && raw.file_path !== null) {
    if (typeof raw.file_path !== 'string') {
      errors.push('Field "file_path" must be a string.');
    } else {
      const pathCheck = validateStoragePath(raw.file_path);
      if (!pathCheck.valid) {
        errors.push(pathCheck.error || 'Invalid storage file_path.');
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    detectedExtension,
    sanitizedFileName: sanitized,
  };
}

/**
 * Storage Abstraction: Uploads a file to Supabase Storage.
 * 
 * Safety:
 * - Validates target path against directory traversal.
 * - Uses configured bucket or parameter bucket.
 * - Never logs raw file contents.
 */
export async function uploadFile(
  params: StorageUploadParams,
  client?: SupabaseClient | any
): Promise<StorageUploadResult> {
  const bucketCheck = validateBucketName(params.bucket);
  if (!bucketCheck.valid) {
    return {
      success: false,
      path: null,
      bucket: params.bucket || '',
      publicUrl: null,
      error: bucketCheck.error || 'Invalid bucket name.',
    };
  }
  const bucket = bucketCheck.bucket;

  const pathCheck = validateStoragePath(params.path);
  if (!pathCheck.valid) {
    return {
      success: false,
      path: null,
      bucket,
      publicUrl: null,
      error: pathCheck.error || 'Invalid storage path.',
    };
  }

  const resolvedClient = client || getSupabaseClient();
  if (!resolvedClient) {
    return {
      success: false,
      path: null,
      bucket,
      publicUrl: null,
      error: 'Supabase storage client is unavailable.',
    };
  }

  try {
    const { error: uploadError } = await resolvedClient.storage
      .from(bucket)
      .upload(params.path, params.data, {
        contentType: params.contentType,
        upsert: params.upsert ?? false,
        metadata: params.metadata,
      });

    if (uploadError) {
      return {
        success: false,
        path: null,
        bucket,
        publicUrl: null,
        error: `Storage upload failed: ${uploadError.message}`,
      };
    }

    const { data: publicUrlData } = resolvedClient.storage.from(bucket).getPublicUrl(params.path);

    return {
      success: true,
      path: params.path,
      bucket,
      publicUrl: publicUrlData?.publicUrl || null,
    };
  } catch (err: any) {
    return {
      success: false,
      path: null,
      bucket,
      publicUrl: null,
      error: `Unexpected storage upload error: ${err?.message || String(err)}`,
    };
  }
}

/**
 * Storage Abstraction: Deletes a file from Supabase Storage.
 * 
 * Safety:
 * - Validates target bucket and path.
 * - Only deletes the explicitly requested file path.
 * - Never deletes arbitrary bucket paths or wildcards.
 */
export async function deleteFile(
  params: StorageDeleteParams,
  client?: SupabaseClient | any
): Promise<StorageDeleteResult> {
  const bucketCheck = validateBucketName(params.bucket);
  if (!bucketCheck.valid) {
    return {
      success: false,
      path: params.path,
      bucket: params.bucket || '',
      error: bucketCheck.error || 'Invalid bucket name.',
    };
  }
  const bucket = bucketCheck.bucket;

  const pathCheck = validateStoragePath(params.path);
  if (!pathCheck.valid) {
    return {
      success: false,
      path: params.path,
      bucket,
      error: pathCheck.error || 'Invalid storage path.',
    };
  }

  const resolvedClient = client || getSupabaseClient();
  if (!resolvedClient) {
    return {
      success: false,
      path: params.path,
      bucket,
      error: 'Supabase storage client is unavailable.',
    };
  }

  try {
    const { error } = await resolvedClient.storage.from(bucket).remove([params.path]);
    if (error) {
      return {
        success: false,
        path: params.path,
        bucket,
        error: `Storage deletion failed: ${error.message}`,
      };
    }

    return {
      success: true,
      path: params.path,
      bucket,
    };
  } catch (err: any) {
    return {
      success: false,
      path: params.path,
      bucket,
      error: `Unexpected storage deletion error: ${err?.message || String(err)}`,
    };
  }
}

/**
 * Storage Abstraction: Retrieves the public file URL with strict visibility enforcement.
 * 
 * CRITICAL PUBLIC ACCESS DIRECTIVE:
 * The website must only expose files associated with content that is:
 * status = 'published' AND visibility = 'public'
 * 
 * Files belonging to draft, archived, registered, or premium content are protected
 * and will return isAccessible: false unless explicitly permitted.
 */
export function getFileUrl(
  storagePath: string,
  context?: StorageUrlContext,
  client?: SupabaseClient | any
): StorageFileUrlResult {
  const pathCheck = validateStoragePath(storagePath);
  if (!pathCheck.valid) {
    return {
      isAccessible: false,
      url: null,
      path: storagePath,
      reason: pathCheck.error || 'Invalid storage path.',
    };
  }

  // Enforce publication and visibility rule
  if (context) {
    if (context.status !== 'published') {
      return {
        isAccessible: false,
        url: null,
        path: storagePath,
        reason: `Access denied: Content is in "${context.status}" status. Only published content can expose public file URLs.`,
      };
    }

    if (context.visibility !== 'public') {
      return {
        isAccessible: false,
        url: null,
        path: storagePath,
        reason: `Access denied: Content visibility is "${context.visibility}". Only public content can expose public file URLs.`,
      };
    }
  }

  const bucket = getStorageBucketName();
  const resolvedClient = client || getSupabaseClient();

  if (!resolvedClient) {
    return {
      isAccessible: false,
      url: null,
      path: storagePath,
      reason: 'Supabase client is unavailable.',
    };
  }

  const { data } = resolvedClient.storage.from(bucket).getPublicUrl(storagePath);

  return {
    isAccessible: true,
    url: data?.publicUrl || null,
    path: storagePath,
  };
}

// ==============================================================================
// STEP 12: SECURE TEMPORARY SIGNED URLS & ACCESS CONTROL LAYER
// ==============================================================================

/**
 * Extracts a normalized relative storage path from a content item's file_url.
 * Strips hostnames, query strings, and bucket name prefixes.
 */
export function extractStoragePathFromContent(content: { file_url?: string | null; [key: string]: any }): string | null {
  if (!content || !content.file_url || typeof content.file_url !== 'string') {
    return null;
  }

  let raw = content.file_url.trim();
  if (raw.length === 0) {
    return null;
  }

  // Remove query parameters
  raw = raw.split('?')[0];

  const canonicalBucket = getStorageBucketName();

  // If path contains /<bucket-name>/, take everything after it
  const bucketSubstr = `/${canonicalBucket}/`;
  const bucketIndex = raw.indexOf(bucketSubstr);
  if (bucketIndex !== -1) {
    raw = raw.substring(bucketIndex + bucketSubstr.length);
  } else if (raw.toLowerCase().startsWith(`${canonicalBucket.toLowerCase()}/`)) {
    raw = raw.substring(canonicalBucket.length + 1);
  }

  // Remove leading slashes
  raw = raw.replace(/^[/\\]+/, '');

  return raw.length > 0 ? raw : null;
}

/**
 * Secure Temporary Signed URL Generation.
 * 
 * Architecture Principle:
 * Because the bucket content-files is PRIVATE:
 * - Public URLs are NOT generated or used.
 * - Generates temporary time-limited signed URLs via Supabase Storage.
 * - Validates the target path and bucket against traversal and injection attacks.
 * - Enforces configurable expiry with safe bounds [60s, 86400s].
 */
export async function createSignedFileUrl(
  params: SignedUrlParams,
  client?: SupabaseClient | any
): Promise<SignedUrlResult> {
  // 1. Bucket Validation (rejects arbitrary buckets)
  const bucketCheck = validateBucketName(params.bucket);
  if (!bucketCheck.valid) {
    return {
      success: false,
      signedUrl: null,
      path: params.path,
      bucket: params.bucket || '',
      expiresIn: 0,
      expiresAt: null,
      errorCode: 'INVALID_BUCKET',
      error: bucketCheck.error || 'Invalid bucket requested.',
    };
  }
  const bucket = bucketCheck.bucket;

  // 2. Path Validation (rejects traversal, drive letters, control characters)
  const pathCheck = validateStoragePath(params.path);
  if (!pathCheck.valid) {
    return {
      success: false,
      signedUrl: null,
      path: params.path,
      bucket,
      expiresIn: 0,
      expiresAt: null,
      errorCode: 'INVALID_STORAGE_PATH',
      error: pathCheck.error || 'Invalid storage path.',
    };
  }

  // 3. Expiry Bounds
  const requestedExpires = params.expiresIn ?? DEFAULT_SIGNED_URL_EXPIRES_IN_SECONDS;
  const expiresIn = Math.min(
    Math.max(requestedExpires, MIN_SIGNED_URL_EXPIRES_IN_SECONDS),
    MAX_SIGNED_URL_EXPIRES_IN_SECONDS
  );

  // 4. Resolve Client
  const resolvedClient = client || getSupabaseClient();
  if (!resolvedClient) {
    return {
      success: false,
      signedUrl: null,
      path: params.path,
      bucket,
      expiresIn,
      expiresAt: null,
      errorCode: 'STORAGE_OPERATION_FAILED',
      error: 'Supabase storage client is unavailable.',
    };
  }

  try {
    const { data, error } = await resolvedClient.storage
      .from(bucket)
      .createSignedUrl(params.path, expiresIn);

    if (error || !data?.signedUrl) {
      return {
        success: false,
        signedUrl: null,
        path: params.path,
        bucket,
        expiresIn,
        expiresAt: null,
        errorCode: 'SIGNED_URL_GENERATION_FAILED',
        error: error ? `Failed to generate signed URL: ${error.message}` : 'No signed URL returned.',
      };
    }

    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    return {
      success: true,
      signedUrl: data.signedUrl,
      path: params.path,
      bucket,
      expiresIn,
      expiresAt,
    };
  } catch (err: any) {
    return {
      success: false,
      signedUrl: null,
      path: params.path,
      bucket,
      expiresIn,
      expiresAt: null,
      errorCode: 'STORAGE_OPERATION_FAILED',
      error: 'An unexpected error occurred during signed URL generation.',
    };
  }
}

/**
 * Access-Control Abstraction for Content File Access.
 * 
 * Enforces Platform Security Model:
 * 
 * 1. PUBLIC FILE:
 *    status = 'published' AND visibility = 'public'
 *    Allowed for unauthenticated public requests.
 * 
 * 2. REGISTERED FILE:
 *    status = 'published' AND visibility = 'registered'
 *    Requires an authenticated user context (user !== null).
 * 
 * 3. PREMIUM FILE:
 *    status = 'published' AND visibility = 'premium'
 *    Requires an authenticated user who passes the premium authorization check.
 *    (Clean interface boundary without inventing fake subscription/payment systems).
 * 
 * 4. DRAFT CONTENT:
 *    Must never be publicly accessible (returns 403 DRAFT_PROTECTED).
 * 
 * 5. ARCHIVED CONTENT:
 *    Must not be publicly accessible (returns 403 ARCHIVED_PROTECTED).
 */
export function evaluateContentFileAccess(
  content: {
    status: ContentStatus | string;
    visibility: ContentVisibility | string;
    file_url?: string | null;
    [key: string]: any;
  },
  user?: AccessUser | null
): StorageAccessDecision {
  // 1. Status Evaluation
  if (content.status === 'draft') {
    return {
      allowed: false,
      statusCode: 403,
      errorCode: 'DRAFT_PROTECTED',
      reason: 'Access denied: Draft content files are protected and cannot be accessed.',
    };
  }

  if (content.status === 'archived') {
    return {
      allowed: false,
      statusCode: 403,
      errorCode: 'ARCHIVED_PROTECTED',
      reason: 'Access denied: Archived content files are not publicly accessible.',
    };
  }

  if (content.status !== 'published') {
    return {
      allowed: false,
      statusCode: 403,
      errorCode: 'FORBIDDEN',
      reason: `Access denied: Content is in "${content.status}" status. Only published content files can be accessed.`,
    };
  }

  // 2. Visibility Evaluation (for published content)
  if (content.visibility === 'public') {
    return {
      allowed: true,
      statusCode: 200,
    };
  }

  if (content.visibility === 'registered') {
    if (!user || !user.id) {
      return {
        allowed: false,
        statusCode: 401,
        errorCode: 'UNAUTHORIZED',
        reason: 'Authentication required: This file is restricted to registered members.',
      };
    }

    return {
      allowed: true,
      statusCode: 200,
    };
  }

  if (content.visibility === 'premium') {
    if (!user || !user.id) {
      return {
        allowed: false,
        statusCode: 401,
        errorCode: 'UNAUTHORIZED',
        reason: 'Authentication required: This file requires a registered account with premium authorization.',
      };
    }

    // Clean authorization boundary: checks whether user is authorized for premium
    if (user.hasPremiumAccess !== true) {
      return {
        allowed: false,
        statusCode: 403,
        errorCode: 'FORBIDDEN',
        reason: 'Forbidden: Premium authorization required to access this resource.',
      };
    }

    return {
      allowed: true,
      statusCode: 200,
    };
  }

  return {
    allowed: false,
    statusCode: 403,
    errorCode: 'FORBIDDEN',
    reason: `Access denied: Unsupported visibility level "${content.visibility}".`,
  };
}

/**
 * Service Layer: Resolves a content item by ID or slug, verifies content status & visibility,
 * validates the associated file storage path, and generates a temporary signed URL.
 * 
 * Safety:
 * - Never returns public URLs for the private bucket.
 * - Enforces content publication and visibility requirements.
 * - Verifies that any requested storage path strictly matches the content's associated file.
 * - Never leaks internal database errors or secrets.
 */
export async function getSecureContentFileUrl(options: {
  identifier: string; // Content ID or slug
  requestedPath?: string; // Optional path supplied by caller to verify against content
  user?: AccessUser | null;
  expiresIn?: number;
  client?: SupabaseClient | any;
}): Promise<SecureContentFileResponse> {
  const { identifier, requestedPath, user, expiresIn, client } = options;

  if (!identifier || typeof identifier !== 'string' || identifier.trim().length === 0) {
    return {
      success: false,
      errorCode: 'CONTENT_NOT_FOUND',
      error: 'Content identifier must be a non-empty string.',
    };
  }

  const cleanIdentifier = identifier.trim();
  const resolvedClient = client || getSupabaseClient();

  if (!resolvedClient) {
    return {
      success: false,
      errorCode: 'STORAGE_OPERATION_FAILED',
      error: 'Database and storage service is unavailable.',
    };
  }

  try {
    // 1. Look up content item by ID or Slug
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanIdentifier);
    let query = resolvedClient.from('content').select('*');

    if (isUuid) {
      query = query.eq('id', cleanIdentifier);
    } else {
      query = query.eq('slug', cleanIdentifier);
    }

    const { data: content, error: queryError } = await query.maybeSingle();

    if (queryError) {
      return {
        success: false,
        errorCode: 'STORAGE_OPERATION_FAILED',
        error: 'Failed to query content record.',
      };
    }

    if (!content) {
      return {
        success: false,
        errorCode: 'CONTENT_NOT_FOUND',
        error: `Content item "${cleanIdentifier}" was not found.`,
      };
    }

    // 2. Evaluate access permissions based on publication status & visibility
    const decision = evaluateContentFileAccess(content, user);
    if (!decision.allowed) {
      return {
        success: false,
        errorCode: decision.errorCode,
        error: decision.reason,
      };
    }

    // 3. Extract and verify storage path from content record
    const storagePath = extractStoragePathFromContent(content);
    if (!storagePath) {
      return {
        success: false,
        errorCode: 'FILE_NOT_FOUND',
        error: `No file resource is attached to content item "${cleanIdentifier}".`,
      };
    }

    // 4. Verify requestedPath if provided by client (anti-tampering check)
    if (requestedPath && typeof requestedPath === 'string') {
      const cleanRequested = requestedPath.trim();
      if (cleanRequested !== storagePath) {
        return {
          success: false,
          errorCode: 'INVALID_STORAGE_PATH',
          error: 'The requested storage path does not match the file associated with this content.',
        };
      }
    }

    // 5. Generate secure temporary signed URL
    const signedResult = await createSignedFileUrl(
      {
        path: storagePath,
        expiresIn,
      },
      resolvedClient
    );

    if (!signedResult.success || !signedResult.signedUrl) {
      return {
        success: false,
        errorCode: signedResult.errorCode || 'SIGNED_URL_GENERATION_FAILED',
        error: signedResult.error || 'Failed to generate temporary signed URL.',
      };
    }

    // 6. Return only non-sensitive metadata and signed URL
    const fileName = sanitizeFileName(storagePath.split('/').pop() || 'file');

    return {
      success: true,
      signedUrl: signedResult.signedUrl,
      expiresIn: signedResult.expiresIn,
      expiresAt: signedResult.expiresAt,
      fileName,
    };
  } catch (err: any) {
    return {
      success: false,
      errorCode: 'STORAGE_OPERATION_FAILED',
      error: 'An unexpected error occurred while resolving the content file URL.',
    };
  }
}
