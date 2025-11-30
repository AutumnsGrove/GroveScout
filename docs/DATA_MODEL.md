# Scout — Data Model

> Database: Cloudflare D1 (SQLite)

## Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────┐       ┌─────────────────┐
│   users     │───┬───│  profiles   │       │  subscriptions  │
└─────────────┘   │   └─────────────┘       └─────────────────┘
                  │                                   │
                  │   ┌─────────────┐                 │
                  ├───│  searches   │─────────────────┤
                  │   └─────────────┘                 │
                  │          │                        │
                  │          ▼                        │
                  │   ┌─────────────────┐             │
                  │   │ search_results  │             │
                  │   └─────────────────┘             │
                  │                                   │
                  │   ┌─────────────────┐             │
                  └───│ credit_ledger   │─────────────┘
                      └─────────────────┘

┌─────────────────┐
│  search_cache   │  (KV, not D1 — shown for completeness)
└─────────────────┘
```

---

## Tables

### users

Primary user account table. Minimal—most personalization lives in `profiles`.

```sql
CREATE TABLE users (
    id TEXT PRIMARY KEY,  -- UUID
    email TEXT UNIQUE NOT NULL,
    auth_provider TEXT NOT NULL,  -- 'google', 'apple'
    auth_provider_id TEXT NOT NULL,  -- ID from OAuth provider
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    
    UNIQUE(auth_provider, auth_provider_id)
);

CREATE INDEX idx_users_email ON users(email);
```

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| id | TEXT (UUID) | Primary key |
| email | TEXT | User's email from OAuth |
| auth_provider | TEXT | 'google' or 'apple' |
| auth_provider_id | TEXT | Unique ID from the OAuth provider |
| created_at | TEXT | ISO timestamp |
| updated_at | TEXT | ISO timestamp |

---

### profiles

User preferences and personalization data. Separated from `users` for clean separation of auth vs. personalization.

```sql
CREATE TABLE profiles (
    id TEXT PRIMARY KEY,  -- UUID
    user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    display_name TEXT,
    
    -- Sizing (JSON for flexibility across clothing systems)
    sizes TEXT,  -- JSON: {"shirt": "L", "pants": "32x30", "shoes": "10.5"}
    
    -- Preferences
    color_preferences TEXT,  -- JSON: {"favorites": ["blue", "earth tones"], "avoid": ["neon", "pink"]}
    budget_min INTEGER,  -- in cents, e.g., 5000 = $50.00
    budget_max INTEGER,  -- in cents
    favorite_retailers TEXT,  -- JSON array: ["rei.com", "patagonia.com"]
    excluded_retailers TEXT,  -- JSON array: ["wish.com"]
    
    -- Freeform vibe/style description
    style_notes TEXT,
    
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_profiles_user_id ON profiles(user_id);
```

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| id | TEXT (UUID) | Primary key |
| user_id | TEXT | FK to users |
| display_name | TEXT | User's preferred name |
| sizes | TEXT (JSON) | Clothing/shoe sizes |
| color_preferences | TEXT (JSON) | Favorite and avoided colors |
| budget_min | INTEGER | Default min budget in cents |
| budget_max | INTEGER | Default max budget in cents |
| favorite_retailers | TEXT (JSON) | Preferred retailers |
| excluded_retailers | TEXT (JSON) | Retailers to skip |
| style_notes | TEXT | Freeform aesthetic description |
| created_at | TEXT | ISO timestamp |
| updated_at | TEXT | ISO timestamp |

**Example `sizes` JSON:**
```json
{
  "shirt": "L",
  "pants": "32x30",
  "dress": null,
  "shoes": "10.5 US",
  "hat": "7 1/4"
}
```

**Example `color_preferences` JSON:**
```json
{
  "favorites": ["blue", "purple", "earth tones", "forest green"],
  "avoid": ["neon", "bright orange", "hot pink"]
}
```

---

### searches

Individual search requests. Tracks status, timing, and credit usage.

```sql
CREATE TABLE searches (
    id TEXT PRIMARY KEY,  -- UUID
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Input
    query_freeform TEXT,  -- Raw user input
    query_structured TEXT,  -- JSON: parsed/structured query
    
    -- Execution
    status TEXT NOT NULL DEFAULT 'pending',  -- pending, running, completed, failed, needs_confirmation
    credits_used INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,  -- If failed, why
    
    -- Timing
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    started_at TEXT,
    completed_at TEXT
);

CREATE INDEX idx_searches_user_id ON searches(user_id);
CREATE INDEX idx_searches_status ON searches(status);
CREATE INDEX idx_searches_created_at ON searches(created_at);
```

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| id | TEXT (UUID) | Primary key |
| user_id | TEXT | FK to users |
| query_freeform | TEXT | Raw text input from user |
| query_structured | TEXT (JSON) | Parsed query (category, price range, etc.) |
| status | TEXT | Current status |
| credits_used | INTEGER | Credits deducted for this search |
| error_message | TEXT | Error details if failed |
| created_at | TEXT | When search was submitted |
| started_at | TEXT | When processing began |
| completed_at | TEXT | When processing finished |

**Status values:**
- `pending` — In queue, not yet started
- `running` — Agent is actively searching
- `completed` — Results ready
- `failed` — Something went wrong (see error_message)
- `needs_confirmation` — Couldn't find results, asking user to approve extra credits

**Example `query_structured` JSON:**
```json
{
  "category": "clothing",
  "subcategory": "outerwear",
  "item_type": "jacket",
  "price_min": 5000,
  "price_max": 15000,
  "requirements": ["waterproof", "hood"],
  "brands": ["patagonia", "north face", "rei"],
  "exclude_brands": [],
  "keywords": ["rain jacket", "lightweight"]
}
```

---

### search_results

Results for completed searches. Stores both raw aggregated results and curated final list.

```sql
CREATE TABLE search_results (
    id TEXT PRIMARY KEY,  -- UUID
    search_id TEXT UNIQUE NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
    
    -- Results
    results_raw TEXT NOT NULL,  -- JSON: full list from agents
    results_curated TEXT NOT NULL,  -- JSON: final 5 items
    
    -- Sharing
    share_token TEXT UNIQUE,  -- For public share links
    
    -- Metadata
    cache_key TEXT,  -- Hash used for caching
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT  -- When share link expires
);

CREATE INDEX idx_search_results_search_id ON search_results(search_id);
CREATE INDEX idx_search_results_share_token ON search_results(share_token);
CREATE INDEX idx_search_results_cache_key ON search_results(cache_key);
```

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| id | TEXT (UUID) | Primary key |
| search_id | TEXT | FK to searches |
| results_raw | TEXT (JSON) | Full aggregated results (25+ items) |
| results_curated | TEXT (JSON) | Final 5 curated items |
| share_token | TEXT | Unique token for public sharing |
| cache_key | TEXT | Hash for cache lookup |
| created_at | TEXT | ISO timestamp |
| expires_at | TEXT | When share link expires |

**Example `results_curated` JSON:**
```json
{
  "items": [
    {
      "rank": 1,
      "name": "Patagonia Torrentshell 3L Jacket",
      "price_current": 12900,
      "price_original": 17900,
      "discount_percent": 28,
      "retailer": "rei.com",
      "url": "https://www.rei.com/product/...",
      "image_url": "https://...",
      "match_score": 94,
      "match_reason": "Waterproof, lightweight, earth tone (dark green). Within your budget at $129, down from $179. REI is one of your favorite retailers."
    },
    // ... 4 more items
  ],
  "search_summary": "Found 23 rain jackets matching your criteria. Curated to 5 based on price, reviews, and fit with your style preferences.",
  "generated_at": "2025-11-30T14:23:00Z"
}
```

---

### credit_ledger

Immutable ledger of all credit transactions. Supports auditing and balance calculation.

```sql
CREATE TABLE credit_ledger (
    id TEXT PRIMARY KEY,  -- UUID
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Transaction
    amount INTEGER NOT NULL,  -- Positive = credit added, negative = credit used
    reason TEXT NOT NULL,  -- 'subscription', 'purchase', 'search', 'refund', 'bonus'
    
    -- References
    search_id TEXT REFERENCES searches(id) ON DELETE SET NULL,
    subscription_id TEXT REFERENCES subscriptions(id) ON DELETE SET NULL,
    stripe_payment_id TEXT,  -- For purchases
    
    -- Metadata
    note TEXT,  -- Human-readable note
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_credit_ledger_user_id ON credit_ledger(user_id);
CREATE INDEX idx_credit_ledger_created_at ON credit_ledger(created_at);
```

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| id | TEXT (UUID) | Primary key |
| user_id | TEXT | FK to users |
| amount | INTEGER | Credits added (positive) or used (negative) |
| reason | TEXT | Transaction type |
| search_id | TEXT | FK to search if credit used for search |
| subscription_id | TEXT | FK to subscription if from subscription |
| stripe_payment_id | TEXT | Stripe reference for purchases |
| note | TEXT | Human-readable description |
| created_at | TEXT | ISO timestamp |

**Reason values:**
- `subscription` — Monthly credits from subscription
- `purchase` — One-time credit pack purchase
- `search` — Credits used for a search (negative)
- `refund` — Credits refunded for failed search
- `bonus` — Promotional credits

**Balance calculation:**
```sql
SELECT COALESCE(SUM(amount), 0) as balance
FROM credit_ledger
WHERE user_id = ?;
```

---

### subscriptions

Subscription status synced from Stripe.

```sql
CREATE TABLE subscriptions (
    id TEXT PRIMARY KEY,  -- UUID
    user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Plan
    plan TEXT NOT NULL,  -- 'basic', 'pro'
    status TEXT NOT NULL,  -- 'active', 'canceled', 'past_due', 'trialing'
    
    -- Stripe
    stripe_customer_id TEXT NOT NULL,
    stripe_subscription_id TEXT UNIQUE NOT NULL,
    
    -- Billing period
    current_period_start TEXT NOT NULL,
    current_period_end TEXT NOT NULL,
    
    -- Metadata
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
```

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| id | TEXT (UUID) | Primary key |
| user_id | TEXT | FK to users |
| plan | TEXT | 'basic' or 'pro' |
| status | TEXT | Subscription status |
| stripe_customer_id | TEXT | Stripe customer ID |
| stripe_subscription_id | TEXT | Stripe subscription ID |
| current_period_start | TEXT | Start of current billing period |
| current_period_end | TEXT | End of current billing period |
| created_at | TEXT | ISO timestamp |
| updated_at | TEXT | ISO timestamp |

**Plan details:**
| Plan | Price | Credits/Month |
|------|-------|---------------|
| basic | $10/mo | 50 |
| pro | $25/mo | 200 |

---

## Cloudflare KV: Search Cache

Not in D1—stored in Cloudflare KV for fast lookups and automatic TTL expiration.

**Key format:** `cache:{hash}`

Where `hash` is a SHA-256 of the normalized query (lowercased, sorted parameters).

**Value format:**
```json
{
  "results_curated": { ... },
  "created_at": "2025-11-30T14:23:00Z"
}
```

**TTL:** 24 hours (86400 seconds)

---

## Migrations

### Initial Migration (001_init.sql)

```sql
-- 001_init.sql

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
```

---

## Helper Queries

### Get user's current credit balance
```sql
SELECT COALESCE(SUM(amount), 0) as balance
FROM credit_ledger
WHERE user_id = ?;
```

### Get user's recent searches with results
```sql
SELECT 
    s.id,
    s.query_freeform,
    s.status,
    s.credits_used,
    s.created_at,
    s.completed_at,
    sr.share_token
FROM searches s
LEFT JOIN search_results sr ON s.id = sr.search_id
WHERE s.user_id = ?
ORDER BY s.created_at DESC
LIMIT 20;
```

### Check if user has active subscription
```sql
SELECT plan, status, current_period_end
FROM subscriptions
WHERE user_id = ?
AND status IN ('active', 'trialing')
AND current_period_end > datetime('now');
```

### Get shareable results by token
```sql
SELECT 
    sr.results_curated,
    sr.created_at,
    sr.expires_at,
    s.query_freeform
FROM search_results sr
JOIN searches s ON sr.search_id = s.id
WHERE sr.share_token = ?
AND (sr.expires_at IS NULL OR sr.expires_at > datetime('now'));
```
