-- ==============================================================================
-- Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
-- Step 22C: Secure Google OAuth Connections Table & Row Level Security
-- 
-- Author: Hemant Kumar Kushwaha (Teacher · Researcher · Thinker · Writer)
-- Architecture: Secure server-side credential persistence with AES-256-GCM
--               encrypted access & refresh tokens. Public access strictly denied.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS google_oauth_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'google',
  provider_account_id TEXT,
  email TEXT,
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT NOT NULL,
  token_type TEXT NOT NULL DEFAULT 'Bearer',
  scope TEXT NOT NULL DEFAULT 'https://www.googleapis.com/auth/drive.readonly',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  CONSTRAINT unique_google_oauth_provider UNIQUE (provider)
);

-- Trigger for google_oauth_connections.updated_at
CREATE OR REPLACE TRIGGER trigger_google_oauth_connections_updated_at
  BEFORE UPDATE ON google_oauth_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE google_oauth_connections ENABLE ROW LEVEL SECURITY;

-- Grant table privileges to service_role (trusted backend)
GRANT ALL ON TABLE google_oauth_connections TO service_role;

-- Revoke all table privileges from public / anon / authenticated to guarantee isolation
REVOKE ALL ON TABLE google_oauth_connections FROM anon, authenticated;

-- Deny all public / anon / authenticated client-side access
-- Only service_role (trusted server-side backend with SUPABASE_SECRET_KEY) has access
CREATE POLICY "Allow service_role full access on google_oauth_connections"
  ON google_oauth_connections
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
