CREATE TABLE planner_runs (
  id TEXT PRIMARY KEY NOT NULL,
  owner_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  answers TEXT NOT NULL,
  artifact TEXT NOT NULL,
  revision_count INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX planner_runs_owner_request ON planner_runs(owner_id, request_id);
CREATE INDEX planner_runs_owner_updated ON planner_runs(owner_id, updated_at);
