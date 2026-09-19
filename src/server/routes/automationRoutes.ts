/**
 * External Automation Gateway Routes
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Step 16 — External Automation Gateway Foundation
 * 
 * Routes:
 * POST /api/automation/ingest - Secure provider-neutral ingestion endpoint
 */

import { Router } from 'express';
import { authenticateIngestionRequest } from '../middleware/authMiddleware.js';
import { parseMultipartIngestion } from '../middleware/multipartMiddleware.js';
import { handleAutomationGatewayIngest } from '../controllers/automationGatewayController.js';

export const automationRouter = Router();

// Secure external automation gateway endpoint
automationRouter.post(
  '/ingest',
  authenticateIngestionRequest,
  parseMultipartIngestion,
  handleAutomationGatewayIngest
);

export default automationRouter;
