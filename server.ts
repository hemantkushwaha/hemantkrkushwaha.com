import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { ingestRouter } from './src/server/routes/ingestRoutes';
import storageRouter from './src/server/routes/storageRoutes';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes FIRST
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    });
  });

  // Step 3: Database Connection Status API (safe diagnostics, zero secret leakage)
  app.get('/api/database/status', (req, res) => {
    const hasUrl = Boolean(process.env.VITE_SUPABASE_URL);
    const hasPublishableKey = Boolean(process.env.VITE_SUPABASE_PUBLISHABLE_KEY);
    const hasSecretKey = Boolean(process.env.SUPABASE_SECRET_KEY);

    res.json({
      database: 'PostgreSQL (Supabase)',
      architecture: 'Unified Content Model',
      tables: ['content', 'tags', 'content_tags', 'content_relationships'],
      configured: hasUrl && hasPublishableKey,
      connectionDetails: {
        hasSupabaseUrl: hasUrl,
        hasSupabasePublishableKey: hasPublishableKey,
        hasSecretKey: hasSecretKey,
      },
      message: (hasUrl && hasPublishableKey)
        ? 'Supabase connection parameters detected in environment.'
        : 'Supabase credentials not yet supplied in environment. System is ready to connect upon credentials entry.'
    });
  });

  // Step 10: Secure Server-Side Content Ingestion API
  app.use('/api/ingest', ingestRouter);

  // Step 12: Secure Storage & Signed URL API
  app.use('/api/storage', storageRouter);
  app.use('/api/content', storageRouter);

  // Vite middleware for development or static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
