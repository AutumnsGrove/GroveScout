# Scout — Roadmap & TODO

## V1: MVP (Current Focus)

The goal is a working product that Autumn can use herself and invite beta users to try.

### Core Infrastructure
- [ ] Set up SvelteKit project structure
- [ ] Configure Cloudflare Workers + D1 + KV + Queues
- [ ] Run initial database migration (001_init.sql)
- [ ] Set up environment variables / secrets management

### Authentication
- [ ] Implement Google OAuth flow
- [ ] Implement Apple Sign-In
- [ ] Session management (JWT in cookie or KV)
- [ ] Protected route middleware
- [ ] Logout flow

### User Profile
- [ ] Profile creation on first login
- [ ] Profile edit page (sizes, colors, budget, retailers, style notes)
- [ ] Profile JSON validation

### Search Flow
- [ ] Search input page (freeform text box + structured form)
- [ ] Query parsing (extract category, price range, requirements)
- [ ] Job queue integration (Cloudflare Queues)
- [ ] Search worker (consumes queue, runs agents)
- [ ] Status polling endpoint
- [ ] Results storage

### Agent System
- [ ] Orchestrator agent implementation
- [ ] Tool definitions (web_search, web_fetch, save_result, mark_complete)
- [ ] Brave Search API integration
- [ ] Web fetch with content extraction
- [ ] Curator agent implementation
- [ ] Result aggregation and deduplication

### Results Display
- [ ] Results page with 5 curated items
- [ ] Product card component (image, price, retailer, link, match reason)
- [ ] Collapsible "full results" section
- [ ] Loading/status states
- [ ] Error states

### Sharing
- [ ] Generate share tokens for completed searches
- [ ] Public share page (/s/[token])
- [ ] Share link copy button
- [ ] Expiration handling

### Credits & Billing
- [ ] Credit balance calculation from ledger
- [ ] Credit deduction on search completion
- [ ] Stripe product/price setup
- [ ] Subscription checkout flow
- [ ] Credit pack purchase flow
- [ ] Stripe webhook handler
- [ ] Subscription status sync
- [ ] Credits granted on subscription renewal

### Notifications
- [ ] Email on search complete (Resend integration)
- [ ] Email on search failed
- [ ] Email templates

### Caching
- [ ] Query normalization for cache keys
- [ ] KV cache read before search
- [ ] KV cache write after search
- [ ] Cache TTL (24 hours)
- [ ] Cache hit = no credit deduction

### Dashboard
- [ ] User dashboard page
- [ ] Recent searches list
- [ ] Credit balance display
- [ ] Quick search form
- [ ] Profile summary

### Polish
- [ ] Landing page with value prop
- [ ] Pricing page
- [ ] Basic SEO (meta tags, OG images)
- [ ] Error boundaries
- [ ] Loading skeletons
- [ ] Mobile responsiveness

---

## V2: Enhanced Experience

After V1 is stable and has some users.

### SMS/Text Interface
- [ ] Twilio integration
- [ ] Phone number collection in profile
- [ ] SMS-triggered search flow
- [ ] SMS results delivery (condensed format with links)
- [ ] SMS credit confirmation for extended searches

### Vibe Shopping (Beyond Deals)
- [ ] "Find me products" mode (not just deals)
- [ ] Aesthetic-based search prompts
- [ ] Style matching improvements
- [ ] Broader retailer coverage

### Taste Matching Integration
- [ ] Import Autumn's existing taste-matching code
- [ ] "How well does this match my style?" scoring
- [ ] Learn from user feedback (thumbs up/down on results)
- [ ] Preference refinement suggestions

### Search Refinement
- [ ] "Show me more like this" on individual results
- [ ] "Exclude this type" feedback
- [ ] Search history-informed suggestions
- [ ] Saved search templates

### Price Tracking
- [ ] Track prices on saved/favorited items
- [ ] Price drop alerts (email)
- [ ] Historical price display
- [ ] "Wait for a better deal" recommendations

### Email Digests
- [ ] Weekly deals digest based on profile
- [ ] Category-specific deal alerts
- [ ] Digest frequency preferences

---

## V3: Scale & Expand

When there's meaningful revenue and user base.

### Browser Extension
- [ ] Chrome extension
- [ ] "Scout this page" button on product pages
- [ ] Price comparison overlay
- [ ] One-click add to Scout watchlist

### API Access
- [ ] Public API for third-party integrations
- [ ] API key management
- [ ] Usage-based API pricing
- [ ] Documentation

### Collaborative Features
- [ ] Shared wishlists
- [ ] "Scout for a friend" (gift finding)
- [ ] Group deal hunting
- [ ] Family accounts

### Advanced Personalization
- [ ] ML-based preference learning
- [ ] Purchase history integration (optional)
- [ ] Cross-category recommendations
- [ ] Seasonal preference adjustments

### Retailer Integrations
- [ ] Direct Amazon Product Advertising API
- [ ] Affiliate link integration
- [ ] Real-time inventory checking
- [ ] Retailer-specific deal feeds

### Mobile App
- [ ] React Native or native iOS/Android
- [ ] Push notifications for deals
- [ ] Widget for quick searches
- [ ] Voice input improvements

---

## Technical Debt & Improvements

Track these as they come up during development.

### Performance
- [ ] Agent response streaming (show progress)
- [ ] Parallel sub-agent execution
- [ ] Search result pagination
- [ ] Image optimization/CDN

### Reliability
- [ ] Comprehensive error logging
- [ ] Dead letter queue for failed jobs
- [ ] Retry logic improvements
- [ ] Health check endpoints
- [ ] Uptime monitoring

### Security
- [ ] Rate limiting on all endpoints
- [ ] Input sanitization audit
- [ ] CSRF protection
- [ ] Security headers

### Developer Experience
- [ ] Local development setup documentation
- [ ] Database seeding scripts
- [ ] Mock agent mode (for testing without API costs)
- [ ] CI/CD pipeline

---

## Open Questions to Resolve

### V1 Blockers
1. **Multi-domain credit calculation**: How do we reliably detect when a search spans multiple categories? Options:
   - LLM classification of query complexity (adds latency)
   - Keyword/category counting (brittle)
   - Flat rate per search, simplify pricing

2. **Image sourcing**: Where do product images come from?
   - Scrape from retailer pages (fragile, legal gray area)
   - Brave Image Search (separate API call)
   - Accept that some results won't have images

3. **Beta launch strategy**:
   - Invite-only to friends/Twitter followers?
   - Public waitlist?
   - Just ship it and see what happens?

### Future Considerations
4. **Affiliate revenue**: Should Scout earn affiliate commissions?
   - Pros: Additional revenue stream, aligns incentives (we want users to buy)
   - Cons: Complexity, potential bias in recommendations, disclosure requirements

5. **International support**: How do we handle non-US users?
   - Currency conversion
   - Different retailers
   - Different deal sites

---

## Milestones

### Milestone 1: "It Works" (Target: 2 weeks)
- Auth flow complete
- Can submit a search and get results
- Results display properly
- No payments yet (free tier only)

### Milestone 2: "It's Useful" (Target: 4 weeks)
- Profile system working
- Search quality is good enough to use daily
- Sharing works
- Caching works

### Milestone 3: "It Makes Money" (Target: 6 weeks)
- Stripe integration complete
- Subscriptions working
- Credit system enforced
- Landing page + pricing page polished

### Milestone 4: "It's Ready" (Target: 8 weeks)
- Bug fixes from beta feedback
- Performance optimized
- Error handling comprehensive
- Ready for public launch

---

## Notes

- Internal codename remains "Research Goblin" in code comments and logs
- All times in UTC
- All prices in cents (avoid floating point)
- Prefer composition over inheritance in agent code
- Use Zod for runtime validation of API inputs/outputs
