-- Scout - User Feedback Tables
-- Stores user feedback on product recommendations for model improvement

-- User feedback on products
CREATE TABLE IF NOT EXISTS user_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    search_id TEXT NOT NULL,
    product_id TEXT,
    feedback_type TEXT NOT NULL CHECK(feedback_type IN ('up', 'down')),
    product_name TEXT,
    product_url TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, search_id, product_url)
);

-- Index for querying feedback by user
CREATE INDEX IF NOT EXISTS idx_user_feedback_user ON user_feedback(user_id);

-- Index for querying feedback by search
CREATE INDEX IF NOT EXISTS idx_user_feedback_search ON user_feedback(search_id);

-- User API keys for BYOK (Bring Your Own Key)
CREATE TABLE IF NOT EXISTS user_api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    provider TEXT NOT NULL CHECK(provider IN ('deepseek', 'tavily', 'anthropic', 'brave')),
    api_key_encrypted TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, provider)
);

-- Index for BYOK keys lookup
CREATE INDEX IF NOT EXISTS idx_user_api_keys_user ON user_api_keys(user_id);
