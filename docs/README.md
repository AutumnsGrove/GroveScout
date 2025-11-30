# Scout

> Your personal deal-hunting research agent.  
> **scout.grove.place**

Scout is an async shopping research tool that eliminates the cognitive overload of deal-hunting. Tell it what you want, walk away, and come back to a clean list of 5 perfect matches.

---

## The Pitch

Shopping sucks when you have ADHD. Amazon is overwhelming. Deal sites are chaos. Black Friday is a nightmare.

Scout fixes this:

1. **Tell it what you want** — "cozy sweater, earth tones, under $60"
2. **Walk away** — Scout's AI agents search the web in the background
3. **Come back to results** — 5 curated products with direct purchase links

No infinite scrolling. No decision paralysis. No accidental $200 Amazon cart.

---

## Spec Package Contents

| File | Description |
|------|-------------|
| [`PROJECT_SPEC.md`](./PROJECT_SPEC.md) | Full product and technical specification |
| [`DATA_MODEL.md`](./DATA_MODEL.md) | D1 database schema with SQL migrations |
| [`AGENT_PROMPTS.md`](./AGENT_PROMPTS.md) | Prompt engineering for research agents |
| [`TODO.md`](./TODO.md) | Roadmap, milestones, and open questions |

---

## Tech Stack

- **Frontend**: SvelteKit
- **Backend**: Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **Queue**: Cloudflare Queues
- **Cache**: Cloudflare KV
- **AI**: Claude API (Anthropic)
- **Search**: Brave Search API
- **Payments**: Stripe
- **Email**: Resend

---

## Quick Start (For Claude Code)

When implementing, start here:

### Phase 1: Infrastructure
```bash
# Create SvelteKit project
npx sv create scout
cd scout

# Add Cloudflare adapter
npm install @sveltejs/adapter-cloudflare

# Set up wrangler for D1, KV, Queues
npx wrangler d1 create scout-db
npx wrangler kv namespace create SCOUT_CACHE
npx wrangler queues create scout-search-jobs
```

### Phase 2: Database
```bash
# Run initial migration
npx wrangler d1 execute scout-db --file=./migrations/001_init.sql
```

### Phase 3: Auth
Implement Google OAuth first, then Apple. Use session tokens stored in KV.

### Phase 4: Core Flow
1. Profile CRUD
2. Search submission → queue
3. Worker consumes queue → runs agents
4. Results stored → status updated
5. Frontend polls status → displays results

### Phase 5: Billing
Stripe subscriptions + webhooks + credit ledger.

---

## Internal Codename

The project is internally called **Research Goblin**. Feel free to use this in code comments, logs, and internal docs. Customer-facing name is **Scout**.

---

## Key Design Decisions

### Why async?
Because good research takes time. Users can fire and forget, and we can optimize for quality over speed without making them stare at a loading spinner.

### Why 5 results?
Paradox of choice. More options = more anxiety. 5 is enough to compare, few enough to decide.

### Why Cloudflare?
Cheap, fast, integrated ecosystem. D1 + KV + Queues + Workers all play nice together. Perfect for a bootstrapped solo project.

### Why credits instead of unlimited?
AI inference costs money. Credits create natural usage limits and make the business sustainable. Pro tier gets more, but nobody gets "unlimited" in a way that could bankrupt the product.

---

## License

Proprietary. This is Autumn's product idea. Don't steal it. 💜
