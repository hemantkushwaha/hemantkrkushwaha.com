-- ==============================================================================
-- Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
-- Step 22C-B: Durable Google OAuth States Table & Atomic Replay Protection
-- 
-- Author: Hemant Kumar Kushwaha (Teacher · Researcher · Thinker · Writer)
-- Architecture: Secure server-side OAuth CSRF state persistence with SHA-256
--               hashed states, atomic consumption, and automatic expiration.
--               Raw state is NEVER persisted. Public access strictly denied.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS google_oauth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for rapid lookup and atomic consumption by state_hash
CREATE INDEX IF NOT EXISTS idx_google_oauth_states_hash ON google_oauth_states (state_hash);

-- Index for efficient expiration cleanup
CREATE INDEX IF NOT EXISTS idx_google_oauth_states_expires_at ON google_oauth_states (expires_at);

-- Enable Row Level Security (RLS)
ALTER TABLE google_oauth_states ENABLE ROW LEVEL SECURITY;

-- Grant table privileges to service_role (trusted backend)
GRANT ALL ON TABLE google_oauth_states TO service_role;

-- Revoke all table privileges from public / anon / authenticated to guarantee isolation
REVOKE ALL ON TABLE google_oauth_states FROM anon, authenticated;

-- Deny all public / anon / authenticated client-side access
-- Only service_role (trusted server-side backend with SUPABASE_SECRET_KEY) has access
CREATE POLICY "Allow service_role full access on google_oauth_states"
  ON google_oauth_states
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
