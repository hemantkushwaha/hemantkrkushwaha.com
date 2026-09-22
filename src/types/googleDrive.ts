/**
 * Google Drive API v3 & OAuth 2.0 Types & Contracts
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Step 22 — Google Drive API / OAuth Foundation
 * 
 * Strict Invariants:
 * 1. Official Google Drive API v3 & OAuth 2.0 contracts only.
 * 2. Minimum practical read-only scope: https://www.googleapis.com/auth/drive.readonly
 * 3. Zero credential leakage: Tokens and secrets must never be exposed to client-side.
 * 4. User Taxonomy Supremacy: Section, category, topic, content_type, and title
 *    must NEVER be inferred from Drive metadata.
 */

/**
 * Official Google OAuth 2.0 endpoints
 */
export const GOOGLE_OAUTH_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_OAUTH_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

/**
 * Official Google Drive API v3 base URL
 */
export const GOOGLE_DRIVE_API_BASE_URL = 'https://www.googleapis.com/drive/v3';

/**
 * Minimum practical read-only scope for Google Drive content ingestion.
 * Grants read-only access to file metadata and contents (including downloads and exports).
 * Does NOT grant write, modify, or delete access.
 */
export const GOOGLE_DRIVE_READONLY_SCOPE = 'https://www.googleapis.com/auth/drive.readonly';

/**
 * Alternative Google Drive scopes evaluated for least-privilege compliance.
 */
export const GOOGLE_DRIVE_SCOPES = {
  READONLY: 'https://www.googleapis.com/auth/drive.readonly',
  METADATA_READONLY: 'https://www.googleapis.com/auth/drive.metadata.readonly',
  FILE: 'https://www.googleapis.com/auth/drive.file',
  FULL: 'https://www.googleapis.com/auth/drive',
} as const;

/**
 * Server-side Google OAuth 2.0 configuration contract.
 * Sourced strictly from secure server environment variables.
 */
export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes?: string[];
}

/**
 * Options for generating the official Google OAuth authorization URL.
 */
export interface GoogleOAuthUrlOptions {
  state?: string;
  prompt?: 'consent' | 'select_account' | 'none' | string;
  accessType?: 'offline' | 'online';
  includeGrantedScopes?: boolean;
  loginHint?: string;
  scope?: string | string[];
}

/**
 * Official Google OAuth 2.0 Token Endpoint JSON Response
 */
export interface GoogleOAuthTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope?: string;
  refresh_token?: string;
  id_token?: string;
}

/**
 * Normalized token entity for server-side management
 */
export interface GoogleOAuthTokens {
  access_token: string;
  token_type: string;
  expires_in: number;
  obtained_at: number;
  expires_at: number;
  refresh_token?: string;
  scope?: string;
  id_token?: string;
}

/**
 * Official Google Drive API v3 File Resource Metadata
 */
export interface GoogleDriveFileMetadata {
  id: string;
  name: string;
  mimeType: string;
  size?: string | number;
  modifiedTime?: string;
  createdTime?: string;
  parents?: string[];
  webViewLink?: string;
  webContentLink?: string;
  trashed?: boolean;
  description?: string;
  fileExtension?: string;
  fullFileExtension?: string;
  md5Checksum?: string;
  exportLinks?: Record<string, string>;
}

/**
 * Official Google Drive API v3 File List Response
 */
export interface GoogleDriveFileListResponse {
  kind?: string;
  nextPageToken?: string;
  incompleteSearch?: boolean;
  files: GoogleDriveFileMetadata[];
}

/**
 * Options for querying Google Drive API v3 files.list
 */
export interface GoogleDriveListOptions {
  /**
   * Optional parent folder ID to restrict results (e.g. designated "NotebookLM Exports" folder).
   */
  folderId?: string;
  /**
   * Maximum number of files to return per page (max 1000, default 100).
   */
  pageSize?: number;
  /**
   * Pagination token from a previous list response.
   */
  pageToken?: string;
  /**
   * Custom Drive query string (e.g. "name contains 'study'").
   */
  q?: string;
  /**
   * Selector specifying which fields to include in the response.
   */
  fields?: string;
  /**
   * Order by specification (e.g. "modifiedTime desc").
   */
  orderBy?: string;
  /**
   * If true, includes trashed files. Defaults to false for ingestion pipelines.
   */
  includeTrashed?: boolean;
}

/**
 * Result of downloading a binary file from Google Drive
 */
export interface GoogleDriveDownloadResult {
  data: Buffer | Uint8Array;
  fileName: string;
  mimeType: string;
  size: number;
  fileId: string;
}

/**
 * Result of exporting a Google-native document (Doc, Sheet, Slide) via Drive API v3
 */
export interface GoogleDriveExportResult {
  data: Buffer | Uint8Array;
  fileName: string;
  targetMimeType: string;
  sourceMimeType: string;
  size: number;
  fileId: string;
}

/**
 * Pluggable HTTP request/response abstractions for offline testing and runtime execution
 */
export interface GoogleHttpRequestOptions {
  method: 'GET' | 'POST';
  url: string;
  headers?: Record<string, string>;
  body?: string | URLSearchParams | Buffer | Uint8Array;
}

export interface GoogleHttpResponse<T = any> {
  status: number;
  statusText?: string;
  headers?: Record<string, string>;
  data: T;
}

export type GoogleHttpClient = (
  options: GoogleHttpRequestOptions
) => Promise<GoogleHttpResponse>;

/**
 * Step 22C: Encrypted Google OAuth connection record for server-side persistence.
 * RLS strictly prohibits client/public access; only trusted server code accesses this.
 */
export interface GoogleOAuthConnectionRecord {
  id?: string;
  provider: 'google';
  provider_account_id?: string;
  email?: string;
  access_token_encrypted: string;
  refresh_token_encrypted: string;
  token_type: string;
  scope: string;
  expires_at: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Step 22C-B: Durable Google OAuth State Record for CSRF and replay protection.
 * Raw state is NEVER stored; only cryptographic SHA-256 hash is persisted.
 */
export interface GoogleOAuthStateRecord {
  id?: string;
  state_hash: string;
  expires_at: string;
  consumed_at?: string | null;
  created_at?: string;
}

/**
 * Safe connection status metadata returned to callers.
 * Guaranteed to NEVER leak access_token, refresh_token, client_secret, or encryption key.
 */
export interface GoogleConnectionSafeStatus {
  connected: boolean;
  provider: string;
  email?: string;
  scope?: string;
  expires_at?: string;
  connected_at?: string;
  message?: string;
}
