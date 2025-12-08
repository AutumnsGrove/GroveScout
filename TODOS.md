# Scout - Development TODOs

## Current Focus: V1 MVP

### Phase 1: Infrastructure (Milestone 1)
- [x] Set up SvelteKit project structure
- [x] Configure Cloudflare adapter
- [ ] Set up Cloudflare D1, KV, and Queues via wrangler (D1 & KV done, Queues pending)
- [x] Run initial database migration (001_init.sql from docs/DATA_MODEL.md)
- [x] Configure secrets management (Brave API, Claude API, Stripe keys)

### Phase 2: Authentication
- [x] Implement Google OAuth flow
- [x] Implement Apple Sign-In
- [x] Session management (tokens in KV)
- [x] Protected route middleware
- [x] Logout flow

### Phase 3: Core Data
- [x] User profile CRUD (sizes, colors, budget, retailers, style notes)
- [x] Profile JSON validation with Zod
- [x] Credit balance calculation from ledger

### Phase 4: Search System
- [x] Search input page (freeform + structured form)
- [x] Query parsing and validation
- [ ] Job queue integration (Cloudflare Queues) (queue binding commented out, fallback synchronous)
- [x] Search worker (queue consumer)
- [x] Status polling endpoint

### Phase 5: Agent System
- [x] Tool definitions (integrated in orchestrator)
- [x] Brave Search API integration
- [x] Brave Image Search integration
- [ ] Web fetch with content extraction (not yet implemented)
    - [ ] optional add smart fetch like how Claude does it
- [x] Orchestrator agent implementation (comprehensive search)
- [x] Curator agent implementation
- [x] Result aggregation and deduplication

### Phase 6: Results & Sharing
- [x] Results page with 5 curated items
- [x] Product card component (image, price, retailer, match reason)
- [x] Collapsible "all results" section
- [x] Share token generation
- [x] Public share page (/s/[token])
- [x] User feedback (thumb up/down) on results

### Phase 7: Billing
- [ ] Stripe product/price setup (Basic $10/50 credits, Pro $25/200 credits)
- [x] Subscription checkout flow
- [ ] Credit pack purchase flow
- [x] Stripe webhook handler
- [ ] Credits granted on subscription renewal

### Phase 8: Notifications & Polish
- [x] Email on search complete/failed (Resend)
- [x] Query cache (KV, 24hr TTL)
- [x] Dashboard page with load more
- [x] Landing page with value prop
- [x] Pricing page

---

## Personal TODOs (from gym session)

### Completed This Session
- [x] Only finds 1-2 results per search → **FIXED**: Comprehensive search with 20+ retailers, 12 results per query
- [x] Walmart links don't work → **FIXED**: Added `buildProductUrl()` for proper retailer URLs
- [x] No images populated → **FIXED**: Added Brave Image Search integration
- [x] Only calling 1-2 tools → **FIXED**: Now runs 20+ search queries per search
- [x] Switch to DeepSeek v3.2 → **DONE**: DeepSeek provider implemented
- [x] Add Tavily as search option → **DONE**: Tavily integration added
- [x] Proper settings screen → **DONE**: Profile page already has all preferences
- [x] User feedback (thumb up/down) → **DONE**: Added to ProductCard
- [x] Load more searches button → **DONE**: Added to dashboard (5 at a time)
- [x] BYOK options → **DONE**: DB migration ready, API key table created

### Still TODO
- [ ] Live streaming results as search runs
- [ ] Migrate to Cloudflare Durable Objects (keep Queues as fallback)
- [ ] Proper filters on search page
- [ ] Reference project on GroveEngine readme
- [x] D1 → R2 auto-migration (after 7 days, markdown files) → **DONE**: Migration scheduler + R2 storage implemented
- [x] Tavily search provider selector → **DONE**: UI toggle between Brave and Tavily
- [ ] Pass feedback to new search runs for personalization

---

## Manual Commands (Post-Merge)

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Run Database Migrations

**Feedback + BYOK tables (0005):**
```bash
# Local
wrangler d1 execute scout-db --file=./migrations/0005_feedback.sql --local

# Production
wrangler d1 execute scout-db --file=./migrations/0005_feedback.sql
```

**R2 Migration support (0006):**
```bash
# Local
wrangler d1 execute scout-db --file=./migrations/0006_r2_migration.sql --local

# Production
wrangler d1 execute scout-db --file=./migrations/0006_r2_migration.sql
```

### 3. Create R2 Bucket
```bash
# Create the R2 bucket for long-term result storage
wrangler r2 bucket create scout-results
```

### 4. Add New API Keys (when ready)

**DeepSeek API Key:**
```bash
wrangler secret put DEEPSEEK_API_KEY
# Enter your key when prompted
```

**Tavily API Key:**
```bash
wrangler secret put TAVILY_API_KEY
# Enter your key when prompted
```

### 5. Enable BYOK in Config
After adding user keys to the database, update `src/lib/server/agents/config.ts`:
```ts
providers: {
  useDeepSeekForText: true,  // Enable when ready
  useTavily: true,           // Enable when ready
}
```

### 6. Deploy
```bash
pnpm run deploy
```

---

## Open Questions (Block V1) - ANSWERED
1. Multi-domain credit calculation - flat rate per search? → **flat rate**
2. Image sourcing - Brave Image Search or accept missing images? → **accept missing but prefer images, integrated Brave Image Search + Tavily**
3. Beta launch strategy - invite-only vs public? → **invite only, free users get 5 lower-quality searches**

---

*See docs/TODO.md for full V2/V3 roadmap*