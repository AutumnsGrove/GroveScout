-- Migration: Add token tracking to searches
-- Tracks Anthropic API token usage per search

ALTER TABLE searches ADD COLUMN tokens_input INTEGER NOT NULL DEFAULT 0;
ALTER TABLE searches ADD COLUMN tokens_output INTEGER NOT NULL DEFAULT 0;
ALTER TABLE searches ADD COLUMN api_calls_count INTEGER NOT NULL DEFAULT 0;
