/**
 * Vercel Serverless Function: Google Drive Read-Only File Listing Endpoint
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Step 23 — Google Drive Read-Only Access Layer
 * 
 * Maps directly to GET /api/google-drive/files on Vercel deployment.
 * Reuses the exact same controller, authentication middleware, and GoogleDriveService.
 */

import { authenticateIngestionRequest } from '../../src/server/middleware/authMiddleware.js';
import { handleListGoogleDriveFiles } from '../../src/server/controllers/googleDriveController.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({
      success: false,
      error: 'METHOD_NOT_ALLOWED',
      message: 'Method Not Allowed. Only GET requests are permitted for listing Google Drive files.',
    });
  }

  return authenticateIngestionRequest(req, res, () => {
    return handleListGoogleDriveFiles(req, res);
  });
}
