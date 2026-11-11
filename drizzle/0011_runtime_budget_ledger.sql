-- Money is stored in microcents; never use floating-point provider totals.
CREATE TABLE runtime_accounts (
  owner_id TEXT PRIMARY KEY,
  monthly_cap INTEGER NOT NULL DEFAULT 2500000000 CHECK(typeof(monthly_cap) = 'integer' AND monthly_cap >= 0)
);
CREATE TABLE runtime_sessions (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES runtime_accounts(owner_id),
  budget INTEGER NOT NULL CHECK(typeof(budget) = 'integer' AND budget >= 0),
  max_steps INTEGER NOT NULL CHECK(typeof(max_steps) = 'integer' AND max_steps > 0),
  max_tool_calls INTEGER NOT NULL CHECK(typeof(max_tool_calls) = 'integer' AND max_tool_calls >= 0),
  stopped INTEGER NOT NULL DEFAULT 0 CHECK(stopped IN (0,1))
);
CREATE TABLE runtime_controls (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  generation_enabled INTEGER NOT NULL DEFAULT 0 CHECK(generation_enabled IN (0,1))
);
INSERT INTO runtime_controls(id, generation_enabled) VALUES(1, 0);
CREATE TABLE runtime_reservations (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES runtime_sessions(id),
  month TEXT NOT NULL CHECK(length(month) = 7),
  reserved INTEGER NOT NULL CHECK(typeof(reserved) = 'integer' AND reserved >= 0),
  actual INTEGER CHECK(actual IS NULL OR (typeof(actual) = 'integer' AND actual >= 0 AND actual <= reserved)),
  tool_calls INTEGER NOT NULL DEFAULT 0 CHECK(typeof(tool_calls) = 'integer' AND tool_calls >= 0)
);
CREATE INDEX runtime_reservations_session ON runtime_reservations(session_id);
CREATE INDEX runtime_reservations_month ON runtime_reservations(month);
-- A single INSERT checks and reserves atomically. Outstanding reservations
-- stay charged until reconciled; a crashed worker cannot free spent money.
CREATE TRIGGER runtime_reserve_guard BEFORE INSERT ON runtime_reservations BEGIN
  SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM runtime_controls WHERE id=1 AND generation_enabled=1)
    THEN RAISE(ABORT, 'generation_disabled') END;
  SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM runtime_sessions WHERE id=NEW.session_id AND stopped=0)
    THEN RAISE(ABORT, 'session_stopped') END;
  SELECT CASE WHEN NEW.month != strftime('%Y-%m', 'now')
    THEN RAISE(ABORT, 'invalid_month') END;
  SELECT CASE WHEN NEW.actual IS NOT NULL THEN RAISE(ABORT, 'invalid_reservation') END;
  SELECT CASE WHEN (SELECT COALESCE(SUM(COALESCE(actual,reserved)),0) FROM runtime_reservations WHERE session_id=NEW.session_id) + NEW.reserved > (SELECT budget FROM runtime_sessions WHERE id=NEW.session_id)
    THEN RAISE(ABORT, 'session_budget_exceeded') END;
  SELECT CASE WHEN (SELECT COUNT(*) FROM runtime_reservations WHERE session_id=NEW.session_id) >= (SELECT max_steps FROM runtime_sessions WHERE id=NEW.session_id)
    THEN RAISE(ABORT, 'step_limit_exceeded') END;
  SELECT CASE WHEN (SELECT COALESCE(SUM(tool_calls),0) FROM runtime_reservations WHERE session_id=NEW.session_id) + NEW.tool_calls > (SELECT max_tool_calls FROM runtime_sessions WHERE id=NEW.session_id)
    THEN RAISE(ABORT, 'tool_limit_exceeded') END;
  SELECT CASE WHEN (SELECT COALESCE(SUM(COALESCE(r.actual,r.reserved)),0) FROM runtime_reservations r JOIN runtime_sessions s ON s.id=r.session_id WHERE r.month=NEW.month AND s.owner_id=(SELECT owner_id FROM runtime_sessions WHERE id=NEW.session_id)) + NEW.reserved > (SELECT monthly_cap FROM runtime_accounts WHERE owner_id=(SELECT owner_id FROM runtime_sessions WHERE id=NEW.session_id))
    THEN RAISE(ABORT, 'account_budget_exceeded') END;
END;
CREATE TRIGGER runtime_reservation_immutable BEFORE UPDATE ON runtime_reservations
WHEN OLD.actual IS NOT NULL OR NEW.actual IS NULL OR NEW.id != OLD.id OR NEW.session_id != OLD.session_id OR NEW.month != OLD.month OR NEW.reserved != OLD.reserved OR NEW.tool_calls != OLD.tool_calls
BEGIN SELECT RAISE(ABORT, 'immutable_reservation'); END;
CREATE TRIGGER runtime_reservation_no_delete BEFORE DELETE ON runtime_reservations
BEGIN SELECT RAISE(ABORT, 'immutable_reservation'); END;
