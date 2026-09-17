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
