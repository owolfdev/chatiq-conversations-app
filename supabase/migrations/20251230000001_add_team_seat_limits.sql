-- Add optional seat expansion fields for team memberships

ALTER TABLE bot_teams
  ADD COLUMN IF NOT EXISTS extra_seats integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS seat_limit_override integer;

ALTER TABLE bot_teams
  ADD CONSTRAINT bot_teams_extra_seats_nonnegative CHECK (extra_seats >= 0),
  ADD CONSTRAINT bot_teams_seat_limit_override_nonnegative CHECK (
    seat_limit_override IS NULL OR seat_limit_override >= 0
  );

COMMENT ON COLUMN bot_teams.extra_seats IS 'Additional paid seats beyond the plan base (default 0).';
COMMENT ON COLUMN bot_teams.seat_limit_override IS 'Optional hard override for total seat limit.';
