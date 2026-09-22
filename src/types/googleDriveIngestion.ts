/**
 * Google Drive Ingestion Types & Data Structures
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Step 25 — Controlled Google Drive to Website Ingestion Foundation
 */

import { AutomationManifest } from './automation.js';

export interface SafeGoogleDriveIngestionMetadata {
  title: string;
  section: string;
  category: string;
  topic: string;
  contentType: string;
  tags?: string[];
  sourceSystem: string;
  sourceId?: string;
  sourceUrl?: string;
  sourceName?: string;
  generatedAt?: string;
  idempotencyKey: string;
  calculatedSlug: string;
  manifestVersion: string;
  published: boolean;
  contentLength: number;
}

export interface GoogleDriveIngestOptions {
  manifest: AutomationManifest;
  dryRun?: boolean;
  confirm?: boolean;
  baseUrl?: string;
  apiKey?: string;
  fetchFn?: typeof fetch;
  logger?: {
    log: (msg: string) => void;
    warn: (msg: string) => void;
    error: (msg: string) => void;
  };
}

export interface GoogleDriveIngestResult {
  success: boolean;
  dryRun: boolean;
  confirmationRequired?: boolean;
  metadata?: SafeGoogleDriveIngestionMetadata;
  manifest?: AutomationManifest;
  data?: {
    contentId?: string;
    slug: string;
    title: string;
    fileUploaded?: boolean;
    storagePath?: string;
  };
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  httpStatus?: number;
}
