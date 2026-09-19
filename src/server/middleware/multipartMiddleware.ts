/**
 * Zero-Dependency In-Memory Multipart Form-Data Parser Middleware
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Step 13 — File-Aware Content Ingestion Pipeline
 * 
 * Responsibilities:
 * - Safely parses multipart/form-data requests entirely in-memory (no temp disk writes).
 * - Enforces MAX_FILE_SIZE_BYTES before buffering.
 * - Extracts textual fields (such as 'manifest' JSON) into req.body.
 * - Extracts single file resource into req.fileResource: { fileName, fileType, fileSize, data }.
 * - Detects and flags multiple file uploads (Step 13 only allows one file).
 * - Passes through non-multipart requests seamlessly.
 */

import { Request, Response, NextFunction } from 'express';
import { getMaxFileSizeBytes } from '../../services/storageService';

export interface IngestFileResource {
  fileName: string;
  fileType: string;
  fileSize: number;
  data: Buffer;
}

export interface IngestionRequest extends Request {
  fileResource?: IngestFileResource;
  multipleFilesDetected?: boolean;
}

/**
 * Parses raw multipart buffer into headers and body for each boundary part.
 */
function parseMultipartBuffer(
  buffer: Buffer,
  boundary: string
): Array<{ headers: Record<string, string>; body: Buffer }> {
  const parts: Array<{ headers: Record<string, string>; body: Buffer }> = [];
  const boundaryDelimiter = Buffer.from(`--${boundary}`);
  const crlfcrlf = Buffer.from('\r\n\r\n');
  const lflf = Buffer.from('\n\n');

  let currentPos = 0;

  while (currentPos < buffer.length) {
    const boundaryIndex = buffer.indexOf(boundaryDelimiter, currentPos);
    if (boundaryIndex === -1) break;

    // Check for closing delimiter --boundary--
    const afterBoundary = boundaryIndex + boundaryDelimiter.length;
    if (
      afterBoundary + 1 < buffer.length &&
      buffer[afterBoundary] === 0x2d && // '-'
      buffer[afterBoundary + 1] === 0x2d // '-'
    ) {
      break;
    }

    // Move past boundary line (\r\n or \n)
    let headerStart = afterBoundary;
    if (buffer[headerStart] === 0x0d && buffer[headerStart + 1] === 0x0a) {
      headerStart += 2;
    } else if (buffer[headerStart] === 0x0a) {
      headerStart += 1;
    }

    // Find end of headers
    let headerEnd = buffer.indexOf(crlfcrlf, headerStart);
    let bodyStart = headerEnd + 4;
    if (headerEnd === -1) {
      headerEnd = buffer.indexOf(lflf, headerStart);
      if (headerEnd === -1) break;
      bodyStart = headerEnd + 2;
    }

    const headersRaw = buffer.subarray(headerStart, headerEnd).toString('utf8');
    const headerLines = headersRaw.split(/\r?\n/);
    const headers: Record<string, string> = {};

    for (const line of headerLines) {
      const colonIdx = line.indexOf(':');
      if (colonIdx > 0) {
        const key = line.substring(0, colonIdx).trim().toLowerCase();
        const val = line.substring(colonIdx + 1).trim();
        headers[key] = val;
      }
    }

    // Find next boundary to determine end of body
    const nextBoundary = buffer.indexOf(boundaryDelimiter, bodyStart);
    if (nextBoundary === -1) break;

    // Body ends right before \r\n preceding the next boundary
    let bodyEnd = nextBoundary;
    if (bodyEnd >= 2 && buffer[bodyEnd - 2] === 0x0d && buffer[bodyEnd - 1] === 0x0a) {
      bodyEnd -= 2;
    } else if (bodyEnd >= 1 && buffer[bodyEnd - 1] === 0x0a) {
      bodyEnd -= 1;
    }

    const partBody = buffer.subarray(bodyStart, bodyEnd);
    parts.push({ headers, body: partBody });

    currentPos = nextBoundary;
  }

  return parts;
}

/**
 * Express / Vercel middleware to parse multipart/form-data for content ingestion.
 */
export function parseMultipartIngestion(
  req: IngestionRequest,
  res: Response,
  next: NextFunction
): void {
  const contentType = req.headers['content-type'] || '';
  if (!contentType.toLowerCase().includes('multipart/form-data')) {
    return next();
  }

  // Extract boundary parameter
  const boundaryMatch = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType);
  const boundary = boundaryMatch ? (boundaryMatch[1] || boundaryMatch[2] || '').trim() : '';

  if (!boundary) {
    res.status(400).json({
      success: false,
      error: 'Bad Request: Missing or invalid boundary in multipart/form-data Content-Type header.',
    });
    return;
  }

  const maxLimit = getMaxFileSizeBytes() + 1024 * 1024; // Allow 1MB buffer overhead for headers/manifest

  const handleBuffer = (rawBuffer: Buffer) => {
    try {
      const parts = parseMultipartBuffer(rawBuffer, boundary);
      if (!req.body || typeof req.body !== 'object') {
        req.body = {};
      }

      const files: IngestFileResource[] = [];

      for (const part of parts) {
        const disposition = part.headers['content-disposition'] || '';
        const nameMatch = /name="([^"]+)"/i.exec(disposition);
        const filenameMatch = /filename="([^"]*)"/i.exec(disposition);

        const fieldName = nameMatch ? nameMatch[1] : '';
        const rawFileName = filenameMatch ? filenameMatch[1] : null;

        if (rawFileName !== null) {
          // File part
          if (rawFileName.trim().length > 0) {
            const partContentType = part.headers['content-type'] || 'application/octet-stream';
            files.push({
              fileName: rawFileName,
              fileType: partContentType,
              fileSize: part.body.length,
              data: part.body,
            });
          }
        } else if (fieldName) {
          // Field part
          const strValue = part.body.toString('utf8');
          if (fieldName === 'manifest') {
            try {
              req.body.manifest = JSON.parse(strValue);
            } catch {
              req.body.manifest = strValue;
            }
          } else {
            req.body[fieldName] = strValue;
          }
        }
      }

      // Step 13 constraint: Single file only
      if (files.length > 1) {
        req.multipleFilesDetected = true;
      } else if (files.length === 1) {
        req.fileResource = files[0];
      }

      return next();
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: `Bad Request: Failed to parse multipart payload: ${err?.message || 'Malformed multipart stream'}`,
      });
    }
  };

  // Check if body was already buffered (e.g. by serverless runtime or raw body parser)
  if (Buffer.isBuffer((req as any).rawBody)) {
    return handleBuffer((req as any).rawBody);
  }
  if (Buffer.isBuffer(req.body)) {
    return handleBuffer(req.body);
  }

  // Stream consumption
  const chunks: Buffer[] = [];
  let totalLength = 0;
  let hasAborted = false;

  req.on('data', (chunk: Buffer) => {
    if (hasAborted) return;
    totalLength += chunk.length;

    if (totalLength > maxLimit) {
      hasAborted = true;
      res.status(413).json({
        success: false,
        error: `Payload Too Large: Upload exceeds the maximum allowed limit of ${maxLimit} bytes.`,
      });
      req.destroy();
      return;
    }
    chunks.push(chunk);
  });

  req.on('end', () => {
    if (hasAborted) return;
    const fullBuffer = Buffer.concat(chunks);
    handleBuffer(fullBuffer);
  });

  req.on('error', (err) => {
    if (hasAborted) return;
    res.status(400).json({
      success: false,
      error: `Bad Request: Stream read error: ${err?.message || 'Failed to read request stream'}`,
    });
  });
}
