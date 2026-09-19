/**
 * Storage & Secure File URL Routes
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Step 12 — Storage Security & Access Layer
 * 
 * Exposes:
 * - GET /api/storage/file-url/:identifier
 * - GET /api/storage/:identifier/file-url
 */

import { Router } from 'express';
import { handleSecureFileUrlRequest } from '../controllers/storageController.js';

const router = Router();

// Secure temporary signed URL generation endpoints
router.get('/file-url/:identifier', handleSecureFileUrlRequest);
router.get('/:identifier/file-url', handleSecureFileUrlRequest);

export default router;
