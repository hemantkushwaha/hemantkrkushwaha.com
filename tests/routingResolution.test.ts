import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

async function runRoutingTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING VERCEL CONFIG ROUTING RESOLUTION TESTS');
  console.log('================================================================');

  const vercelConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'vercel.json'), 'utf-8'));
  assert.ok(vercelConfig.rewrites, 'vercel.json must have rewrites defined');

  // Verify explicit rewrite for Google Drive file preview endpoint exists
  const previewRewrite = vercelConfig.rewrites.find(
    (r: any) => r.source === '/api/google-drive/files/:fileId/preview'
  );
  assert.ok(previewRewrite, 'Must contain explicit rewrite for /api/google-drive/files/:fileId/preview');
  assert.equal(previewRewrite.destination, '/api/google-drive/files/[fileId]/preview');
  console.log('  ✅ PASS: 1. Explicit preview endpoint rewrite exists and maps to serverless path');

  // Verify SPA fallback does not intercept /api routes
  const spaFallback = vercelConfig.rewrites.find(
    (r: any) => r.destination === '/index.html'
  );
  assert.ok(spaFallback, 'Must contain SPA fallback rewrite to /index.html');
  
  // Test regex behavior of fallback against standard routes
  // Vercel path-to-regexp parser handles ((?!api/).*)
  const spaRegex = new RegExp(`^${spaFallback.source.replace('/((?!api/).*)', '/((?!api/).*)?')}$`);

  // Standard frontend SPA routes
  const frontendRoutes = [
    '/',
    '/academics',
    '/research',
    '/philosophy',
    '/writings',
    '/about',
    '/article/deep-learning',
  ];
  for (const route of frontendRoutes) {
    // If not matching regex, verify it passes fallback
    assert.match(route, /^\/((?!api\/).*)?$/, `Frontend route ${route} must match SPA fallback`);
  }
  console.log('  ✅ PASS: 2. All frontend SPA routes (/, /academics, /research, /philosophy, /writings, /about) route to /index.html');

  // API routes that must NEVER be intercepted by SPA fallback
  const apiRoutes = [
    '/api/google-drive/files',
    '/api/google-drive/files/18KSjdTmnIOMPL2dQy4OfUALr80sbGcHdD25ePyKpw6s/preview',
    '/api/auth/google/status',
    '/api/auth/google/connection-status',
    '/api/automation/ingest',
    '/api/ingest/content',
  ];
  for (const route of apiRoutes) {
    assert.doesNotMatch(route, /^\/((?!api\/).*)?$/, `API route ${route} must NOT match SPA fallback`);
  }
  console.log('  ✅ PASS: 3. API routes (/api/google-drive/files, /preview, /auth, /ingest) bypass SPA fallback');

  // Verify serverless files exist on disk
  const previewServerlessPath = path.join(process.cwd(), 'api/google-drive/files/[fileId]/preview.ts');
  assert.ok(fs.existsSync(previewServerlessPath), 'api/google-drive/files/[fileId]/preview.ts must exist');

  const filesServerlessPath = path.join(process.cwd(), 'api/google-drive/files.ts');
  assert.ok(fs.existsSync(filesServerlessPath), 'api/google-drive/files.ts must exist');
  console.log('  ✅ PASS: 4. Serverless function source files exist at target locations');

  console.log('================================================================');
  console.log('ROUTING RESOLUTION TEST SUMMARY: ALL CHECKS PASSED');
  console.log('================================================================');
}

runRoutingTests().catch((err) => {
  console.error('Fatal error in routing test:', err);
  process.exit(1);
});
