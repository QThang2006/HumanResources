-- TV4 / SCRUM-17: distinguish actual account closure from legacy delivery completion.
-- Run once before deploying where TypeORM synchronize is disabled.
-- Existing rows retain NULL; they are not assumed to have locked an account.
ALTER TABLE offboarding_cases ADD COLUMN finalized_at DATETIME NULL;
