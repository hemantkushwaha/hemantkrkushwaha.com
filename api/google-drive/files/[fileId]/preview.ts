/**
 * Vercel Serverless Function: Google Drive File-to-Manifest Preview Endpoint
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Step 24 — Google Drive File to Content Manifest Preview
 * 
 * Maps directly to GET /api/google-drive/files/:fileId/preview on Vercel deployment.
 * Reuses the exact same controller, authentication middleware, and GoogleDriveService.
 * Strictly READ-ONLY: zero mutations, zero external ingestions.
 */

import { authenticateIngestionRequest } from '../../../../src/server/middleware/authMiddleware.js';
import { handlePreviewGoogleDriveFile } from '../../../../src/server/controllers/googleDriveController.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({
      success: false,
      error: 'METHOD_NOT_ALLOWED',
      message: 'Method Not Allowed. Only GET requests are permitted for previewing Google Drive files.',
    });
  }

  return authenticateIngestionRequest(req, res, () => {
    return handlePreviewGoogleDriveFile(req, res);
  });
}
