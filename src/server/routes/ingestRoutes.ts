/**
 * Content Ingestion API Routes
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Step 10 — Secure Server-Side Content Ingestion API
 * 
 * Routes:
 * POST /api/ingest/content - Securely ingest a ContentManifest from trusted automation sources
 */

import { Router } from 'express';
import { authenticateIngestionRequest } from '../middleware/authMiddleware';
import { parseMultipartIngestion } from '../middleware/multipartMiddleware';
import { handleContentIngestion } from '../controllers/ingestController';

export const ingestRouter = Router();

// Secure server-to-server ingestion endpoint supporting manifest-only and manifest + file
ingestRouter.post('/content', authenticateIngestionRequest, parseMultipartIngestion, handleContentIngestion);
