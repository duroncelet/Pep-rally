CREATE TABLE saved_outcomes (
  id TEXT PRIMARY KEY NOT NULL,
  owner_user_id TEXT NOT NULL,
  rally_slug TEXT NOT NULL,
  title TEXT NOT NULL,
  document TEXT NOT NULL,
  slug TEXT NOT NULL,
  is_public INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX idx_saved_outcomes_slug ON saved_outcomes(slug);
CREATE INDEX idx_saved_outcomes_owner_updated ON saved_outcomes(owner_user_id, updated_at);
