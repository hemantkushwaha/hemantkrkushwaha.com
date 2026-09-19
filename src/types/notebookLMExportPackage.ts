/**
 * NotebookLM Export Package Types & Contract Definitions
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Step 17 — NotebookLM Export Package & Automation Workflow
 * 
 * Represents the standardized intermediate interchange package format for educational
 * and research materials prepared from NotebookLM prior to adaptation and ingestion.
 * 
 * ARCHITECTURAL BOUNDARY:
 * 1. The export package is an INPUT format.
 * 2. Content Manifest v1.0 remains the canonical internal format.
 * 3. User taxonomy (section, category, topic, content_type, title) is authoritative and non-negotiable.
 * 4. Content body is preserved semantically and textually verbatim (no AI summarization or rewriting).
 * 5. Zero direct database writes, zero file uploads, zero direct NotebookLM network calls.
 */

import { ManifestSection, ManifestContentType } from './manifest.js';
import { ContentVisibility } from './content.js';
import {
  AutomationErrorCode,
  AutomationManifest,
  AdaptedManifestResult,
  NotebookLMSourceInput,
} from './automation.js';

/**
 * Canonical Package Version
 * Currently strictly "1.0"
 */
export const NOTEBOOKLM_PACKAGE_VERSION = '1.0' as const;
export type NotebookLMPackageVersion = typeof NOTEBOOKLM_PACKAGE_VERSION;

export const SUPPORTED_NOTEBOOKLM_PACKAGE_VERSIONS = ['1.0'] as const;

/**
 * NotebookLM Source Provenance Block
 */
export interface NotebookLMExportPackageSource {
  system: 'notebooklm';
  source_id?: string;
  source_url?: string;
  source_name?: string;
  generated_at?: string;
}

/**
 * User-Controlled Taxonomy & Metadata Block
 * All taxonomy fields are caller-controlled and will never be inferred by AI.
 */
export interface NotebookLMExportPackageMetadata {
  // Required user-controlled taxonomy
  section: ManifestSection | string;
  category: string;
  topic: string;
  content_type: ManifestContentType | string;
  title: string;

  // Optional presentation and discovery metadata
  description?: string;
  tags?: string[];
  subcategory?: string;
  language?: string;
  visibility?: ContentVisibility;
  is_featured?: boolean;
  published?: boolean;
  external_url?: string;
}

/**
 * Educational / Research Content Block
 * Body must be preserved textually and structurally verbatim.
 */
export interface NotebookLMExportPackageContent {
  body: string;
}

/**
 * Optional File Attachment Resource Block
 * Carried in-memory only; never uploaded during package processing.
 */
export interface NotebookLMExportPackageFile {
  file_name?: string;
  file_type?: string;
  file_size?: number | string;
  file_data?: string | Buffer | Uint8Array;
  file_path?: string;
}

/**
 * Complete NotebookLM Export Package (v1.0)
 */
export interface NotebookLMExportPackage {
  package_version: NotebookLMPackageVersion | string;
  source: NotebookLMExportPackageSource;
  metadata: NotebookLMExportPackageMetadata;
  content: NotebookLMExportPackageContent;
  file?: NotebookLMExportPackageFile;
}

/**
 * Validation Result for Export Package
 */
export interface NotebookLMExportPackageValidationResult {
  valid: boolean;
  errors: string[];
  errorCode?: AutomationErrorCode;
}

/**
 * Conversion Result producing Canonical Content Manifest v1.0
 */
export interface NotebookLMExportPackageConversionResult {
  success: boolean;
  manifest?: AutomationManifest;
  fileResource?: AdaptedManifestResult['fileResource'];
  errors?: string[];
  errorCode?: AutomationErrorCode;
}
