ALTER TABLE waitlist_signups ADD COLUMN audience TEXT NOT NULL DEFAULT 'buyer'
  CHECK (audience IN ('buyer', 'creator'));
CREATE UNIQUE INDEX idx_waitlist_signups_email_audience ON waitlist_signups(email, audience);
DROP INDEX idx_waitlist_signups_email;
