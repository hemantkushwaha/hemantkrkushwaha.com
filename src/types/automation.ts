/**
 * Automation Ingestion Types and Contract Definitions
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Step 14 — Automation Contract & External Ingestion Interface
 * 
 * Defines:
 * - Automation Manifest Contract (v1.0)
 * - Source Metadata Boundary
 * - Source Adapter Interface for future external integrations (NotebookLM, Google Slides, Google AI Studio, Google Drive)
 * - Standardized API Response & Error Contracts
 * - Request-Level Idempotency Boundary
 */

import {
  ContentManifest,
  ManifestSection,
  ManifestContentType,
  ManifestRelatedContent,
} from './manifest.js';
import { ContentVisibility } from './content.js';

/**
 * Standard supported manifest version.
 * Currently only "1.0" is supported.
 */
export const SUPPORTED_MANIFEST_VERSIONS = ['1.0'] as const;
export type SupportedManifestVersion = (typeof SUPPORTED_MANIFEST_VERSIONS)[number];

/**
 * Known external systems for source metadata.
 * Note: Extensible string union allows new trusted automation systems.
 */
export type AutomationSourceSystem =
  | 'notebooklm'
  | 'google-slides'
  | 'google-ai-studio'
  | 'google-drive'
  | 'manual'
  | (string & {});

/**
 * Source Metadata Boundary
 * 
 * Optional metadata identifying the source system.
 * CRITICAL ARCHITECTURAL RULE:
 * Source metadata must NEVER affect content classification.
 * The system must NOT automatically infer section, category, topic, or content_type from the source.
 * The user-controlled manifest remains authoritative.
 */
export interface AutomationSourceMetadata {
  system: AutomationSourceSystem;
  source_id?: string;
  source_url?: string;
  source_name?: string;
  generated_at?: string;
}

/**
 * Part B & C: Normalized NotebookLM Source Input
 * 
 * Represents material exported or generated from NotebookLM accompanied
 * by caller-provided, non-negotiable taxonomy metadata.
 * 
 * Taxonomical fields (section, category, topic, content_type, title)
 * MUST be explicitly provided by the caller. The adapter will NEVER
 * infer or alter them.
 */
export interface NotebookLMSourceInput {
  // Required user-controlled taxonomy (Part C)
  section: ManifestSection | string;
  category: string;
  topic: string;
  content_type: ManifestContentType | string;
  title: string;

  // Optional taxonomy/presentation
  subcategory?: string;
  description?: string;

  // Educational content exported from NotebookLM (Part B)
  body?: string;
  content?: string; // Accepted synonym for body

  // Metadata tags
  tags?: string[];

  // Source provenance tracking (Part B & G)
  source_id?: string;
  source_reference?: string; // Accepted synonym for source_id
  source_name?: string;
  source_url?: string;
  generated_at?: string;

  // Access control and visibility (optional)
  language?: string;
  visibility?: ContentVisibility;
  is_featured?: boolean;
  published?: boolean;
  external_url?: string;

  // File metadata (Part F - preserved without uploading)
  file_name?: string;
  file_type?: string;
  file_size?: number;
  file_data?: Buffer | Uint8Array;
}

/**
 * Formal Automation Manifest Contract (Version 1.0)
 * 
 * Single source of truth for automated content placement.
 * Required:
 * - manifest_version ("1.0")
 * - section
 * - category
 * - topic
 * - content_type
 * - title
 * 
 * Optional:
 * - subcategory
 * - description
 * - body
 * - tags
 * - language
 * - visibility
 * - is_featured
 * - external_url
 * - source_url
 * - file_name
 * - file_type
 * - file_size
 * - related_content
 * - published
 * - source
 */
export interface AutomationManifest extends ContentManifest {
  manifest_version: SupportedManifestVersion;
  source?: AutomationSourceMetadata;
  body?: string;
}

/**
 * Automation Validation Result
 */
export interface AutomationManifestValidationResult {
  valid: boolean;
  errors: string[];
  errorCode?: AutomationErrorCode;
}

/**
 * Standard Error Codes for External Ingestion Interface
 */
export type AutomationErrorCode =
  | 'INVALID_MANIFEST'
  | 'MALFORMED_REQUEST'
  | 'MISSING_MANIFEST_VERSION'
  | 'UNSUPPORTED_MANIFEST_VERSION'
  | 'MISSING_REQUIRED_FIELD'
  | 'INVALID_SECTION'
  | 'INVALID_CATEGORY'
  | 'INVALID_TOPIC'
  | 'INVALID_CONTENT_TYPE'
  | 'INVALID_TITLE'
  | 'INVALID_SOURCE_METADATA'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'CONFLICT_DUPLICATE_SLUG'
  | 'PAYLOAD_TOO_LARGE'
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'INTERNAL_SERVER_ERROR'
  | 'SERVICE_UNAVAILABLE';

/**
 * Standardized API Error Structure (Part G)
 */
export interface AutomationErrorDetail {
  code: AutomationErrorCode | string;
  message: string;
}

export interface AutomationErrorResponse {
  success: false;
  error: AutomationErrorDetail | string;
  error_details?: AutomationErrorDetail;
  errors?: string[];
  slug?: string;
}

/**
 * Standardized File Response (Part F)
 * File information only appears when a file was supplied.
 */
export interface AutomationResponseFile {
  name: string;
  type: string;
  size: number;
  path: string;
}

/**
 * Standardized Success Response Data (Part F)
 */
export interface AutomationResponseData {
  content_id?: string;
  slug: string;
  title: string;
  file?: AutomationResponseFile;
}

/**
 * Standardized Success Response Structure (Part F)
 */
export interface AutomationSuccessResponse {
  success: true;
  data: AutomationResponseData;
  // Backward compatibility fields
  contentId?: string;
  id?: string;
  slug: string;
  title: string;
  fileUploaded?: boolean;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  storagePath?: string;
  filePath?: string;
}

/**
 * Part H: Source Adapter Boundary
 * 
 * Abstract contracts for future source adapters:
 * External Source → Source Adapter → Content Manifest (v1.0) → Existing Ingestion API
 * 
 * These adapters are NOT implemented yet, only their clean interfaces are defined.
 */
export interface RawSourceInput<T = unknown> {
  system: AutomationSourceSystem;
  payload: T;
  sourceUrl?: string;
  sourceId?: string;
}

export interface AdaptedManifestResult {
  manifest: AutomationManifest;
  fileResource?: {
    fileName: string;
    fileType: string;
    fileSize: number;
    data: Buffer | Uint8Array;
  };
}

export interface SourceAdapter<TInput = unknown> {
  readonly system: AutomationSourceSystem;
  adapt(input: RawSourceInput<TInput>): Promise<AdaptedManifestResult> | AdaptedManifestResult;
}

// Typed adapter boundary definitions for source implementations
export interface NotebookLMAdapter<TInput = any> extends SourceAdapter<TInput> {
  readonly system: 'notebooklm';
  adapt(
    input: RawSourceInput<TInput> | any
  ): Promise<AdaptedManifestResult> | AdaptedManifestResult;
}

export interface GoogleSlidesAdapter extends SourceAdapter {
  readonly system: 'google-slides';
}

export interface GoogleAIStudioAdapter extends SourceAdapter {
  readonly system: 'google-ai-studio';
}

export interface GoogleDriveAdapter extends SourceAdapter {
  readonly system: 'google-drive';
}
