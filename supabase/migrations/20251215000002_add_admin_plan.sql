-- Add 'admin' plan to bot_teams CHECK constraint
-- Admin plan has same limits as Team but doesn't require Stripe subscription

ALTER TABLE bot_teams
DROP CONSTRAINT IF EXISTS bot_teams_plan_check;

ALTER TABLE bot_teams
ADD CONSTRAINT bot_teams_plan_check 
CHECK (plan IN ('free', 'pro', 'team', 'enterprise', 'admin'));

COMMENT ON COLUMN bot_teams.plan IS 'Subscription plan: free, pro, team, enterprise, or admin (admin has Team limits but no Stripe subscription)';

