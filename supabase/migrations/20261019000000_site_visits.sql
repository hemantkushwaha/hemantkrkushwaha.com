-- ==============================================================================
-- Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
-- Step 28: Real Website Visitor Counter Schema & Hardened Security Rules
-- 
-- Author: Hemant Kumar Kushwaha (Teacher · Researcher · Thinker · Writer)
-- Architecture: Privacy-Conscious Server-Authoritative Visitor Counter
--               Stores aggregate daily totals with atomic increments.
--               Zero personal data, zero IP addresses, zero device tracking.
--
-- Security Hardening & Pre-Deployment Review:
-- 1. Dedicated trigger function `update_site_daily_visits_updated_at` prevents
--    modifying or conflicting with the shared `update_updated_at_column` function.
-- 2. Explicit immutable search_path (public, pg_temp) on all SECURITY DEFINER functions.
-- 3. Explicit REVOKE EXECUTE from PUBLIC, anon, authenticated.
-- 4. Restricted EXECUTE granted exclusively to service_role (trusted backend).
-- 5. Parameter validation preventing NULL or corrupting target dates.
-- 6. Strict RLS with zero table privileges to browser clients.
-- ==============================================================================

-- 1. Dedicated updated_at trigger function for site_daily_visits
-- Does NOT touch or override generic shared `update_updated_at_column()` used by other tables.
CREATE OR REPLACE FUNCTION update_site_daily_visits_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

-- 2. Create table for aggregated daily site visits
CREATE TABLE IF NOT EXISTS site_daily_visits (
  visit_date DATE PRIMARY KEY DEFAULT CURRENT_DATE,
  visit_count BIGINT NOT NULL DEFAULT 0 CHECK (visit_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Trigger for updated_at using dedicated trigger function
DROP TRIGGER IF EXISTS trigger_site_daily_visits_updated_at ON site_daily_visits;
CREATE TRIGGER trigger_site_daily_visits_updated_at
  BEFORE UPDATE ON site_daily_visits
  FOR EACH ROW
  EXECUTE FUNCTION update_site_daily_visits_updated_at();

-- 4. Row Level Security (RLS) Configuration
ALTER TABLE site_daily_visits ENABLE ROW LEVEL SECURITY;

-- 5. Table Privileges & Isolation
-- Grant full privileges to service_role (trusted server-side backend ONLY)
GRANT ALL ON TABLE site_daily_visits TO service_role;

-- Revoke all table privileges from anon and authenticated to prevent browser-side tampering
REVOKE ALL ON TABLE site_daily_visits FROM anon, authenticated, PUBLIC;

-- Drop prior policies if existing and enforce service_role only
DROP POLICY IF EXISTS "Allow service_role full access on site_daily_visits" ON site_daily_visits;
CREATE POLICY "Allow service_role full access on site_daily_visits"
  ON site_daily_visits
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 6. Atomic increment stored procedure (callable securely ONLY by service_role)
CREATE OR REPLACE FUNCTION increment_site_visit(target_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (total_visits BIGINT, today_visits BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  safe_target_date DATE;
BEGIN
  -- Prevent NULL or corrupting target dates
  safe_target_date := COALESCE(target_date, CURRENT_DATE);

  -- Sanity check: reject dates unreasonably far in the past or future
  IF safe_target_date < DATE '2024-01-01' OR safe_target_date > (CURRENT_DATE + INTERVAL '1 day') THEN
    safe_target_date := CURRENT_DATE;
  END IF;

  -- Atomically insert or increment the daily counter
  INSERT INTO site_daily_visits (visit_date, visit_count)
  VALUES (safe_target_date, 1)
  ON CONFLICT (visit_date)
  DO UPDATE SET 
    visit_count = site_daily_visits.visit_count + 1,
    updated_at = timezone('utc'::text, now());

  -- Return total lifetime visits and today's visits in a single atomic round-trip
  RETURN QUERY
  SELECT 
    COALESCE(SUM(v.visit_count), 0)::BIGINT AS total_visits,
    COALESCE(MAX(CASE WHEN v.visit_date = safe_target_date THEN v.visit_count ELSE 0 END), 0)::BIGINT AS today_visits
  FROM site_daily_visits v;
END;
$$;

-- 7. Read-only stats function (callable securely ONLY by service_role)
CREATE OR REPLACE FUNCTION get_site_visit_stats(target_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (total_visits BIGINT, today_visits BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  safe_target_date DATE;
BEGIN
  safe_target_date := COALESCE(target_date, CURRENT_DATE);

  RETURN QUERY
  SELECT 
    COALESCE(SUM(v.visit_count), 0)::BIGINT AS total_visits,
    COALESCE(MAX(CASE WHEN v.visit_date = safe_target_date THEN v.visit_count ELSE 0 END), 0)::BIGINT AS today_visits
  FROM site_daily_visits v;
END;
$$;

-- 8. Function Privileges & RPC Isolation
-- Revoke default public execution privileges to block direct PostgREST calls from public clients
REVOKE ALL ON FUNCTION update_site_daily_visits_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION increment_site_visit(DATE) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION get_site_visit_stats(DATE) FROM PUBLIC, anon, authenticated;

-- Grant execution exclusively to the trusted server-side service_role
GRANT EXECUTE ON FUNCTION update_site_daily_visits_updated_at() TO service_role;
GRANT EXECUTE ON FUNCTION increment_site_visit(DATE) TO service_role;
GRANT EXECUTE ON FUNCTION get_site_visit_stats(DATE) TO service_role;
