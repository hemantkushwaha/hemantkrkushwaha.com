/**
 * Supabase Client Configuration & Factory
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * 
 * Safety & Security Guarantees:
 * 1. Uses ONLY public browser-safe variables (VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY).
 * 2. Never exposes SUPABASE_SECRET_KEY or administrative secrets to the client.
 * 3. Lazy client initialization ensures no app crashes if environment variables
 *    have not yet been provided by the user.
 * 4. Zero fake data; gracefully signals connection readiness.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Cached client instance
let supabaseClientInstance: SupabaseClient | null = null;

/**
 * Returns whether Supabase public credentials have been supplied in the environment.
 */
export function isSupabaseConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  return Boolean(url && publishableKey && url.trim().length > 0 && publishableKey.trim().length > 0);
}

/**
 * Lazily obtains the public Supabase client instance.
 * Returns null if Supabase environment variables are not yet configured.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseClientInstance) {
    return supabaseClientInstance;
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !publishableKey) {
    return null;
  }

  try {
    supabaseClientInstance = createClient(supabaseUrl, publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    return supabaseClientInstance;
  } catch (error) {
    console.warn('[Supabase] Failed to initialize Supabase client:', error);
    return null;
  }
}
