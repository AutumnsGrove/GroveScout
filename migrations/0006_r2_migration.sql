-- Scout - R2 Migration Support
-- Adds tracking for D1 → R2 auto-migration of search results

-- Add r2_key column to track migrated results
-- When populated, results have been moved to R2 and D1 data is cleared
ALTER TABLE search_results ADD COLUMN r2_key TEXT;

-- Add migrated_at timestamp to track when migration occurred
ALTER TABLE search_results ADD COLUMN migrated_at TEXT;

-- Index for finding results that need migration (older than 7 days, not yet migrated)
CREATE INDEX IF NOT EXISTS idx_search_results_migration
ON search_results(created_at, r2_key)
WHERE r2_key IS NULL;

-- Index for looking up results by R2 key
CREATE INDEX IF NOT EXISTS idx_search_results_r2_key
ON search_results(r2_key)
WHERE r2_key IS NOT NULL;
