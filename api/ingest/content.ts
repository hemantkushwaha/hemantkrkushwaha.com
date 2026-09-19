/**
 * Vercel Serverless Function: Content Ingestion API Endpoint
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Step 10 & 10A — Secure Server-Side Content Ingestion API
 * 
 * Maps directly to POST /api/ingest/content on Vercel deployment.
 * Reuses the exact same controller, authentication middleware, and ingestion service.
 */

import { authenticateIngestionRequest } from '../../src/server/middleware/authMiddleware';
import { parseMultipartIngestion } from '../../src/server/middleware/multipartMiddleware';
import { handleContentIngestion } from '../../src/server/controllers/ingestController';

export default async function handler(req: any, res: any) {
  // Enforce HTTP POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({
      success: false,
      error: 'Method Not Allowed. Only POST requests are permitted for content ingestion.',
    });
  }

  // Ensure JSON body is parsed if received as string
  if (typeof req.body === 'string' && !req.headers?.['content-type']?.includes('multipart/form-data')) {
    try {
      req.body = JSON.parse(req.body);
    } catch {
      return res.status(400).json({
        success: false,
        error: 'Bad Request: Request body contains invalid JSON.',
      });
    }
  }

  // Execute authentication middleware followed by multipart parsing and ingestion controller
  return authenticateIngestionRequest(req, res, () => {
    return parseMultipartIngestion(req, res, () => {
      return handleContentIngestion(req, res);
    });
  });
}
