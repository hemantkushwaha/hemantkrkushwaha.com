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
import { handleListGoogleDriveFiles } from '../controllers/googleDriveController.js';

export const googleDriveRouter = Router();

// GET /api/google-drive/files - Secure internal read-only Google Drive file listing
googleDriveRouter.get(
  '/files',
  authenticateIngestionRequest,
  handleListGoogleDriveFiles
);

export default googleDriveRouter;
