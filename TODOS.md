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
- [ ] Tool definitions (web_search, web_fetch, save_result, mark_complete) (functionality integrated in orchestrator)
- [x] Brave Search API integration
- [ ] Web fetch with content extraction (not yet implemented)
- [x] Orchestrator agent implementation
- [x] Curator agent implementation
- [x] Result aggregation and deduplication

### Phase 6: Results & Sharing
- [x] Results page with 5 curated items
- [x] Product card component (image, price, retailer, match reason)
- [x] Collapsible "all results" section
- [x] Share token generation
- [x] Public share page (/s/[token])

### Phase 7: Billing
- [ ] Stripe product/price setup (Basic $10/50 credits, Pro $25/200 credits)
- [x] Subscription checkout flow
- [ ] Credit pack purchase flow
- [x] Stripe webhook handler
- [ ] Credits granted on subscription renewal

### Phase 8: Notifications & Polish
- [x] Email on search complete/failed (Resend)
- [x] Query cache (KV, 24hr TTL)
- [x] Dashboard page
- [x] Landing page with value prop
- [x] Pricing page

---

## Open Questions (Block V1)
1. Multi-domain credit calculation - flat rate per search?
2. Image sourcing - Brave Image Search or accept missing images?
3. Beta launch strategy - invite-only vs public?

---

*See docs/TODO.md for full V2/V3 roadmap*