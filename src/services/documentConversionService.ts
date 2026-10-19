/**
 * Document Conversion Service
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Step 27-ACTION-1 — Native Study Material Reader Foundation
 * 
 * Core Responsibilities:
 * - Convert DOCX binary buffers (from authenticated Google Drive) into structured, sanitized web content
 * - Preserve structural semantics: headings (h1-h6), paragraphs (p), lists (ol, ul, li), tables (table, tr, th, td), formatting (strong, em, b, i, u, s, code, pre, blockquote, hr)
 * - Strict HTML sanitization: Eliminate script tags, inline event handlers (onclick, onload), javascript: URLs, iframes, objects, embeds, and executable payloads
 * - Extract real headings with persistent anchor IDs for Table of Contents (TOC) generation
 * - Provide pure text representation and character/word statistics
 * - Invariants:
 *   - Pure structural conversion: No rewriting, no summarization, no generative AI hallucinations
 *   - ZERO Drive mutations: Never writes back to Google Drive
 *   - ZERO Supabase mutations: No database queries, inserts, or updates
 *   - ZERO Storage mutations: No uploads or buckets touched
 *   - ZERO ingestion calls: Never calls /api/automation/ingest
 */

import mammoth from 'mammoth';
import sanitizeHtml from 'sanitize-html';
import {
  ConvertedDocument,
  DocumentHeading,
  DocumentConversionOptions,
} from '../types/documentConversion.js';
import {
  googleDriveOAuthService,
  GoogleDriveOAuthService,
} from './googleDriveOAuthService.js';
import {
  googleDriveService,
  GoogleDriveService,
} from './googleDriveService.js';

export class DocumentConversionError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(code: string, message: string, statusCode: number = 400) {
    super(message);
    this.name = 'DocumentConversionError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * Clean and normalize a heading text to a stable, URL-safe anchor ID
 */
export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // remove non-alphanumeric except spaces & hyphens
    .trim()
    .replace(/\s+/g, '-') // spaces to hyphens
    .replace(/-+/g, '-') // collapse hyphens
    || 'heading';
}

/**
 * Strict HTML Sanitization Configuration
 * Enforces safe tags, attributes, and protocol schemes.
 */
export const SAFE_HTML_CONFIG: sanitizeHtml.IOptions = {
  allowedTags: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'br', 'hr',
    'ul', 'ol', 'li',
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
    'b', 'strong', 'i', 'em', 'u', 's', 'strike', 'code', 'pre', 'blockquote',
    'span', 'a',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    th: ['colspan', 'rowspan', 'scope', 'align'],
    td: ['colspan', 'rowspan', 'align'],
    h1: ['id'],
    h2: ['id'],
    h3: ['id'],
    h4: ['id'],
    h5: ['id'],
    h6: ['id'],
    p: ['id'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: {
    a: ['http', 'https', 'mailto'],
  },
  allowProtocolRelative: false,
  transformTags: {
    a: (tagName, attribs) => {
      // Ensure target="_blank" and rel="noopener noreferrer" on external links
      const href = attribs.href || '';
      // Disallow javascript: or data: completely
      if (href.trim().toLowerCase().startsWith('javascript:') || href.trim().toLowerCase().startsWith('data:')) {
        return {
          tagName: 'span',
          attribs: { class: 'disallowed-link' },
        };
      }
      return {
        tagName,
        attribs: {
          ...attribs,
          rel: 'noopener noreferrer',
        },
      };
    },
  },
};

/**
 * Sanitize raw HTML string according to strict security profile
 */
export function sanitizeDocumentHtml(rawHtml: string): string {
  if (!rawHtml || typeof rawHtml !== 'string') return '';
  return sanitizeHtml(rawHtml, SAFE_HTML_CONFIG);
}

/**
 * Extract structured headings from HTML and ensure heading elements contain valid id attributes
 */
export function extractHeadingsAndAnnotateHtml(html: string): {
  annotatedHtml: string;
  headings: DocumentHeading[];
} {
  const headings: DocumentHeading[] = [];
  const seenIds = new Set<string>();

  // Regular expression matching <h[1-6]> tags with any inner content
  const headingRegex = /<h([1-6])([^>]*)>([\s\S]*?)<\/h\1>/gi;

  const annotatedHtml = html.replace(headingRegex, (match, levelStr, existingAttrs, innerContent) => {
    const level = parseInt(levelStr, 10);
    // Strip any HTML tags inside the heading to get plain text
    const text = innerContent.replace(/<[^>]*>/g, '').trim();

    if (!text) {
      return match;
    }

    let baseId = slugifyHeading(text);
    let uniqueId = baseId;
    let counter = 1;
    while (seenIds.has(uniqueId)) {
      uniqueId = `${baseId}-${counter++}`;
    }
    seenIds.add(uniqueId);

    headings.push({
      id: uniqueId,
      text,
      level,
    });

    // Remove existing id if any and attach the unique verified id
    const attrsWithoutId = existingAttrs.replace(/\bid\s*=\s*(['"]).*?\1/gi, '').trim();
    const formattedAttrs = attrsWithoutId ? ` ${attrsWithoutId}` : '';

    return `<h${level}${formattedAttrs} id="${uniqueId}">${innerContent}</h${level}>`;
  });

  return { annotatedHtml, headings };
}

/**
 * Convert a DOCX Buffer to a ConvertedDocument structure
 */
export async function convertDocxBuffer(
  buffer: Buffer,
  options: DocumentConversionOptions
): Promise<ConvertedDocument> {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new DocumentConversionError(
      'INVALID_BUFFER',
      'Valid non-empty DOCX binary Buffer is required for conversion.'
    );
  }

  // 1. Convert DOCX to raw HTML using mammoth with standard semantic mappings
  let rawHtml = '';
  try {
    const result = await mammoth.convertToHtml(
      { buffer },
      {
        styleMap: [
          "p[style-name='Title'] => h1:fresh",
          "p[style-name='Subtitle'] => p.subtitle:fresh",
          "p[style-name='Heading 1'] => h1:fresh",
          "p[style-name='Heading 2'] => h2:fresh",
          "p[style-name='Heading 3'] => h3:fresh",
          "p[style-name='Heading 4'] => h4:fresh",
          "p[style-name='Heading 5'] => h5:fresh",
          "p[style-name='Heading 6'] => h6:fresh",
        ],
      }
    );
    rawHtml = result.value || '';
  } catch (err: any) {
    throw new DocumentConversionError(
      'CONVERSION_FAILED',
      `Failed to parse DOCX document: ${err.message}`
    );
  }

  // 2. Extract plain text representation using mammoth
  let plainText = '';
  try {
    const textResult = await mammoth.extractRawText({ buffer });
    plainText = textResult.value ? textResult.value.trim() : '';
  } catch {
    // Fallback: strip tags from rawHtml if extractRawText fails
    plainText = rawHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  // 3. Strict security sanitization
  const sanitizedHtml = sanitizeDocumentHtml(rawHtml);

  // 4. Extract headings and inject anchor IDs into HTML
  const { annotatedHtml, headings } = extractHeadingsAndAnnotateHtml(sanitizedHtml);

  // 5. Determine document title:
  // Precedence: options.customTitle -> prominent leading title paragraph -> first H1 -> first heading -> first line -> sourceFileName
  let title = options.customTitle;
  if (!title) {
    // If the document begins with a prominent Title paragraph (e.g. TRANSPORT LAYER: UDP AND TCP)
    const firstParagraphMatch = plainText.split('\n').map((l) => l.trim()).filter(Boolean)[0];
    if (firstParagraphMatch && firstParagraphMatch.length > 3 && firstParagraphMatch.length < 150) {
      title = firstParagraphMatch;
    } else {
      const firstH1 = headings.find((h) => h.level === 1 && h.text.toLowerCase() !== 'table of contents');
      if (firstH1 && firstH1.text) {
        title = firstH1.text;
      } else if (headings.length > 0) {
        title = headings[0].text;
      } else {
        title = options.sourceFileName;
      }
    }
  }

  // 6. Compute statistics
  const characterCount = plainText.length;
  const wordCount = plainText
    ? plainText.split(/\s+/).filter(Boolean).length
    : 0;

  return {
    title,
    html: annotatedHtml,
    plainText,
    headings,
    wordCount,
    characterCount,
    sourceFileId: options.sourceFileId,
    sourceFileName: options.sourceFileName,
    sourceMimeType:
      options.sourceMimeType ||
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    convertedAt: new Date().toISOString(),
  };
}

/**
 * Service to fetch a DOCX file directly from Google Drive using the authenticated
 * production Drive service, and convert it into a ConvertedDocument.
 */
export async function convertGoogleDriveDocxService(
  fileId: string,
  options: {
    customTitle?: string;
    oauthService?: GoogleDriveOAuthService;
    driveService?: GoogleDriveService;
  } = {}
): Promise<ConvertedDocument> {
  const oauthService = options.oauthService || googleDriveOAuthService;
  const driveService = options.driveService || googleDriveService;

  if (!fileId || typeof fileId !== 'string' || !fileId.trim()) {
    throw new DocumentConversionError(
      'INVALID_FILE_ID',
      'Valid Google Drive file ID is required.'
    );
  }

  const cleanId = fileId.trim();

  // 1. Get valid access token
  const accessToken = await oauthService.getValidAccessToken();
  driveService.setAccessToken(accessToken);

  // 2. Retrieve file metadata from Google Drive
  const metadata = await driveService.getFile(cleanId);

  // 3. Download binary buffer via alt=media
  const downloadResult = await driveService.downloadFile(cleanId, metadata);

  const buffer = Buffer.isBuffer(downloadResult.data)
    ? downloadResult.data
    : Buffer.from(downloadResult.data);

  // 4. Convert the downloaded DOCX buffer
  return convertDocxBuffer(buffer, {
    sourceFileId: metadata.id,
    sourceFileName: metadata.name,
    sourceMimeType: metadata.mimeType,
    customTitle: options.customTitle,
  });
}
