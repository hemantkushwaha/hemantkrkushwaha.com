/**
 * Vercel Serverless Function: Native Document Reader Conversion Endpoint
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Step 27-ACTION-1 — Native Study Material Reader Foundation
 * 
 * Maps directly to GET /api/google-drive/files/:fileId/convert on Vercel deployment.
 * Strictly READ-ONLY: zero mutations, zero external ingestions.
 */

import { handleConvertGoogleDriveDocx } from '../../../../src/server/controllers/documentReaderController.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({
      success: false,
      error: 'METHOD_NOT_ALLOWED',
      message: 'Method Not Allowed. Only GET requests are permitted for document conversion.',
    });
  }

  return handleConvertGoogleDriveDocx(req, res);
}
