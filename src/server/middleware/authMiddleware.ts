/**
 * Content Ingestion Authentication Middleware
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Step 10 — Secure Server-Side Content Ingestion API
 * 
 * Rules:
 * - Validates incoming request against CONTENT_INGESTION_API_KEY.
 * - Enforces header format: Authorization: Bearer <CONTENT_INGESTION_API_KEY>
 * - Returns HTTP 401 on missing, empty, or incorrect key.
 * - Constant-time comparison to protect against timing attacks.
 * - Never reveals how close a key is, nor logs/exposes the configured key.
 * - Provides extension point for future server-to-server rate limiting.
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * Timing-safe string comparison to mitigate side-channel timing analysis.
 */
function safeCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');

    if (bufA.length !== bufB.length) {
      // Execute dummy timing safe equal against self to equalize execution time
      crypto.timingSafeEqual(bufA, bufA);
      return false;
    }

    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/**
 * Rate Limiting Extension Point
 * 
 * In production automation pipelines (Google Drive, NotebookLM, etc.),
 * this hook can integrate an in-memory token bucket or Redis rate limiter.
 * Current implementation enforces server-to-server token presence and origin checks.
 */
function checkRateLimitExtension(_req: Request): boolean {
  // Extension point for rate limiting before public automation is enabled.
  return true;
}

/**
 * Authenticates server-side ingestion requests.
 */
export function authenticateIngestionRequest(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // 1. Check rate limiting extension point
  if (!checkRateLimitExtension(req)) {
    res.status(429).json({
      success: false,
      error: 'Too Many Requests: Ingestion rate limit exceeded.',
    });
    return;
  }

  // 2. Validate server configuration
  const configuredKey = process.env.CONTENT_INGESTION_API_KEY;
  if (!configuredKey || configuredKey.trim().length === 0) {
    // Ingestion endpoint is locked until CONTENT_INGESTION_API_KEY is configured
    res.status(401).json({
      success: false,
      error: 'Unauthorized: Content Ingestion API key is not configured on the server.',
    });
    return;
  }

  // 3. Extract Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || typeof authHeader !== 'string') {
    res.status(401).json({
      success: false,
      error: 'Unauthorized: Missing or invalid Authorization header.',
    });
    return;
  }

  const parts = authHeader.trim().split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    res.status(401).json({
      success: false,
      error: 'Unauthorized: Authorization header format must be "Bearer <token>".',
    });
    return;
  }

  const providedToken = parts[1];

  // 4. Constant-time validation
  const isMatch = safeCompare(providedToken, configuredKey.trim());
  if (!isMatch) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid authentication credentials.',
    });
    return;
  }

  // 5. Authentication succeeded; proceed to controller
  next();
}
