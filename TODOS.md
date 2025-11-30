# Scout - Development TODOs

## Current Focus: V1 MVP

### Phase 1: Infrastructure (Milestone 1)
- [ ] Set up SvelteKit project structure
- [ ] Configure Cloudflare adapter
- [ ] Set up Cloudflare D1, KV, and Queues via wrangler
- [ ] Run initial database migration (001_init.sql from docs/DATA_MODEL.md)
- [ ] Configure secrets management (Brave API, Claude API, Stripe keys)

### Phase 2: Authentication
- [ ] Implement Google OAuth flow
- [ ] Implement Apple Sign-In
- [ ] Session management (tokens in KV)
- [ ] Protected route middleware
- [ ] Logout flow

### Phase 3: Core Data
- [ ] User profile CRUD (sizes, colors, budget, retailers, style notes)
- [ ] Profile JSON validation with Zod
- [ ] Credit balance calculation from ledger

### Phase 4: Search System
- [ ] Search input page (freeform + structured form)
- [ ] Query parsing and validation
- [ ] Job queue integration (Cloudflare Queues)
- [ ] Search worker (queue consumer)
- [ ] Status polling endpoint

### Phase 5: Agent System
- [ ] Tool definitions (web_search, web_fetch, save_result, mark_complete)
- [ ] Brave Search API integration
- [ ] Web fetch with content extraction
- [ ] Orchestrator agent implementation
- [ ] Curator agent implementation
- [ ] Result aggregation and deduplication

### Phase 6: Results & Sharing
- [ ] Results page with 5 curated items
- [ ] Product card component (image, price, retailer, match reason)
- [ ] Collapsible "all results" section
- [ ] Share token generation
- [ ] Public share page (/s/[token])

### Phase 7: Billing
- [ ] Stripe product/price setup (Basic $10/50 credits, Pro $25/200 credits)
- [ ] Subscription checkout flow
- [ ] Credit pack purchase flow
- [ ] Stripe webhook handler
- [ ] Credits granted on subscription renewal

### Phase 8: Notifications & Polish
- [ ] Email on search complete/failed (Resend)
- [ ] Query cache (KV, 24hr TTL)
- [ ] Dashboard page
- [ ] Landing page with value prop
- [ ] Pricing page

---

## Open Questions (Block V1)
1. Multi-domain credit calculation - flat rate per search?
2. Image sourcing - Brave Image Search or accept missing images?
3. Beta launch strategy - invite-only vs public?

---

*See docs/TODO.md for full V2/V3 roadmap*
