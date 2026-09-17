/**
 * Server-Side Supabase Client (Administrative / Ingestion Boundary)
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Secure Server-Side Content Ingestion (Step 10)
 * 
 * SECURITY DIRECTIVE:
 * - This module is STRICTLY server-side.
 * - Never import this file into any React/Vite client-side components.
 * - Uses SUPABASE_SECRET_KEY exclusively in Node.js environment.
 * - Never logs or exposes SUPABASE_SECRET_KEY.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let cachedServerClient: SupabaseClient | null = null;

/**
 * Returns a server-side Supabase client with administrative capabilities,
 * enabling trusted automated content ingestion without exposing secret keys to clients.
 */
export function getServerSupabaseClient(): SupabaseClient | null {
  const url = process.env.VITE_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    return null;
  }

  if (!cachedServerClient) {
    cachedServerClient = createClient(url, secretKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return cachedServerClient;
}
