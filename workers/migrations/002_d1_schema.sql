-- D1 schema: computer-knowledge-api-db

CREATE TABLE IF NOT EXISTS verification_codes (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_vc_email_code ON verification_codes(email, code, used, expires_at);

CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  tag TEXT,
  body TEXT NOT NULL,
  replies TEXT DEFAULT '[]',
  author_email TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at);
