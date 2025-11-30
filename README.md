# Scout

> Your personal deal-hunting research agent.
> **scout.grove.place**

Scout is an async shopping research tool that eliminates the cognitive overload of deal-hunting. Tell it what you want, walk away, and come back to a clean list of 5 perfect matches.

## The Pitch

Shopping sucks when you have ADHD. Amazon is overwhelming. Deal sites are chaos. Black Friday is a nightmare.

Scout fixes this:

1. **Tell it what you want** — "cozy sweater, earth tones, under $60"
2. **Walk away** — Scout's AI agents search the web in the background
3. **Come back to results** — 5 curated products with direct purchase links

No infinite scrolling. No decision paralysis. No accidental $200 Amazon cart.

## Tech Stack

| Layer     | Technology              |
| --------- | ----------------------- |
| Frontend  | SvelteKit               |
| Backend   | Cloudflare Workers      |
| Database  | Cloudflare D1 (SQLite)  |
| Queue     | Cloudflare Queues       |
| Cache     | Cloudflare KV           |
| AI        | Claude API (Anthropic)  |
| Search    | Brave Search API        |
| Payments  | Stripe                  |
| Email     | Resend                  |

## Development

### Prerequisites

- Node.js 20+
- Wrangler CLI (`npm install -g wrangler`)
- Cloudflare account with D1, KV, and Queues access

### Setup

```bash
# Install dependencies
npm install

# Set up Cloudflare resources (run these once)
npx wrangler d1 create scout-db
npx wrangler kv:namespace create SCOUT_CACHE
npx wrangler queues create scout-search-jobs

# Update wrangler.toml with the returned IDs

# Run initial database migration
npm run db:migrate

# Set secrets (for production)
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put BRAVE_API_KEY
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
# ... etc

# Start development server
npm run dev
```

### Scripts

- `npm run dev` - Start Vite dev server
- `npm run dev:wrangler` - Start with Cloudflare bindings
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run deploy` - Deploy to Cloudflare Pages
- `npm run check` - TypeScript type checking
- `npm run db:migrate` - Run database migrations

## Project Structure

```
scout/
├── src/
│   ├── lib/
│   │   ├── server/      # Server-only code (db, auth)
│   │   └── types.ts     # Shared types
│   ├── routes/
│   │   ├── api/         # API endpoints
│   │   ├── auth/        # Auth pages
│   │   ├── dashboard/   # User dashboard
│   │   ├── search/      # Search pages
│   │   └── s/[token]/   # Shareable results
│   ├── app.d.ts         # App types
│   └── hooks.server.ts  # Request hooks
├── docs/                # Project specs
├── migrations/          # D1 migrations
└── wrangler.toml        # Cloudflare config
```

## Documentation

- `docs/PROJECT_SPEC.md` - Full product specification
- `docs/DATA_MODEL.md` - Database schema
- `docs/AGENT_PROMPTS.md` - AI agent prompt engineering
- `docs/TODO.md` - Roadmap and milestones

## Internal Codename

The project is internally called **Research Goblin**. Feel free to use this in code comments, logs, and internal docs. Customer-facing name is **Scout**.

## License

Proprietary. This is Autumn's product idea.
