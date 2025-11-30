-- Scout Initial Schema
-- Run with: npx wrangler d1 execute scout-db --file=./migrations/0001_init.sql

-- Users
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    auth_provider TEXT NOT NULL,
    auth_provider_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(auth_provider, auth_provider_id)
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Profiles
CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    display_name TEXT,
    sizes TEXT,
    color_preferences TEXT,
    budget_min INTEGER,
    budget_max INTEGER,
    favorite_retailers TEXT,
    excluded_retailers TEXT,
    style_notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);

-- Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan TEXT NOT NULL,
    status TEXT NOT NULL,
    stripe_customer_id TEXT NOT NULL,
    stripe_subscription_id TEXT UNIQUE NOT NULL,
    current_period_start TEXT NOT NULL,
    current_period_end TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- Searches
CREATE TABLE IF NOT EXISTS searches (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    query_freeform TEXT,
    query_structured TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    credits_used INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    started_at TEXT,
    completed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_searches_user_id ON searches(user_id);
CREATE INDEX IF NOT EXISTS idx_searches_status ON searches(status);
CREATE INDEX IF NOT EXISTS idx_searches_created_at ON searches(created_at);

-- Search Results
CREATE TABLE IF NOT EXISTS search_results (
    id TEXT PRIMARY KEY,
    search_id TEXT UNIQUE NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
    results_raw TEXT NOT NULL,
    results_curated TEXT NOT NULL,
    share_token TEXT UNIQUE,
    cache_key TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_search_results_search_id ON search_results(search_id);
CREATE INDEX IF NOT EXISTS idx_search_results_share_token ON search_results(share_token);
CREATE INDEX IF NOT EXISTS idx_search_results_cache_key ON search_results(cache_key);

-- Credit Ledger
CREATE TABLE IF NOT EXISTS credit_ledger (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    reason TEXT NOT NULL,
    search_id TEXT REFERENCES searches(id) ON DELETE SET NULL,
    subscription_id TEXT REFERENCES subscriptions(id) ON DELETE SET NULL,
    stripe_payment_id TEXT,
    note TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_user_id ON credit_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_created_at ON credit_ledger(created_at);
