/**
 * Converted Document Types
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Step 27-ACTION-1 — Native Study Material Reader Foundation
 * 
 * Model specification:
 * - title: Clean document title
 * - html: Sanitized, web-safe renderable HTML
 * - plainText: Plain text representation extracted from DOCX
 * - headings: Real headings extracted from the DOCX for Table of Contents
 * - wordCount: Estimated word count of content
 * - characterCount: Character count of plain text
 * - sourceFileId: Real Google Drive file ID
 * - sourceFileName: Real Google Drive file name
 * - sourceMimeType: File MIME type (e.g. application/vnd.openxmlformats-officedocument.wordprocessingml.document)
 */

export interface DocumentHeading {
  id: string;
  text: string;
  level: number;
}

export interface ConvertedDocument {
  title: string;
  html: string;
  plainText: string;
  headings: DocumentHeading[];
  wordCount: number;
  characterCount: number;
  sourceFileId: string;
  sourceFileName: string;
  sourceMimeType: string;
  convertedAt: string;
}

export interface DocumentConversionOptions {
  sourceFileId: string;
  sourceFileName: string;
  sourceMimeType?: string;
  customTitle?: string;
}
