/**
 * Google Drive Source Adapter Foundation
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Step 21 — Google Drive Source Adapter Foundation
 * 
 * Boundary & Single Responsibility:
 * External Google Drive Source Object → Normalized Ingestion Boundary → Canonical Content Manifest v1.0
 * 
 * ARCHITECTURAL INVARIANTS:
 * 1. Adapter Foundation Only: Step 21 does NOT connect to Google Drive.
 * 2. Zero Network & API Calls: The adapter never imports googleapis, never calls Google Drive REST APIs,
 *    never uses fetch/axios/http, and never accesses external networks.
 * 3. Zero OAuth / Credentials: The adapter does not read GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,
 *    refresh tokens, access tokens, or browser cookies/sessions.
 * 4. User Taxonomy Supremacy: The caller's provided section, category, topic, content_type,
 *    and title are NEVER guessed, inferred, or modified based on folder names, file names,
 *    MIME types, or Google Drive metadata.
 * 5. Content Preservation: Caller-provided content/body is preserved verbatim (no AI rewriting,
 *    summarization, translation, or alteration of Markdown, LaTeX, code blocks, or tables).
 * 6. Google-Native Distinction: Accurately differentiates Google-native files (Docs, Sheets, Slides)
 *    from binary files (PDF, DOCX, PPTX, images, videos), documenting future export requirements.
 * 7. Single Validation Engine: Delegates strictly to canonical validateAutomationManifest.
 * 8. Zero Browser Automation: No Puppeteer, Playwright, Selenium, or cookie harvesting.
 */

import {
  AutomationManifest,
  AutomationErrorCode,
  GoogleDriveAdapter,
  GoogleDriveSourceInput,
  AdaptedManifestResult,
  RawSourceInput,
  AutomationSourceMetadata,
} from '../../types/automation.js';
import { validateAutomationManifest } from '../manifestService.js';
import { ManifestSection, ManifestContentType } from '../../types/manifest.js';
import {
  SUPPORTED_FILE_EXTENSIONS,
  DEFAULT_MAX_FILE_SIZE_BYTES,
  SupportedFileExtension,
} from '../storageService.js';

/**
 * Official Google-native MIME types
 */
export const GOOGLE_DRIVE_NATIVE_MIME_TYPES = {
  DOCUMENT: 'application/vnd.google-apps.document',
  SPREADSHEET: 'application/vnd.google-apps.spreadsheet',
  PRESENTATION: 'application/vnd.google-apps.presentation',
  FORM: 'application/vnd.google-apps.form',
  DRAWING: 'application/vnd.google-apps.drawing',
  FOLDER: 'application/vnd.google-apps.folder',
  SHORTCUT: 'application/vnd.google-apps.shortcut',
  SCRIPT: 'application/vnd.google-apps.script',
} as const;

export type GoogleNativeMimeType =
  (typeof GOOGLE_DRIVE_NATIVE_MIME_TYPES)[keyof typeof GOOGLE_DRIVE_NATIVE_MIME_TYPES];

/**
 * Standard binary MIME types supported by the platform file ingestion pipeline
 */
export const GOOGLE_DRIVE_BINARY_MIME_TYPES = {
  PDF: 'application/pdf',
  DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  DOC: 'application/msword',
  PPTX: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  PPT: 'application/vnd.ms-powerpoint',
  PNG: 'image/png',
  JPEG: 'image/jpeg',
  JPG: 'image/jpeg',
  WEBP: 'image/webp',
  MP4: 'video/mp4',
  WEBM: 'video/webm',
} as const;

/**
 * Export specifications for Google-native documents.
 * Google Docs, Sheets, and Slides cannot be downloaded directly as binary blobs;
 * future Google Drive API integrations must call official export endpoints:
 * drive.files.export({ fileId, mimeType: ... })
 */
export const GOOGLE_NATIVE_EXPORT_TARGETS: Record<string, readonly string[]> = {
  [GOOGLE_DRIVE_NATIVE_MIME_TYPES.DOCUMENT]: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown',
  ],
  [GOOGLE_DRIVE_NATIVE_MIME_TYPES.SPREADSHEET]: [
    'application/pdf',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
  [GOOGLE_DRIVE_NATIVE_MIME_TYPES.PRESENTATION]: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
  ],
};

/**
 * Checks whether a MIME type represents an internal Google-native document
 */
export function isGoogleNativeDocument(mimeType?: string): boolean {
  if (!mimeType) return false;
  const clean = mimeType.trim().toLowerCase();
  return (
    clean === GOOGLE_DRIVE_NATIVE_MIME_TYPES.DOCUMENT ||
    clean === GOOGLE_DRIVE_NATIVE_MIME_TYPES.SPREADSHEET ||
    clean === GOOGLE_DRIVE_NATIVE_MIME_TYPES.PRESENTATION ||
    clean === GOOGLE_DRIVE_NATIVE_MIME_TYPES.FORM ||
    clean === GOOGLE_DRIVE_NATIVE_MIME_TYPES.DRAWING ||
    clean === GOOGLE_DRIVE_NATIVE_MIME_TYPES.FOLDER ||
    clean === GOOGLE_DRIVE_NATIVE_MIME_TYPES.SHORTCUT ||
    clean === GOOGLE_DRIVE_NATIVE_MIME_TYPES.SCRIPT
  );
}

/**
 * Classifies a Google Drive item into:
 * - 'google-native': Google Docs, Sheets, Slides, etc. (requires official export in future API integration)
 * - 'binary': Standard downloadable binary files (PDF, DOCX, images, videos)
 * - 'unknown': Unrecognized MIME types
 */
export function classifyGoogleDriveItem(
  mimeType?: string
): 'google-native' | 'binary' | 'unknown' {
  if (!mimeType) return 'unknown';
  if (isGoogleNativeDocument(mimeType)) return 'google-native';
  const clean = mimeType.trim().toLowerCase();
  const binaryMimes = Object.values(GOOGLE_DRIVE_BINARY_MIME_TYPES);
  if (binaryMimes.includes(clean as any)) return 'binary';
  return 'unknown';
}

/**
 * Custom Error for Google Drive Adapter Rejections
 */
export class GoogleDriveAdapterError extends Error {
  readonly code: AutomationErrorCode;
  readonly errors: string[];

  constructor(
    message: string,
    code: AutomationErrorCode = 'INVALID_MANIFEST',
    errors: string[] = [message]
  ) {
    super(message);
    this.name = 'GoogleDriveAdapterError';
    this.code = code;
    this.errors = errors;
  }
}

/**
 * Result structure for non-throwing adapter invocations
 */
export type GoogleDriveAdapterTryResult =
  | { success: true; result: AdaptedManifestResult; errors: [] }
  | { success: false; errors: string[]; errorCode: AutomationErrorCode };

/**
 * Safe string normalization helper.
 * Trims outer whitespace; returns undefined for empty strings.
 */
function normalizeOptionalString(val: unknown): string | undefined {
  if (typeof val !== 'string') return undefined;
  const trimmed = val.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Safe number resolution helper for file sizes.
 * Handles numbers and numeric strings from Google Drive API v3.
 */
function resolveFileSize(payload: GoogleDriveSourceInput): number | undefined {
  if (typeof payload.file_size === 'number' && !isNaN(payload.file_size) && payload.file_size >= 0) {
    return payload.file_size;
  }
  if (typeof payload.size === 'number' && !isNaN(payload.size) && payload.size >= 0) {
    return payload.size;
  }
  if (typeof payload.size === 'string') {
    const parsed = parseInt(payload.size.trim(), 10);
    if (!isNaN(parsed) && parsed >= 0) {
      return parsed;
    }
  }
  return undefined;
}

/**
 * Normalizes tags safely:
 * - Trims each tag
 * - Discards empty tags
 * - Deduplicates tags case-insensitively while preserving original casing
 */
function normalizeTags(rawTags: unknown): string[] | undefined {
  if (!Array.isArray(rawTags)) return undefined;
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const item of rawTags) {
    if (typeof item === 'string') {
      const trimmed = item.trim();
      const lower = trimmed.toLowerCase();
      if (trimmed.length > 0 && !seen.has(lower)) {
        seen.add(lower);
        tags.push(trimmed);
      }
    }
  }
  return tags.length > 0 ? tags : undefined;
}

/**
 * Normalizes date to strict ISO-8601 string if valid.
 * If invalid, retains the original string so canonical validation flags it.
 */
function normalizeDate(rawDate: unknown): string | undefined {
  if (typeof rawDate !== 'string') return undefined;
  const trimmed = rawDate.trim();
  if (trimmed.length === 0) return undefined;
  const parsed = Date.parse(trimmed);
  if (isNaN(parsed)) {
    // Preserve malformed string for canonical validation rejection
    return trimmed;
  }
  return new Date(parsed).toISOString();
}

/**
 * Checks if a string ends with a supported binary file extension
 */
function hasSupportedBinaryExtension(name?: string): boolean {
  if (!name || typeof name !== 'string') return false;
  const lastDot = name.lastIndexOf('.');
  if (lastDot === -1 || lastDot === name.length - 1 || lastDot === 0) return false;
  const ext = name.slice(lastDot + 1).toLowerCase();
  return (SUPPORTED_FILE_EXTENSIONS as readonly string[]).includes(ext);
}

/**
 * Extracts payload whether wrapped in RawSourceInput or passed directly
 */
function extractSourcePayload(
  input: RawSourceInput<GoogleDriveSourceInput> | GoogleDriveSourceInput
): GoogleDriveSourceInput & { topLevelSourceUrl?: string; topLevelSourceId?: string } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new GoogleDriveAdapterError(
      'Malformed source input: expected a non-null JSON object.',
      'MALFORMED_REQUEST',
      ['Malformed source input: expected a non-null JSON object.']
    );
  }

  if ('payload' in input && input.payload && typeof input.payload === 'object') {
    const raw = input as RawSourceInput<GoogleDriveSourceInput>;
    return {
      ...raw.payload,
      topLevelSourceUrl: raw.sourceUrl,
      topLevelSourceId: raw.sourceId,
    };
  }

  return input as GoogleDriveSourceInput;
}

/**
 * Default Google Drive Adapter Implementation
 * 
 * Fulfills the SourceAdapter<GoogleDriveSourceInput> contract.
 * Pure transformation layer — strictly offline, no network, no credentials.
 */
export class DefaultGoogleDriveAdapter implements GoogleDriveAdapter {
  readonly system = 'google-drive' as const;

  /**
   * Adapts a Google Drive source input into a Canonical Content Manifest v1.0.
   * 
   * @param input RawSourceInput or direct GoogleDriveSourceInput
   * @returns AdaptedManifestResult containing valid AutomationManifest
   * @throws GoogleDriveAdapterError if validation fails or input is malformed
   */
  adapt(
    input: RawSourceInput<GoogleDriveSourceInput> | GoogleDriveSourceInput
  ): AdaptedManifestResult {
    const payload = extractSourcePayload(input);

    // 1. User-controlled taxonomy preservation (Section 2)
    // The adapter MUST NOT infer, guess, or reclassify section, category, topic, or content_type
    // from folder name, filename, MIME type, file contents, or Drive metadata.
    const section = typeof payload.section === 'string' ? payload.section.trim() : (payload.section as any);
    const category = typeof payload.category === 'string' ? payload.category.trim() : (payload.category as any);
    const topic = typeof payload.topic === 'string' ? payload.topic.trim() : (payload.topic as any);
    const contentType = typeof payload.content_type === 'string' ? payload.content_type.trim() : (payload.content_type as any);
    const title = typeof payload.title === 'string' ? payload.title.trim() : (payload.title as any);

    // 2. Safe normalization of optional presentation fields
    const subcategory = normalizeOptionalString(payload.subcategory);
    const description = normalizeOptionalString(payload.description);

    // 3. Body / Content preservation (Section 4)
    // Content is NEVER rewritten, summarized, translated, or altered.
    const rawBody = payload.body !== undefined ? payload.body : payload.content;
    const body = typeof rawBody === 'string' ? rawBody : undefined;

    const tags = normalizeTags(payload.tags);
    const language = normalizeOptionalString(payload.language);
    const visibility = payload.visibility;
    const isFeatured = payload.is_featured;
    const published = payload.published;
    const externalUrl = normalizeOptionalString(payload.external_url);

    // 4. Source metadata provenance (Section 3 & 8)
    // Resolves Google Drive identifiers from standard Drive v3 fields or generic fields
    const sourceId =
      normalizeOptionalString(payload.file_id) ||
      normalizeOptionalString(payload.id) ||
      normalizeOptionalString(payload.source_id) ||
      normalizeOptionalString(payload.topLevelSourceId);

    const sourceUrl =
      normalizeOptionalString(payload.web_view_link) ||
      normalizeOptionalString(payload.webViewLink) ||
      normalizeOptionalString(payload.source_url) ||
      normalizeOptionalString(payload.download_url) ||
      normalizeOptionalString(payload.webContentLink) ||
      normalizeOptionalString(payload.topLevelSourceUrl);

    const sourceName =
      normalizeOptionalString(payload.name) ||
      normalizeOptionalString(payload.source_name);

    const generatedAt =
      normalizeDate(payload.generated_at) ||
      normalizeDate(payload.modified_time) ||
      normalizeDate(payload.modifiedTime) ||
      normalizeDate(payload.created_time) ||
      normalizeDate(payload.createdTime);

    const source: AutomationSourceMetadata = {
      system: this.system,
      ...(sourceId ? { source_id: sourceId } : {}),
      ...(sourceUrl ? { source_url: sourceUrl } : {}),
      ...(sourceName ? { source_name: sourceName } : {}),
      ...(generatedAt ? { generated_at: generatedAt } : {}),
    };

    // 5. File & Document Handling (Section 5, 6, 7)
    const rawMimeType =
      normalizeOptionalString(payload.mime_type) ||
      normalizeOptionalString(payload.mimeType) ||
      normalizeOptionalString(payload.file_type);

    const isNativeDoc = isGoogleNativeDocument(rawMimeType);

    // Check file size limit (50 MB)
    const fileSize = resolveFileSize(payload);
    if (fileSize !== undefined && fileSize > DEFAULT_MAX_FILE_SIZE_BYTES) {
      throw new GoogleDriveAdapterError(
        `File size (${fileSize} bytes) exceeds the maximum allowed limit of 50 MB (${DEFAULT_MAX_FILE_SIZE_BYTES} bytes).`,
        'PAYLOAD_TOO_LARGE',
        [`File size (${fileSize} bytes) exceeds the maximum allowed limit of 50 MB (${DEFAULT_MAX_FILE_SIZE_BYTES} bytes).`]
      );
    }

    // Resolve binary file attachment if supplied
    const fileData = payload.file_data || payload.data;
    if (fileData && fileData.length > DEFAULT_MAX_FILE_SIZE_BYTES) {
      throw new GoogleDriveAdapterError(
        `File payload (${fileData.length} bytes) exceeds the maximum allowed limit of 50 MB (${DEFAULT_MAX_FILE_SIZE_BYTES} bytes).`,
        'PAYLOAD_TOO_LARGE',
        [`File payload (${fileData.length} bytes) exceeds the maximum allowed limit of 50 MB (${DEFAULT_MAX_FILE_SIZE_BYTES} bytes).`]
      );
    }

    // Resolve file name and MIME type for manifest
    // For Google-native documents without a converted binary attachment,
    // do NOT set invalid binary file attributes on the manifest.
    let fileName: string | undefined = normalizeOptionalString(payload.file_name);
    let fileType: string | undefined = normalizeOptionalString(payload.file_type);

    if (isNativeDoc) {
      if (!fileName || !hasSupportedBinaryExtension(fileName)) {
        fileName = undefined;
        fileType = undefined;
      }
    } else {
      if (!fileName) {
        if (payload.name && hasSupportedBinaryExtension(payload.name)) {
          fileName = payload.name.trim();
        }
      }
      if (fileName && !hasSupportedBinaryExtension(fileName)) {
        // If it's a text/markdown document converted to body, do not set invalid binary file attributes
        if (body !== undefined) {
          fileName = undefined;
          fileType = undefined;
        }
      }
    }

    if (!fileType && !isNativeDoc && fileName && hasSupportedBinaryExtension(fileName)) {
      fileType = rawMimeType;
    }

    // Construct Canonical Manifest (v1.0)
    const manifest: AutomationManifest = {
      manifest_version: '1.0',
      section: section as ManifestSection,
      category,
      topic,
      content_type: contentType as ManifestContentType,
      title,
      ...(subcategory ? { subcategory } : {}),
      ...(description ? { description } : {}),
      ...(body !== undefined ? { body } : {}),
      ...(tags && tags.length > 0 ? { tags } : {}),
      ...(language ? { language } : {}),
      ...(visibility ? { visibility } : {}),
      ...(isFeatured !== undefined ? { is_featured: isFeatured } : {}),
      ...(published !== undefined ? { published } : {}),
      ...(externalUrl ? { external_url: externalUrl } : {}),
      ...(sourceUrl ? { source_url: sourceUrl } : {}),
      ...(fileName
        ? {
            file_name: fileName,
            ...(fileType ? { file_type: fileType } : {}),
            ...(fileSize !== undefined ? { file_size: fileSize } : {}),
          }
        : {}),
      source,
    };

    // 6. Validation through canonical validation engine (Section 2 & 5)
    const validation = validateAutomationManifest(manifest);
    if (!validation.valid) {
      throw new GoogleDriveAdapterError(
        validation.errors[0] || 'Manifest validation failed.',
        validation.errorCode || 'INVALID_MANIFEST',
        validation.errors
      );
    }

    // 7. Optional file resource attachment (Preserved in memory, NOT uploaded)
    let fileResource: AdaptedManifestResult['fileResource'] = undefined;
    if (fileData && (Buffer.isBuffer(fileData) || fileData instanceof Uint8Array)) {
      fileResource = {
        fileName: fileName || 'google-drive-resource',
        fileType: fileType || rawMimeType || 'application/octet-stream',
        fileSize: fileSize ?? fileData.length,
        data: fileData,
      };
    }

    return {
      manifest,
      ...(fileResource ? { fileResource } : {}),
    };
  }

  /**
   * Safe non-throwing adaptation attempt
   */
  tryAdapt(
    input: RawSourceInput<GoogleDriveSourceInput> | GoogleDriveSourceInput
  ): GoogleDriveAdapterTryResult {
    try {
      const result = this.adapt(input);
      return {
        success: true,
        result,
        errors: [],
      };
    } catch (err) {
      if (err instanceof GoogleDriveAdapterError) {
        return {
          success: false,
          errors: err.errors,
          errorCode: err.code,
        };
      }
      return {
        success: false,
        errors: [(err as Error).message || 'Unknown adaptation error'],
        errorCode: 'INVALID_MANIFEST',
      };
    }
  }
}

export type { GoogleDriveAdapter } from '../../types/automation.js';

/**
 * Exported singleton instance
 */
export const googleDriveAdapter = new DefaultGoogleDriveAdapter();
