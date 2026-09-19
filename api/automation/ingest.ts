/**
 * Vercel Serverless Function: Automation Gateway API Endpoint
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Step 16 — External Automation Gateway Foundation
 * 
 * Maps directly to POST /api/automation/ingest on Vercel deployment.
 * Reuses the exact same controller, authentication middleware, and gateway service.
 */

import { authenticateIngestionRequest } from '../../src/server/middleware/authMiddleware.js';
import { parseMultipartIngestion } from '../../src/server/middleware/multipartMiddleware.js';
import { handleAutomationGatewayIngest } from '../../src/server/controllers/automationGatewayController.js';

export default async function handler(req: any, res: any) {
  // Enforce HTTP POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({
      success: false,
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Method Not Allowed. Only POST requests are permitted for automation ingestion.',
      },
    });
  }

  // Ensure JSON body is parsed if received as string
  if (typeof req.body === 'string' && !req.headers?.['content-type']?.includes('multipart/form-data')) {
    try {
      req.body = JSON.parse(req.body);
    } catch {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MALFORMED_REQUEST',
          message: 'Bad Request: Request body contains invalid JSON.',
        },
      });
    }
  }

  // Execute authentication middleware followed by multipart parsing and gateway controller
  return authenticateIngestionRequest(req, res, () => {
    return parseMultipartIngestion(req, res, () => {
      return handleAutomationGatewayIngest(req, res);
    });
  });
}
