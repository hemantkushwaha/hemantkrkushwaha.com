/**
 * Google Drive API v3 Client Service
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Step 22 — Google Drive API / OAuth Foundation
 * 
 * Server-Side Responsibilities:
 * - Official Google Drive API v3 operations abstraction
 * - listFiles: Querying Drive files with mandatory trashed-file exclusion
 * - getFile: Retrieving file metadata by Drive ID
 * - downloadFile: Downloading binary files (PDF, PPTX, DOCX, images) via alt=media
 * - exportGoogleDocument: Exporting Google Docs, Sheets, Slides via Drive export endpoint
 * - Designated Folder support (without hardcoding IDs)
 * - User Taxonomy Supremacy: NEVER infers taxonomy from Drive metadata
 * - Seamless integration bridge to GoogleDriveAdapter and Content Manifest v1.0
 * 
 * Invariants:
 * - Uses ONLY official Google Drive API v3 endpoints (https://www.googleapis.com/drive/v3)
 * - NO web scraping, unofficial endpoints, or browser automation
 * - Testable offline via pluggable HTTP transport with ZERO network calls during tests
 */

import {
  GoogleDriveFileMetadata,
  GoogleDriveFileListResponse,
  GoogleDriveListOptions,
  GoogleDriveDownloadResult,
  GoogleDriveExportResult,
  GoogleHttpClient,
  GOOGLE_DRIVE_API_BASE_URL,
} from '../types/googleDrive.js';
import {
  isGoogleNativeDocument,
  classifyGoogleDriveItem,
  GOOGLE_NATIVE_EXPORT_TARGETS,
} from './adapters/googleDriveAdapter.js';
import { GoogleDriveSourceInput } from '../types/automation.js';

/**
 * Standard Google Drive API error codes
 */
export type GoogleDriveServiceErrorCode =
  | 'MISSING_ACCESS_TOKEN'
  | 'INVALID_FILE_ID'
  | 'FILE_NOT_FOUND'
  | 'TRASHED_FILE'
  | 'NATIVE_DOCUMENT_REQUIRES_EXPORT'
  | 'NOT_A_NATIVE_DOCUMENT'
  | 'UNSUPPORTED_EXPORT_TARGET'
  | 'DRIVE_API_ERROR'
  | 'PAYLOAD_TOO_LARGE'
  | 'NETWORK_ERROR'
  | 'MISSING_TAXONOMY';

/**
 * Structured error class for Google Drive API operations
 */
export class GoogleDriveServiceError extends Error {
  public readonly code: GoogleDriveServiceErrorCode;
  public readonly statusCode: number;

  constructor(
    code: GoogleDriveServiceErrorCode,
    message: string,
    statusCode: number = 400
  ) {
    super(message);
    this.name = 'GoogleDriveServiceError';
    this.code = code;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, GoogleDriveServiceError.prototype);
  }
}

export interface GoogleDriveServiceOptions {
  accessToken?: string;
  httpClient?: GoogleHttpClient;
  defaultFolderId?: string;
}

/**
 * Google Drive API v3 Service
 */
export class GoogleDriveService {
  private accessToken?: string;
  private httpClient?: GoogleHttpClient;
  private defaultFolderId?: string;

  constructor(options: GoogleDriveServiceOptions = {}) {
    this.accessToken = options.accessToken;
    this.httpClient = options.httpClient;
    this.defaultFolderId = options.defaultFolderId;
  }

  /**
   * Set or update active access token
   */
  public setAccessToken(token: string): void {
    this.accessToken = token;
  }

  /**
   * Verifies access token is present
   */
  private requireAccessToken(): string {
    if (!this.accessToken || !this.accessToken.trim()) {
      throw new GoogleDriveServiceError(
        'MISSING_ACCESS_TOKEN',
        'Google Drive API request requires an active OAuth access token.',
        401
      );
    }
    return this.accessToken.trim();
  }

  /**
   * Builds authorization headers for official Drive v3 requests
   */
  private getHeaders(contentType?: string): Record<string, string> {
    const token = this.requireAccessToken();
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    };
    if (contentType) {
      headers['Content-Type'] = contentType;
    }
    return headers;
  }

  /**
   * Lists files matching criteria.
   * STRICT SAFETY RULE: Always excludes trashed files unless includeTrashed is explicitly true.
   */
  public async listFiles(
    options: GoogleDriveListOptions = {}
  ): Promise<GoogleDriveFileListResponse> {
    const token = this.requireAccessToken();
    const queryParts: string[] = [];

    // Enforce trashed exclusion by default
    if (!options.includeTrashed) {
      queryParts.push('trashed = false');
    }

    // Designated folder filter
    const folderId = options.folderId || this.defaultFolderId;
    if (folderId) {
      // Escape single quotes in folder ID to prevent query injection
      const sanitizedFolderId = folderId.replace(/'/g, "\\'");
      queryParts.push(`'${sanitizedFolderId}' in parents`);
    }

    // Custom additional query
    if (options.q && options.q.trim()) {
      queryParts.push(`(${options.q.trim()})`);
    }

    const fullQuery = queryParts.join(' and ');

    const params = new URLSearchParams();
    if (fullQuery) {
      params.set('q', fullQuery);
    }
    params.set(
      'fields',
      options.fields ||
        'nextPageToken, files(id, name, mimeType, size, modifiedTime, createdTime, parents, webViewLink, webContentLink, trashed, description)'
    );
    if (options.pageSize) {
      params.set('pageSize', String(Math.min(options.pageSize, 1000)));
    }
    if (options.pageToken) {
      params.set('pageToken', options.pageToken);
    }
    if (options.orderBy) {
      params.set('orderBy', options.orderBy);
    }

    const url = `${GOOGLE_DRIVE_API_BASE_URL}/files?${params.toString()}`;

    let data: any;
    if (this.httpClient) {
      const res = await this.httpClient({
        method: 'GET',
        url,
        headers: this.getHeaders(),
      });
      if (res.status !== 200) {
        throw new GoogleDriveServiceError(
          'DRIVE_API_ERROR',
          `Drive API files.list failed with HTTP ${res.status}.`,
          res.status
        );
      }
      data = res.data;
    } else {
      try {
        const res = await fetch(url, {
          method: 'GET',
          headers: this.getHeaders(),
        });
        if (!res.ok) {
          throw new GoogleDriveServiceError(
            'DRIVE_API_ERROR',
            `Drive API files.list failed with HTTP ${res.status}.`,
            res.status
          );
        }
        data = await res.json();
      } catch (err: any) {
        if (err instanceof GoogleDriveServiceError) throw err;
        throw new GoogleDriveServiceError(
          'NETWORK_ERROR',
          `Failed to reach Google Drive API: ${err.message}`,
          502
        );
      }
    }

    return {
      kind: data.kind || 'drive#fileList',
      nextPageToken: data.nextPageToken,
      incompleteSearch: data.incompleteSearch,
      files: Array.isArray(data.files) ? data.files : [],
    };
  }

  /**
   * Retrieves metadata for a specific Google Drive file by ID.
   */
  public async getFile(
    fileId: string,
    fields?: string
  ): Promise<GoogleDriveFileMetadata> {
    if (!fileId || typeof fileId !== 'string' || !fileId.trim()) {
      throw new GoogleDriveServiceError(
        'INVALID_FILE_ID',
        'Valid Google Drive file ID is required.',
        400
      );
    }

    const cleanId = fileId.trim();
    const fieldsParam =
      fields ||
      'id, name, mimeType, size, modifiedTime, createdTime, parents, webViewLink, webContentLink, trashed, description, md5Checksum';

    const url = `${GOOGLE_DRIVE_API_BASE_URL}/files/${encodeURIComponent(cleanId)}?fields=${encodeURIComponent(fieldsParam)}`;

    let data: any;
    if (this.httpClient) {
      const res = await this.httpClient({
        method: 'GET',
        url,
        headers: this.getHeaders(),
      });
      if (res.status === 404) {
        throw new GoogleDriveServiceError(
          'FILE_NOT_FOUND',
          `Google Drive file with ID "${cleanId}" not found.`,
          404
        );
      }
      if (res.status !== 200) {
        throw new GoogleDriveServiceError(
          'DRIVE_API_ERROR',
          `Drive API files.get failed with HTTP ${res.status}.`,
          res.status
        );
      }
      data = res.data;
    } else {
      try {
        const res = await fetch(url, {
          method: 'GET',
          headers: this.getHeaders(),
        });
        if (res.status === 404) {
          throw new GoogleDriveServiceError(
            'FILE_NOT_FOUND',
            `Google Drive file with ID "${cleanId}" not found.`,
            404
          );
        }
        if (!res.ok) {
          throw new GoogleDriveServiceError(
            'DRIVE_API_ERROR',
            `Drive API files.get failed with HTTP ${res.status}.`,
            res.status
          );
        }
        data = await res.json();
      } catch (err: any) {
        if (err instanceof GoogleDriveServiceError) throw err;
        throw new GoogleDriveServiceError(
          'NETWORK_ERROR',
          `Failed to reach Google Drive API: ${err.message}`,
          502
        );
      }
    }

    return data as GoogleDriveFileMetadata;
  }

  /**
   * Downloads a binary file from Google Drive via alt=media.
   * Explicitly prevents downloading Google-native documents directly.
   */
  public async downloadFile(
    fileId: string,
    metadataHint?: GoogleDriveFileMetadata
  ): Promise<GoogleDriveDownloadResult> {
    const metadata = metadataHint || (await this.getFile(fileId));

    if (metadata.trashed) {
      throw new GoogleDriveServiceError(
        'TRASHED_FILE',
        `Cannot download file "${metadata.name}" because it is in the trash.`,
        400
      );
    }

    if (isGoogleNativeDocument(metadata.mimeType)) {
      throw new GoogleDriveServiceError(
        'NATIVE_DOCUMENT_REQUIRES_EXPORT',
        `Google-native file "${metadata.name}" (${metadata.mimeType}) cannot be downloaded directly as binary. Use exportGoogleDocument() with an official export MIME type.`,
        400
      );
    }

    const cleanId = metadata.id || fileId.trim();
    const url = `${GOOGLE_DRIVE_API_BASE_URL}/files/${encodeURIComponent(cleanId)}?alt=media`;

    let bufferData: Buffer | Uint8Array;
    if (this.httpClient) {
      const res = await this.httpClient({
        method: 'GET',
        url,
        headers: this.getHeaders(),
      });
      if (res.status !== 200) {
        throw new GoogleDriveServiceError(
          'DRIVE_API_ERROR',
          `Drive API files.download failed with HTTP ${res.status}.`,
          res.status
        );
      }
      bufferData =
        typeof res.data === 'string'
          ? Buffer.from(res.data)
          : Buffer.isBuffer(res.data)
          ? res.data
          : Buffer.from(res.data);
    } else {
      try {
        const res = await fetch(url, {
          method: 'GET',
          headers: this.getHeaders(),
        });
        if (!res.ok) {
          throw new GoogleDriveServiceError(
            'DRIVE_API_ERROR',
            `Drive API files.download failed with HTTP ${res.status}.`,
            res.status
          );
        }
        const arrayBuf = await res.arrayBuffer();
        bufferData = Buffer.from(arrayBuf);
      } catch (err: any) {
        if (err instanceof GoogleDriveServiceError) throw err;
        throw new GoogleDriveServiceError(
          'NETWORK_ERROR',
          `Failed to download file from Google Drive: ${err.message}`,
          502
        );
      }
    }

    return {
      fileId: cleanId,
      fileName: metadata.name,
      mimeType: metadata.mimeType,
      size: bufferData.byteLength,
      data: bufferData,
    };
  }

  /**
   * Exports a Google-native document (Docs, Sheets, Slides) to an official target format.
   * Uses GET https://www.googleapis.com/drive/v3/files/{fileId}/export?mimeType={targetMimeType}
   */
  public async exportGoogleDocument(
    fileId: string,
    targetMimeType: string,
    metadataHint?: GoogleDriveFileMetadata
  ): Promise<GoogleDriveExportResult> {
    const metadata = metadataHint || (await this.getFile(fileId));

    if (!isGoogleNativeDocument(metadata.mimeType)) {
      throw new GoogleDriveServiceError(
        'NOT_A_NATIVE_DOCUMENT',
        `File "${metadata.name}" (${metadata.mimeType}) is not a Google-native document. Use downloadFile() for binary files.`,
        400
      );
    }

    const supportedTargets = GOOGLE_NATIVE_EXPORT_TARGETS[metadata.mimeType] || [];
    if (!supportedTargets.includes(targetMimeType)) {
      throw new GoogleDriveServiceError(
        'UNSUPPORTED_EXPORT_TARGET',
        `Export target "${targetMimeType}" is not supported for ${metadata.mimeType}. Officially supported targets: ${supportedTargets.join(', ')}`,
        400
      );
    }

    const cleanId = metadata.id || fileId.trim();
    const url = `${GOOGLE_DRIVE_API_BASE_URL}/files/${encodeURIComponent(cleanId)}/export?mimeType=${encodeURIComponent(targetMimeType)}`;

    let bufferData: Buffer | Uint8Array;
    if (this.httpClient) {
      const res = await this.httpClient({
        method: 'GET',
        url,
        headers: this.getHeaders(),
      });
      if (res.status !== 200) {
        throw new GoogleDriveServiceError(
          'DRIVE_API_ERROR',
          `Drive API files.export failed with HTTP ${res.status}.`,
          res.status
        );
      }
      bufferData =
        typeof res.data === 'string'
          ? Buffer.from(res.data)
          : Buffer.isBuffer(res.data)
          ? res.data
          : Buffer.from(res.data);
    } else {
      try {
        const res = await fetch(url, {
          method: 'GET',
          headers: this.getHeaders(),
        });
        if (!res.ok) {
          throw new GoogleDriveServiceError(
            'DRIVE_API_ERROR',
            `Drive API files.export failed with HTTP ${res.status}.`,
            res.status
          );
        }
        const arrayBuf = await res.arrayBuffer();
        bufferData = Buffer.from(arrayBuf);
      } catch (err: any) {
        if (err instanceof GoogleDriveServiceError) throw err;
        throw new GoogleDriveServiceError(
          'NETWORK_ERROR',
          `Failed to export document from Google Drive: ${err.message}`,
          502
        );
      }
    }

    return {
      fileId: cleanId,
      fileName: metadata.name,
      sourceMimeType: metadata.mimeType,
      targetMimeType,
      size: bufferData.byteLength,
      data: bufferData,
    };
  }

  /**
   * Integration Helper: Constructs a GoogleDriveSourceInput payload for GoogleDriveAdapter.
   * 
   * CRITICAL ARCHITECTURAL RULE:
   * Taxonomical fields (section, category, topic, content_type, title) MUST be explicitly
   * provided by the caller/user. This method NEVER infers or alters them from file names or metadata.
   */
  public buildSourceInput(params: {
    file: GoogleDriveFileMetadata;
    taxonomy: {
      section: string;
      category: string;
      topic: string;
      content_type: string;
      title: string;
      description?: string;
      tags?: string[];
      subcategory?: string;
    };
    fileData?: Buffer | Uint8Array;
    fileName?: string;
    fileType?: string;
    body?: string;
  }): GoogleDriveSourceInput {
    const { file, taxonomy, fileData, fileName, fileType, body } = params;

    if (
      !taxonomy ||
      !taxonomy.section ||
      !taxonomy.category ||
      !taxonomy.topic ||
      !taxonomy.content_type ||
      !taxonomy.title
    ) {
      throw new GoogleDriveServiceError(
        'MISSING_TAXONOMY',
        'User taxonomy (section, category, topic, content_type, title) must be explicitly provided by the caller. Google Drive integration never infers taxonomy.',
        400
      );
    }

    const input: GoogleDriveSourceInput = {
      // Caller-supplied taxonomy
      section: taxonomy.section,
      category: taxonomy.category,
      topic: taxonomy.topic,
      content_type: taxonomy.content_type,
      title: taxonomy.title,
      description: taxonomy.description || file.description,
      tags: taxonomy.tags,
      subcategory: taxonomy.subcategory,

      // Body if provided
      body: body,

      // Google Drive API v3 file provenance
      file_id: file.id,
      name: file.name,
      mime_type: file.mimeType,
      web_view_link: file.webViewLink,
      webContentLink: file.webContentLink,
      modified_time: file.modifiedTime,
      created_time: file.createdTime,
      size: file.size,
      parent_folder_id: file.parents && file.parents.length > 0 ? file.parents[0] : undefined,

      // Binary payload if downloaded/exported
      file_name: fileName || file.name,
      file_type: fileType || file.mimeType,
      file_size: fileData ? fileData.byteLength : undefined,
      file_data: fileData,
    };

    return input;
  }
}

/**
 * Singleton factory instance
 */
export const googleDriveService = new GoogleDriveService();
