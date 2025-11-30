# Scout — Project Specification

> Internal codename: Research Goblin  
> Product URL: scout.grove.place

## Overview

Scout is an async deal-finding research agent that eliminates the cognitive overload of shopping. Users describe what they're looking for—via structured form or freeform "vibe" input—and Scout dispatches AI agents to search the web, aggregate results, and return a clean, curated list of 5 products with direct purchase links.

The core value proposition is **cognitive offloading for overwhelmed shoppers**. Users with ADHD, decision fatigue, or simply no time can fire off a search, walk away, and return to find exactly what they need without ever touching Amazon's overwhelming interface.

## Target Users

- People with ADHD or sensory overwhelm who struggle with shopping interfaces
- Busy professionals who want deals but don't have time to hunt
- Bargain hunters who want curated deals, not infinite scrolling
- Anyone who knows *what vibe* they want but not *what product*

## Core User Stories

1. **Profile Setup**: As a user, I create a profile with my sizes, color preferences, budget range, and style notes so searches are personalized from the start.

2. **Quick Search**: As a user, I type "cheap mechanical keyboard, clicky switches, under $80" and get results without filling out forms.

3. **Structured Search**: As a user, I fill out a form specifying category, price range, and preferences when I want more control.

4. **Fire and Forget**: As a user, I submit a search and close the tab. I get an email when results are ready.

5. **Clean Results**: As a user, I see exactly 5 curated products—not 500—with clear "why this fits you" explanations.

6. **Direct Links**: As a user, I click a product and go straight to the purchase page. No detours.

7. **Share Results**: As a user, I can share my curated list with friends via a public link.

8. **Credit Tracking**: As a user, I see how many searches I have left this month.

---

## V1 Feature Scope

### Authentication
- Sign in with Google (primary)
- Sign in with Apple (secondary)
- Magic link email as 2FA option
- No username/password for V1

### User Profile
- Display name
- Clothing sizes (shirt, pants, shoes—freeform to handle different systems)
- Color preferences (favorites, colors to avoid)
- Default budget range (min/max)
- Favorite retailers (optional)
- Style notes (freeform text describing their aesthetic/vibe)

### Search Input
- **Freeform text box**: "Find me a cozy oversized sweater, earth tones, under $60"
- **Structured form** (optional, for users who want control):
  - Category (tech, clothing, home, etc.)
  - Price range
  - Specific requirements
  - Retailers to include/exclude
- Voice input via browser speech API (stretch goal for V1)

### Search Execution
- Async job queue (Cloudflare Queues)
- Status states: `pending` → `running` → `completed` | `failed` | `needs_confirmation`
- Email notification on completion
- Timeout handling for long-running searches
- Credit deduction on completion (not on submission)

### Results Display
- **Curated list**: 5 products, displayed as cards
- Each card shows:
  - Product image (if available)
  - Product name
  - Current price (with original price if on sale)
  - Retailer name
  - Direct link to product
  - "Why this fits you" explanation (1-2 sentences)
  - Match confidence (percentage or simple rating)
- **Collapsible details**: Expandable section with more info
- **Exhaustive list**: Hidden by default, available via toggle for power users

### Shareable Results
- Each completed search gets a unique share token
- Public URL: `scout.grove.place/s/[token]`
- No auth required to view shared results
- Results expire after 30 days

### Credit System
- **Basic plan**: $10/month for 50 searches
- **Pro plan**: $25/month for 200 searches (soft limit, not hard unlimited)
- **Credit packs**: $10 for 50 additional searches (rollover allowed)
- Multi-domain searches (e.g., "tech AND clothing deals") count as multiple credits
- Failed searches don't consume credits
- "Needs more searching" prompts user to approve extra credit spend

### Payments
- Stripe integration
- Subscription management (upgrade, downgrade, cancel)
- One-time credit pack purchases
- Webhook handling for subscription events

### Caching
- Search results cached by normalized query hash
- Cache TTL: 24 hours (deals change fast)
- Cache hit = no credit deduction, instant results
- Cache is user-agnostic (same query from different users can hit cache)

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | SvelteKit |
| Backend | Cloudflare Workers |
| Database | Cloudflare D1 (SQLite) |
| Queue | Cloudflare Queues |
| Cache | Cloudflare KV |
| Auth | Custom OAuth flow (Google, Apple) |
| AI | Claude API (Anthropic) via claude-ai SDK |
| Web Search | Brave Search API |
| Payments | Stripe |
| Email | Resend or Cloudflare Email Workers |

### Why This Stack

- **Cloudflare ecosystem**: Cheap, fast, scales automatically. D1 is SQLite so it's familiar. Workers are edge-native. Everything plays nice together.
- **SvelteKit**: Fast, reactive, minimal boilerplate. Already in use at grove.place.
- **Claude**: Best reasoning for complex agent orchestration. Tool use is mature.
- **Brave Search**: Privacy-respecting, good API, already used by Claude's web search.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         scout.grove.place                        │
├─────────────────────────────────────────────────────────────────┤
│  SvelteKit Frontend                                              │
│  ├── /auth/*          (login, callback, logout)                  │
│  ├── /dashboard       (profile, credits, history)                │
│  ├── /search/new      (search input form)                        │
│  ├── /search/[id]     (status + results)                         │
│  └── /s/[token]       (shareable public results)                 │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Cloudflare Workers (API)                                        │
│  ├── POST /api/search         → enqueue search job               │
│  ├── GET  /api/search/[id]    → get status/results               │
│  ├── GET  /api/profile        → get user profile                 │
│  ├── PUT  /api/profile        → update profile                   │
│  ├── GET  /api/credits        → get balance                      │
│  └── POST /api/webhooks/*     → Stripe webhooks                  │
└─────────────────────────────────────────────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    ▼                       ▼
┌──────────────────────────┐   ┌──────────────────────────┐
│  Cloudflare D1           │   │  Cloudflare KV           │
│  (persistent data)       │   │  (cache layer)           │
│  ├── users               │   │  ├── search results      │
│  ├── profiles            │   │  └── session tokens      │
│  ├── searches            │   └──────────────────────────┘
│  ├── search_results      │
│  ├── credit_ledger       │
│  └── subscriptions       │
└──────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Cloudflare Queues (async job processing)                        │
│  └── search-jobs queue                                           │
│      └── consumed by: Search Worker                              │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Search Worker (Agent Orchestrator)                              │
│  ├── Main Agent (Claude)                                         │
│  │   ├── Parse user intent + profile                             │
│  │   ├── Spawn sub-agents                                        │
│  │   ├── Aggregate results                                       │
│  │   └── Run final curation                                      │
│  ├── Sub-Agent: Deal Searcher                                    │
│  ├── Sub-Agent: Retailer Searcher                                │
│  └── Sub-Agent: Quality Verifier                                 │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  External APIs                                                   │
│  ├── Brave Search API (web search)                               │
│  ├── Claude API (AI inference)                                   │
│  ├── Stripe API (payments)                                       │
│  └── Resend API (email notifications)                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Page Routes

| Route | Description | Auth Required |
|-------|-------------|---------------|
| `/` | Landing page, value prop, pricing | No |
| `/auth/login` | OAuth provider selection | No |
| `/auth/callback` | OAuth callback handler | No |
| `/auth/logout` | Clear session, redirect | Yes |
| `/dashboard` | User home: profile summary, credits, recent searches | Yes |
| `/profile` | Edit profile (sizes, preferences, etc.) | Yes |
| `/search/new` | New search form (freeform + structured) | Yes |
| `/search/[id]` | Search status and results | Yes |
| `/s/[token]` | Public shareable results | No |
| `/pricing` | Plan comparison, upgrade flow | No |
| `/checkout` | Stripe checkout redirect | Yes |
| `/settings` | Account settings, subscription management | Yes |

---

## API Endpoints

### Auth
- `GET /api/auth/google` — Initiate Google OAuth
- `GET /api/auth/apple` — Initiate Apple OAuth
- `GET /api/auth/callback` — Handle OAuth callback, create session
- `POST /api/auth/logout` — Clear session

### Profile
- `GET /api/profile` — Get current user's profile
- `PUT /api/profile` — Update profile fields

### Search
- `POST /api/search` — Create new search, enqueue job
- `GET /api/search/[id]` — Get search status and results
- `GET /api/search/history` — List user's past searches
- `POST /api/search/[id]/continue` — Approve extra credits for extended search

### Credits
- `GET /api/credits` — Get current balance and ledger
- `POST /api/credits/purchase` — Create Stripe checkout for credit pack

### Subscriptions
- `GET /api/subscription` — Get current subscription status
- `POST /api/subscription/checkout` — Create Stripe checkout for subscription
- `POST /api/subscription/portal` — Redirect to Stripe customer portal

### Webhooks
- `POST /api/webhooks/stripe` — Handle Stripe events

### Public
- `GET /api/share/[token]` — Get shareable results (no auth)

---

## Non-Functional Requirements

### Performance
- Search job should complete in under 5 minutes for typical queries
- Results page should load in under 1 second
- Cache hits should be instant

### Reliability
- Failed jobs should be retried up to 3 times
- Users should never lose credits without getting results or a clear failure message
- Email notifications must be sent for completed and failed searches

### Security
- All API endpoints require auth except public share links
- OAuth tokens stored securely, never exposed to frontend
- Stripe webhook signatures verified
- Rate limiting on search creation (prevent abuse)

### Scalability
- Cloudflare Workers scale automatically
- D1 can handle thousands of users for V1
- Queue processing can be parallelized if needed

---

## Success Metrics (V1)

- Users can go from signup to first search results in under 5 minutes
- 90% of searches complete successfully
- Average search time under 3 minutes
- User retention: 50% of users run at least 3 searches in first month
- NPS from beta users > 40

---

## Open Questions

1. **Search complexity pricing**: How do we reliably detect multi-domain searches? LLM classification? Keyword counting?

2. **Retailer coverage**: Should we build specific integrations for major retailers (Amazon, Target, Walmart) or rely purely on web search?

3. **Image sourcing**: How do we reliably get product images? Web scraping is fragile. Some search APIs include images.

4. **Mobile experience**: SvelteKit PWA? Native app later? Or responsive web is enough for V1?

5. **Beta launch**: Invite-only? Waitlist? Or just ship it?
