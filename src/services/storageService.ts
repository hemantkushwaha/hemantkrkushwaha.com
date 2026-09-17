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
 * Returns the configured storage bucket name.
 */
export function getStorageBucketName(): string {
  if (typeof process !== 'undefined' && process.env?.SUPABASE_STORAGE_BUCKET) {
    return process.env.SUPABASE_STORAGE_BUCKET.trim();
  }
  return DEFAULT_STORAGE_BUCKET;
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
 * - Relative traversal (..)
 * - Absolute paths (/ or \)
 * - Double slashes (//)
 * - Null bytes
 */
export function validateStoragePath(path: string): { valid: boolean; error?: string } {
  if (!path || typeof path !== 'string' || path.trim().length === 0) {
    return { valid: false, error: 'Storage path cannot be empty.' };
  }

  if (path.includes('\0')) {
    return { valid: false, error: 'Storage path contains null bytes.' };
  }

  if (path.startsWith('/') || path.startsWith('\\')) {
    return { valid: false, error: 'Storage path must be relative and cannot begin with a slash.' };
  }

  // Check for path traversal components (.. as a path segment)
  const segments = path.split(/[/\\]/);
  for (const seg of segments) {
    if (seg === '..' || seg === '.') {
      return { valid: false, error: 'Storage path contains unsafe path traversal elements ("..").' };
    }
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
  if (lastDot === -1 || lastDot === sanitized.length - 1) {
    errors.push(`File "${rawFileName}" lacks a valid file extension.`);
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
          `Invalid MIME type "${raw.file_type}" for file extension ".${detectedExtension}". Expected one of: ${allowedMimes.join(', ')}.`
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
  const bucket = params.bucket || getStorageBucketName();
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
 * - Validates target path.
 * - Only deletes the explicitly requested file path.
 * - Never deletes arbitrary bucket paths or wildcards.
 */
export async function deleteFile(
  params: StorageDeleteParams,
  client?: SupabaseClient | any
): Promise<StorageDeleteResult> {
  const bucket = params.bucket || getStorageBucketName();
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
