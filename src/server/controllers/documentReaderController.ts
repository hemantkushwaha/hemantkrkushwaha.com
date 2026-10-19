/**
 * Document Reader Controller
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Step 27-ACTION-1 — Native Study Material Reader Foundation
 * 
 * Responsibilities:
 * - Expose read-only API endpoint to convert Google Drive documents (DOCX) for the native web reader
 * - Invariants:
 *   - Read-only: Zero writes to Drive, Supabase, or Storage
 *   - Strictly sanitized output
 */

import { Request, Response } from 'express';
import {
  convertGoogleDriveDocxService,
  DocumentConversionError,
} from '../../services/documentConversionService.js';

export async function handleConvertGoogleDriveDocx(req: Request, res: Response): Promise<void> {
  try {
    const fileId = req.params?.fileId as string;
    if (!fileId || typeof fileId !== 'string' || !fileId.trim()) {
      res.status(400).json({
        success: false,
        error: 'INVALID_FILE_ID',
        message: 'A valid Google Drive file ID parameter is required in the URL path.',
      });
      return;
    }

    const customTitle = typeof req.query?.title === 'string' ? req.query.title : undefined;

    const doc = await convertGoogleDriveDocxService(fileId.trim(), {
      customTitle,
    });

    res.status(200).json({
      success: true,
      document: doc,
    });
  } catch (err: any) {
    if (err instanceof DocumentConversionError) {
      res.status(err.statusCode).json({
        success: false,
        error: err.code,
        message: err.message,
      });
      return;
    }

    // GoogleDriveServiceError or other downstream
    const statusCode = typeof err.statusCode === 'number' ? err.statusCode : 500;
    res.status(statusCode).json({
      success: false,
      error: err.code || 'CONVERSION_ERROR',
      message: err.message || 'An unexpected error occurred during document conversion.',
    });
  }
}
