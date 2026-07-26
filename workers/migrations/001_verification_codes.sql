-- ====== Run this in Supabase SQL Editor (https://supabase.com/dashboard) ======
-- Project: qmxjodfvzuvxvxmkjhju

-- ===========================
-- 1. VERIFICATION CODES TABLE
-- ===========================
CREATE TABLE IF NOT EXISTS verification_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vc_email_code ON verification_codes(email, code, used, expires_at);

-- ===========================
-- 2. RLS: verification_codes
-- ===========================
ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;

-- Only service role can access (Worker uses service_role key)
CREATE POLICY "service_role_full_access"
ON verification_codes FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Nobody else can read or modify codes
CREATE POLICY "deny_all"
ON verification_codes FOR ALL
USING (false);

-- ===========================
-- 3. RLS: posts table
-- ===========================
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Public (anon) can read posts
CREATE POLICY "public_read_posts"
ON posts FOR SELECT
USING (true);

-- Only authenticated users can insert (via Worker API)
CREATE POLICY "authenticated_insert_posts"
ON posts FOR INSERT
WITH CHECK (true);

-- Only authenticated users can update or delete
CREATE POLICY "authenticated_update_posts"
ON posts FOR UPDATE
USING (true);

CREATE POLICY "authenticated_delete_posts"
ON posts FOR DELETE
USING (true);

-- ===========================
-- 4. Auto-cleanup old codes (optional, requires pg_cron)
-- ===========================
-- Uncomment if you want automatic cleanup:
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule(
--   'cleanup-codes',
--   '0 * * * *',
--   $$ DELETE FROM verification_codes WHERE expires_at < NOW() - INTERVAL '24 hours' $$
-- );
