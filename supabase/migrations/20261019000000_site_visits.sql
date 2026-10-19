-- ==============================================================================
-- Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
-- Step 28: Real Website Visitor Counter Schema & Row Level Security
-- 
-- Author: Hemant Kumar Kushwaha (Teacher · Researcher · Thinker · Writer)
-- Architecture: Privacy-Conscious Server-Authoritative Visitor Counter
--               Stores aggregate daily totals with atomic increments.
--               Zero personal data, zero IP addresses, zero device tracking.
-- ==============================================================================

-- 1. Create table for aggregated daily site visits
CREATE TABLE IF NOT EXISTS site_daily_visits (
  visit_date DATE PRIMARY KEY DEFAULT CURRENT_DATE,
  visit_count BIGINT NOT NULL DEFAULT 0 CHECK (visit_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Trigger for updated_at
CREATE OR REPLACE TRIGGER trigger_site_daily_visits_updated_at
  BEFORE UPDATE ON site_daily_visits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 3. Row Level Security (RLS) Configuration
ALTER TABLE site_daily_visits ENABLE ROW LEVEL SECURITY;

-- 4. Table Privileges & Isolation
-- Grant full privileges to service_role (trusted server-side backend ONLY)
GRANT ALL ON TABLE site_daily_visits TO service_role;

-- Revoke all table privileges from anon and authenticated to prevent browser-side tampering
REVOKE ALL ON TABLE site_daily_visits FROM anon, authenticated;

-- Deny all direct client-side mutation
CREATE POLICY "Allow service_role full access on site_daily_visits"
  ON site_daily_visits
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 5. Atomic increment stored procedure (callable securely by service_role)
CREATE OR REPLACE FUNCTION increment_site_visit(target_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (total_visits BIGINT, today_visits BIGINT) AS $$
BEGIN
  -- Atomically insert or increment the daily counter
  INSERT INTO site_daily_visits (visit_date, visit_count)
  VALUES (target_date, 1)
  ON CONFLICT (visit_date)
  DO UPDATE SET 
    visit_count = site_daily_visits.visit_count + 1,
    updated_at = timezone('utc'::text, now());

  -- Return total lifetime visits and today's visits in a single round-trip
  RETURN QUERY
  SELECT 
    COALESCE(SUM(v.visit_count), 0)::BIGINT AS total_visits,
    COALESCE(MAX(CASE WHEN v.visit_date = target_date THEN v.visit_count ELSE 0 END), 0)::BIGINT AS today_visits
  FROM site_daily_visits v;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Read-only stats function
CREATE OR REPLACE FUNCTION get_site_visit_stats(target_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (total_visits BIGINT, today_visits BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(v.visit_count), 0)::BIGINT AS total_visits,
    COALESCE(MAX(CASE WHEN v.visit_date = target_date THEN v.visit_count ELSE 0 END), 0)::BIGINT AS today_visits
  FROM site_daily_visits v;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
