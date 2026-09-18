/**
 * Supabase Storage & File Ingestion Type Definitions
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Step 11 — File Ingestion Foundation
 */

import { ContentStatus, ContentVisibility } from './content';

/**
 * Standard supported file extensions across the knowledge platform.
 */
export const SUPPORTED_FILE_EXTENSIONS = [
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

export type SupportedFileExtension = (typeof SUPPORTED_FILE_EXTENSIONS)[number];

/**
 * Canonical MIME types mapped to supported file extensions.
 */
export const SUPPORTED_MIME_TYPES: Record<SupportedFileExtension, string[]> = {
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
 * Metadata representation of an ingesting file resource.
 * Pure metadata — never contains raw binary file contents.
 */
export interface FileMetadata {
  file_name: string;
  file_type?: string; // MIME type e.g., 'application/pdf'
  file_size?: number; // In bytes
  file_path?: string; // Target storage path
  source_url?: string; // Original source URL (Google Drive, etc.)
}

/**
 * Result of file metadata validation.
 */
export interface FileValidationResult {
  valid: boolean;
  errors: string[];
  detectedExtension: SupportedFileExtension | null;
  sanitizedFileName: string | null;
}

/**
 * Context for evaluating public URL accessibility.
 * Architectural rule: files are only publicly exposed if status = 'published' AND visibility = 'public'.
 */
export interface StorageUrlContext {
  status: ContentStatus;
  visibility: ContentVisibility;
}

/**
 * Parameters for uploading a file to storage.
 */
export interface StorageUploadParams {
  bucket?: string;
  path: string;
  data: Buffer | Uint8Array | Blob;
  contentType: string;
  metadata?: Record<string, string>;
  upsert?: boolean;
}

/**
 * Result of a file upload operation.
 */
export interface StorageUploadResult {
  success: boolean;
  path: string | null;
  bucket: string;
  publicUrl: string | null;
  error?: string;
}

/**
 * Parameters for deleting a file from storage.
 */
export interface StorageDeleteParams {
  bucket?: string;
  path: string;
}

/**
 * Result of a file deletion operation.
 */
export interface StorageDeleteResult {
  success: boolean;
  path: string;
  bucket: string;
  error?: string;
}

/**
 * Result of retrieving a file's public/signed URL.
 */
export interface StorageFileUrlResult {
  isAccessible: boolean;
  url: string | null;
  path: string;
  reason?: string;
}

// ==============================================================================
// STEP 12: STORAGE SECURITY & ACCESS LAYER TYPES
// ==============================================================================

/**
 * Storage Access Error Codes for clear, typed error handling.
 */
export type StorageAccessErrorCode =
  | 'CONTENT_NOT_FOUND'
  | 'FILE_NOT_FOUND'
  | 'INVALID_STORAGE_PATH'
  | 'INVALID_BUCKET'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'DRAFT_PROTECTED'
  | 'ARCHIVED_PROTECTED'
  | 'SIGNED_URL_GENERATION_FAILED'
  | 'STORAGE_OPERATION_FAILED';

/**
 * Abstract user representation for file access authorization.
 * Provides a clean boundary for future authentication & authorization systems
 * without inventing unrequested payment/subscription logic.
 */
export interface AccessUser {
  id: string;
  email?: string;
  role?: string;
  isRegistered?: boolean;
  hasPremiumAccess?: boolean;
}

/**
 * Authorization Decision returned by evaluateContentFileAccess().
 */
export interface StorageAccessDecision {
  allowed: boolean;
  statusCode: number; // 200, 401, 403, 404, etc.
  errorCode?: StorageAccessErrorCode;
  reason?: string;
}

/**
 * Parameters for generating a secure temporary signed URL.
 */
export interface SignedUrlParams {
  path: string;
  bucket?: string;
  expiresIn?: number; // In seconds (default: 900s / 15m)
}

/**
 * Result of generating a secure temporary signed URL.
 */
export interface SignedUrlResult {
  success: boolean;
  signedUrl: string | null;
  path: string;
  bucket: string;
  expiresIn: number;
  expiresAt: string | null; // ISO 8601 timestamp
  errorCode?: StorageAccessErrorCode;
  error?: string;
}

/**
 * Request options for secure content file URL generation.
 */
export interface SecureContentFileRequest {
  identifier: string; // Content ID or Content Slug
  requestedPath?: string; // Optional path supplied by caller to be validated against content
  user?: AccessUser | null; // Authenticated user context (if present)
  expiresIn?: number; // Requested expiry in seconds
}

/**
 * Response structure for secure content file URL endpoint.
 * Contains only non-sensitive metadata and temporary signed URL.
 */
export interface SecureContentFileResponse {
  success: boolean;
  signedUrl?: string | null;
  expiresIn?: number;
  expiresAt?: string | null;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  errorCode?: StorageAccessErrorCode;
  error?: string;
}
