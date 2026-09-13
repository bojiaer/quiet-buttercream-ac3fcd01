-- D1 migration 003: 匿名社区模式
ALTER TABLE posts ADD COLUMN author TEXT;
ALTER TABLE posts ADD COLUMN uid TEXT;
DROP TABLE IF EXISTS verification_codes;
DROP INDEX IF EXISTS idx_vc_email_code;
