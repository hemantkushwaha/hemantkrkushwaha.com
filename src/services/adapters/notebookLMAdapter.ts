/**
 * NotebookLM Source Adapter Foundation
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Step 15 — NotebookLM Source Adapter Foundation
 * 
 * Boundary & Single Responsibility:
 * External NotebookLM Output → Normalized Source Object → Content Manifest v1.0
 * 
 * ARCHITECTURAL INVARIANTS:
 * 1. Zero Direct Database Access: The adapter never imports Supabase or writes to PostgreSQL.
 * 2. Zero Direct Storage Uploads: The adapter never uploads files or calls storage APIs.
 * 3. Ingestion Route Integrity: Ingestion continues solely through POST /api/ingest/content.
 * 4. User Taxonomy Supremacy: The caller's provided section, category, topic, content_type,
 *    and title are NEVER guessed, inferred, or modified.
 * 5. Single Validation Engine: Delegates to canonical validateAutomationManifest; does NOT duplicate validation.
 * 6. Zero Network / Browser Automation: No scraping, no fake APIs, no credentials.
 */

import {
  AutomationManifest,
  AutomationErrorCode,
  NotebookLMAdapter,
  NotebookLMSourceInput,
  AdaptedManifestResult,
  RawSourceInput,
  AutomationSourceMetadata,
} from '../../types/automation.js';
import {
  validateAutomationManifest,
} from '../manifestService.js';
import { ManifestSection, ManifestContentType } from '../../types/manifest.js';

/**
 * Custom Error for NotebookLM Adapter Rejections
 */
export class NotebookLMAdapterError extends Error {
  readonly code: AutomationErrorCode;
  readonly errors: string[];

  constructor(
    message: string,
    code: AutomationErrorCode = 'INVALID_MANIFEST',
    errors: string[] = [message]
  ) {
    super(message);
    this.name = 'NotebookLMAdapterError';
    this.code = code;
    this.errors = errors;
  }
}

/**
 * Result structure for non-throwing adapter invocations
 */
export type NotebookLMAdapterTryResult =
  | { success: true; result: AdaptedManifestResult; errors: [] }
  | { success: false; errors: string[]; errorCode: AutomationErrorCode };

/**
 * Safe string normalization helper
 * Trims outer whitespace; returns undefined for empty strings.
 */
function normalizeOptionalString(val: unknown): string | undefined {
  if (typeof val !== 'string') return undefined;
  const trimmed = val.trim();
  return trimmed.length > 0 ? trimmed : undefined;
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
 * Extracts payload whether wrapped in RawSourceInput or passed directly
 */
function extractSourcePayload(
  input: RawSourceInput<NotebookLMSourceInput> | NotebookLMSourceInput
): NotebookLMSourceInput & { topLevelSourceUrl?: string; topLevelSourceId?: string } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new NotebookLMAdapterError(
      'Malformed source input: expected a non-null JSON object.',
      'MALFORMED_REQUEST',
      ['Malformed source input: expected a non-null JSON object.']
    );
  }

  if ('payload' in input && input.payload && typeof input.payload === 'object') {
    const raw = input as RawSourceInput<NotebookLMSourceInput>;
    return {
      ...raw.payload,
      topLevelSourceUrl: raw.sourceUrl,
      topLevelSourceId: raw.sourceId,
    };
  }

  return input as NotebookLMSourceInput;
}

/**
 * Default NotebookLM Adapter Implementation
 * 
 * Fulfills the SourceAdapter<NotebookLMSourceInput> contract.
 */
export class DefaultNotebookLMAdapter implements NotebookLMAdapter {
  readonly system = 'notebooklm' as const;

  /**
   * Adapts a NotebookLM source input into a Canonical Content Manifest v1.0.
   * 
   * @param input RawSourceInput or direct NotebookLMSourceInput
   * @returns AdaptedManifestResult containing valid AutomationManifest
   * @throws NotebookLMAdapterError if validation fails or input is malformed
   */
  adapt(
    input: RawSourceInput<NotebookLMSourceInput> | NotebookLMSourceInput
  ): AdaptedManifestResult {
    const payload = extractSourcePayload(input);

    // 1. User-controlled taxonomy preservation (Part C)
    // The adapter MUST NOT infer, guess, or reclassify section, category, topic, or content_type
    const section = typeof payload.section === 'string' ? payload.section.trim() : (payload.section as any);
    const category = typeof payload.category === 'string' ? payload.category.trim() : (payload.category as any);
    const topic = typeof payload.topic === 'string' ? payload.topic.trim() : (payload.topic as any);
    const contentType = typeof payload.content_type === 'string' ? payload.content_type.trim() : (payload.content_type as any);
    const title = typeof payload.title === 'string' ? payload.title.trim() : (payload.title as any);

    // 2. Safe normalization of optional fields (Part H)
    const subcategory = normalizeOptionalString(payload.subcategory);
    const description = normalizeOptionalString(payload.description);
    
    // Body / Content preservation: Content is NEVER rewritten, summarized, or truncated (Part H)
    const rawBody = payload.body !== undefined ? payload.body : payload.content;
    const body = typeof rawBody === 'string' ? rawBody : undefined;

    const tags = normalizeTags(payload.tags);
    const language = normalizeOptionalString(payload.language);
    const visibility = payload.visibility;
    const isFeatured = payload.is_featured;
    const published = payload.published;
    const externalUrl = normalizeOptionalString(payload.external_url);

    // 3. Source metadata provenance (Part G)
    const sourceId =
      normalizeOptionalString(payload.source_id) ||
      normalizeOptionalString(payload.source_reference) ||
      normalizeOptionalString(payload.topLevelSourceId);
    
    const sourceUrl =
      normalizeOptionalString(payload.source_url) ||
      normalizeOptionalString(payload.topLevelSourceUrl);
    
    const sourceName = normalizeOptionalString(payload.source_name);
    const generatedAt = normalizeDate(payload.generated_at);

    const source: AutomationSourceMetadata = {
      system: this.system,
      ...(sourceId ? { source_id: sourceId } : {}),
      ...(sourceUrl ? { source_url: sourceUrl } : {}),
      ...(sourceName ? { source_name: sourceName } : {}),
      ...(generatedAt ? { generated_at: generatedAt } : {}),
    };

    // 4. File metadata preservation (Part F - no uploads performed)
    const fileName = normalizeOptionalString(payload.file_name);
    const fileType = normalizeOptionalString(payload.file_type);
    const fileSize = typeof payload.file_size === 'number' && payload.file_size >= 0 ? payload.file_size : undefined;

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
      ...(fileName ? { file_name: fileName } : {}),
      ...(fileType ? { file_type: fileType } : {}),
      ...(fileSize !== undefined ? { file_size: fileSize } : {}),
      source,
    };

    // 5. Validation through canonical validation engine (Part I)
    const validation = validateAutomationManifest(manifest);
    if (!validation.valid) {
      throw new NotebookLMAdapterError(
        validation.errors[0] || 'Manifest validation failed.',
        validation.errorCode || 'INVALID_MANIFEST',
        validation.errors
      );
    }

    // 6. Optional file resource attachment (Preserved in memory, NOT uploaded)
    let fileResource: AdaptedManifestResult['fileResource'] = undefined;
    const fileData = payload.file_data || (payload as any).data;
    if (fileData && (Buffer.isBuffer(fileData) || fileData instanceof Uint8Array)) {
      fileResource = {
        fileName: fileName || 'notebooklm-document',
        fileType: fileType || 'application/octet-stream',
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
    input: RawSourceInput<NotebookLMSourceInput> | NotebookLMSourceInput
  ): NotebookLMAdapterTryResult {
    try {
      const result = this.adapt(input);
      return {
        success: true,
        result,
        errors: [],
      };
    } catch (err) {
      if (err instanceof NotebookLMAdapterError) {
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

/**
 * Exported singleton instance
 */
export const notebookLMAdapter = new DefaultNotebookLMAdapter();
