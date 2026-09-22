/**
 * Google Drive Routes
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Step 23 — Google Drive Read-Only Access Layer
 * 
 * Endpoints:
 * - GET /api/google-drive/files: Internal/admin read-only listing of Drive files
 */

import { Router } from 'express';
import { authenticateIngestionRequest } from '../middleware/authMiddleware.js';
import {
  handleListGoogleDriveFiles,
  handlePreviewGoogleDriveFile,
} from '../controllers/googleDriveController.js';

export const googleDriveRouter = Router();

// GET /api/google-drive/files - Secure internal read-only Google Drive file listing
googleDriveRouter.get(
  '/files',
  authenticateIngestionRequest,
  handleListGoogleDriveFiles
);

// GET /api/google-drive/files/:fileId/preview - Secure preview transformation of a single Drive file into Content Manifest v1.0
googleDriveRouter.get(
  '/files/:fileId/preview',
  authenticateIngestionRequest,
  handlePreviewGoogleDriveFile
);

export default googleDriveRouter;
