CREATE TABLE waitlist_signups (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'homepage',
  created_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX idx_waitlist_signups_email ON waitlist_signups(email);
