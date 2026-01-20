# GroveScout Migration Plan: Adopting Lattice Chrome

> **Status**: Planning Phase
> **Target Engine Version**: @autumnsgrove/groveengine ^0.9.80
> **Current Engine Version**: @autumnsgrove/groveengine ^0.6.1

## Executive Summary

This document outlines a comprehensive plan to migrate GroveScout from its custom UI chrome to the shared Lattice framework provided by GroveEngine. The migration will:

1. Replace the custom header/footer with shared chrome components
2. Adopt the Glass design system for improved visual consistency
3. Leverage shared stores (theme, season) for Grove-wide coherence
4. Reduce maintenance burden by using centralized UI components

### Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Logo Icon** | `ShoppingBasket` (lucide) | Consistent with Workshop in GroveEngine |
| **Seasons** | Functional integration | Season determines *what* Scout searches for |
| **Results Display** | `GlassCarousel` | Beautiful presentation for 5 curated items |
| **Pricing Page** | Deferred | Will use future Pricing graft from engine |

---

## Current State Analysis

### GroveScout's Custom Chrome (`src/routes/+layout.svelte`)

The current layout contains ~270 lines of custom implementation:

| Component | Lines | Description |
|-----------|-------|-------------|
| Header | ~80 | Custom sticky header with logo, nav, user menu |
| Mobile Menu | ~60 | Slide-down mobile navigation drawer |
| Footer | ~45 | Simple brand + links footer |
| Theme Logic | ~25 | Manual localStorage theme handling |
| Total | ~270 | Entirely custom implementation |

**Key Features in Current Implementation:**
- Custom Scout logo (will use `ShoppingBasket` lucide icon)
- User authentication state display (avatar, email)
- Credit balance display in header
- Theme toggle (light/dark)
- Mobile-responsive hamburger menu
- User dropdown menu (profile, settings, logout)

### GroveEngine Chrome Components Available

| Component | File | Description |
|-----------|------|-------------|
| `Header` | `chrome/Header.svelte` | Shared header with Logo, nav, theme toggle, mobile menu |
| `HeaderMinimal` | `chrome/HeaderMinimal.svelte` | Simplified header variant |
| `Footer` | `chrome/Footer.svelte` | Full footer with resource/connect links, legal |
| `FooterMinimal` | `chrome/FooterMinimal.svelte` | Simplified footer variant |
| `MobileMenu` | `chrome/MobileMenu.svelte` | Sheet-based mobile navigation |
| `ThemeToggle` | `chrome/ThemeToggle.svelte` | Light/dark mode toggle |

**Chrome Configuration System:**
- `NavItem` / `FooterLink` types for configurable navigation
- `defaults.ts` with `DEFAULT_NAV_ITEMS`, `DEFAULT_RESOURCE_LINKS`, etc.
- Accepts custom nav items via props
- MaxWidth control: `narrow | default | wide`

### Glass Components Available

| Component | Description | Scout Use Case |
|-----------|-------------|----------------|
| `Glass` | Base glassmorphism wrapper | Cards, panels, overlays |
| `GlassCard` | Pre-styled glass card | Product cards, search cards |
| `GlassButton` | Translucent button | Action buttons, CTAs |
| `GlassNavbar` | Glass navigation bar | Alternative header style |
| `GlassOverlay` | Modal/sheet backdrop | User menu, mobile menu |
| `GlassConfirmDialog` | Confirmation modals | Delete confirmations |
| **`GlassCarousel`** | Glass-styled carousel | **Primary: 5 curated results display** |

---

## Migration Architecture

### Phase 0: Pre-Migration Audit

> **✅ Version Verified:** groveengine@0.9.80 existence confirmed by package maintainer (2026-01-20). APIs verified against source at `/Projects/GroveEngine/packages/engine/src/lib/ui/`.

Before beginning implementation, verify that all required exports and APIs are available in groveengine 0.9.80.

#### 0.1 Verify GroveEngine Exports

```bash
# Install target version locally for audit
npm install @autumnsgrove/groveengine@0.9.80 --save-dev --dry-run

# Or check published exports
npm view @autumnsgrove/groveengine@0.9.80 exports
```

#### 0.2 API Verification Checklist

| API | Import Path | Status |
|-----|-------------|--------|
| `Header` | `@autumnsgrove/groveengine/ui/chrome` | ✅ Verified |
| `Footer` | `@autumnsgrove/groveengine/ui/chrome` | ✅ Verified |
| `GlassCarousel` | `@autumnsgrove/groveengine/ui` | ✅ Verified |
| `GlassCard` | `@autumnsgrove/groveengine/ui` | ✅ Verified |
| `GlassOverlay` | `@autumnsgrove/groveengine/ui` | ✅ Verified |
| `themeStore` | `@autumnsgrove/groveengine/ui/stores` | ✅ Verified |
| `seasonStore` | `@autumnsgrove/groveengine/ui/stores` | ✅ Verified |
| `grovePreset` | `@autumnsgrove/groveengine/ui/tailwind` | ⬜ Verify at implementation |
| Grove styles | `@autumnsgrove/groveengine/ui/styles` | ⬜ Verify at implementation |

> **Verification method:** Confirmed against source files in `GroveEngine/packages/engine/src/lib/ui/`

#### 0.3 GlassCarousel API Check

Verify the carousel accepts these props (confirmed ✅):

```typescript
interface GlassCarouselProps {
  /** Array of images for image mode */
  images?: CarouselImage[];
  /** Number of items for custom content mode */
  itemCount?: number;
  showDots?: boolean;
  showArrows?: boolean;
  autoplay?: boolean;
  autoplayInterval?: number;
  variant?: "default" | "frosted" | "minimal";
  /** Custom content snippet - receives slide index */
  item?: Snippet<[number]>;
}
```

> **Note:** GlassCarousel uses `itemCount` (not `items`). The `item` snippet receives only the **index** - access your data array by index inside the snippet.

#### 0.4 CSS Overlap Audit

Before removing Scout CSS, verify which classes are fully covered by Grove:

```bash
# Extract Scout-specific class names
grep -r "scout-" src/ --include="*.svelte" --include="*.css" | sort -u

# Compare with grove.css coverage
```

#### 0.5 ⚠️ CRITICAL: Test Seasonal Query Injection

**This must be tested before implementation.** The planned query enrichment:
```typescript
`${query} (seasonal preference: warm, cozy, layered)`
```

**May not work correctly with your search backend.** Different search APIs handle appended text differently:
- Some treat parenthetical text as literal search terms
- Some have token limits that truncate extra keywords
- Some have structured filter APIs that work better

**Before proceeding:**
```bash
# Test manually with your search backend
curl "https://api.search.brave.com/res/v1/web/search?q=cozy+sweater+(seasonal+preference:+warm,+cozy)"
```

**If results are poor, use the backend's filter/facet API instead:**
```typescript
// Alternative: Use structured filters instead of query modification
const searchParams = {
  query: userQuery,
  filters: {
    category: getSeasonalCategories(season),
    tags: SEASONAL_CONTEXTS[season].keywords
  }
};
```

#### 0.6 Exit Criteria for Phase 0

**Must complete ALL before proceeding to Phase 1:**

- [ ] All import paths verified against actual package exports ✅
- [ ] GlassCarousel snippet API confirmed working ✅
- [ ] No breaking changes between 0.6.1 → 0.9.80 identified
- [ ] CSS class mapping document created (Scout → Grove)
- [ ] **Seasonal query injection tested with real search backend**
- [ ] Create spike branch with minimal chrome component integration
- [ ] Verify SSR compatibility (Cloudflare Workers environment)
- [ ] Test Glass components don't require browser-only APIs
- [ ] Confirm no `unsafe-inline` CSP required for Glass styles

---

### Phase 1: Foundation (Dependency & Config Updates)

#### 1.1 Update GroveEngine Dependency

```bash
# Current
"@autumnsgrove/groveengine": "^0.6.1"

# Target
"@autumnsgrove/groveengine": "^0.9.80"
```

#### 1.2 Update Tailwind Configuration

```javascript
// tailwind.config.js
import grovePreset from '@autumnsgrove/groveengine/ui/tailwind';

export default {
  presets: [grovePreset],  // Use engine's preset directly
  content: [
    './src/**/*.{html,js,svelte,ts}',
    // Only scan dist/ to avoid slow builds from scanning entire package
    './node_modules/@autumnsgrove/groveengine/dist/**/*.{html,js,svelte,ts}'
  ],
  // Scout-specific extensions remain
  theme: {
    extend: {
      colors: {
        scout: { /* existing teal palette */ }
      }
    }
  }
};
```

#### 1.3 Update Font Loading (HTML)

Move font loading from CSS `@import` to HTML `<link>` tags for better performance:

```html
<!-- src/app.html (in <head>) -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<!-- Only include weights actually used: 400 (body), 500 (medium), 600 (semibold), 700 (bold) -->
<link href="https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;600;700&display=swap" rel="stylesheet">
```

> **Why?**
> - CSS `@import` for fonts blocks rendering. HTML `<link>` with `preconnect` allows the browser to establish connections early, reducing load time.
> - `display=swap` prevents invisible text during font loading (FOUT over FOIT).
> - We removed weight 300 (light) since it's not used in the design system. Each weight adds ~15-20KB.

#### 1.4 Update CSS Imports

```css
/* src/app.css */
@import '@autumnsgrove/groveengine/ui/styles';  /* Grove base styles */

@tailwind base;
@tailwind components;
@tailwind utilities;

/* Scout-specific overrides and extensions */
@layer components {
  /* Keep Scout-specific component styles */
}
```

---

### Phase 2: Chrome Component Migration

#### 2.1 New Layout Structure

Replace the monolithic `+layout.svelte` with composed chrome components:

```svelte
<!-- src/routes/+layout.svelte (NEW) -->
<script lang="ts">
  import '../app.css';
  import { Header, Footer, seasonStore, themeStore } from '@autumnsgrove/groveengine/ui/chrome';
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';

  // Scout-specific components
  import { CreditBalance } from '$lib/components/scout';
  import ScoutUserMenu from '$lib/components/chrome/ScoutUserMenu.svelte';

  let { children, data } = $props();

  // Scout-specific nav items
  const scoutNavItems = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/search/new', label: 'New Search' },
    { href: '/pricing', label: 'Pricing' }
  ];

  const scoutFooterLinks = {
    resource: [
      { href: '/pricing', label: 'Pricing' },
      { href: 'https://grove.place/knowledge', label: 'Help', external: true }
    ],
    connect: [
      { href: 'https://grove.place', label: 'Grove', external: true },
      { href: 'https://grove.place/contact', label: 'Contact', external: true }
    ],
    legal: [
      { href: 'https://grove.place/knowledge/legal/privacy-policy', label: 'Privacy' },
      { href: 'https://grove.place/knowledge/legal/terms-of-service', label: 'Terms' }
    ]
  };
</script>

<div class="app min-h-screen flex flex-col bg-background">
  <Header
    navItems={scoutNavItems}
    brandTitle="Scout"
    maxWidth="wide"
  >
    {#snippet headerRight()}
      {#if data.user}
        <CreditBalance credits={data.credits || 0} variant="compact" size="sm" />
        <ScoutUserMenu user={data.user} />
      {:else}
        <a href="/auth/login" class="grove-btn grove-btn-primary grove-btn-sm">
          Get Started
        </a>
      {/if}
    {/snippet}
  </Header>

  <main class="flex-1">
    {@render children()}
  </main>

  <Footer
    resourceLinks={scoutFooterLinks.resource}
    connectLinks={scoutFooterLinks.connect}
    legalLinks={scoutFooterLinks.legal}
    maxWidth="wide"
  />
</div>
```

#### 2.2 Custom Scout Components to Create

**ScoutUserMenu.svelte** - User dropdown (Scout-specific auth UI):

```svelte
<!-- src/lib/components/chrome/ScoutUserMenu.svelte -->
<script lang="ts">
  import { GlassOverlay } from '@autumnsgrove/groveengine/ui';
  import { Icons } from '$lib/components/scout';

  interface Props {
    user: { email: string };
  }

  let { user }: Props = $props();
  let open = $state(false);
</script>

<div class="relative">
  <button onclick={() => open = !open} class="flex items-center gap-2 ...">
    <div class="w-9 h-9 bg-grove-500 text-white rounded-full ...">
      {user.email[0].toUpperCase()}
    </div>
  </button>

  {#if open}
    <GlassOverlay onclose={() => open = false}>
      <!-- User menu dropdown content -->
    </GlassOverlay>
  {/if}
</div>
```

**ScoutLogo.svelte** - Scout-branded logo using ShoppingBasket icon:

```svelte
<!-- src/lib/components/chrome/ScoutLogo.svelte -->
<script lang="ts">
  import { ShoppingBasket } from 'lucide-svelte';
</script>

<a href="/" class="flex items-center gap-2">
  <div class="w-8 h-8 bg-grove-500 rounded-grove flex items-center justify-center">
    <ShoppingBasket class="w-5 h-5 text-white" />
  </div>
  <span class="font-serif text-xl">Scout</span>
</a>
```

---

### Phase 3: Glass Design System Adoption

#### 3.1 ProductCard Migration

Replace custom `scout-product-card` with `GlassCard`:

```svelte
<!-- Before -->
<div class="scout-product-card">
  <div class="scout-product-image">...</div>
  <div class="scout-product-body">...</div>
</div>

<!-- After -->
<GlassCard variant="elevated" class="overflow-hidden">
  <div class="aspect-square bg-surface-subtle">...</div>
  <div class="p-4">...</div>
</GlassCard>
```

#### 3.2 SearchCard Migration

```svelte
<!-- Before -->
<div class="scout-card">...</div>

<!-- After -->
<GlassCard>
  <!-- Search card content -->
</GlassCard>
```

#### 3.3 GlassCarousel for Curated Results (Primary Feature)

The star of the show - Scout's 5 curated results displayed in a beautiful glass carousel:

```svelte
<!-- src/routes/search/[id]/+page.svelte -->
<script lang="ts">
  import { GlassCarousel, GlassCard } from '@autumnsgrove/groveengine/ui';
  import { ShoppingBag, ExternalLink, ThumbsUp, ThumbsDown } from 'lucide-svelte';
  import type { Product } from '$lib/types';

  interface Props {
    data: { curatedItems: Product[] };
  }

  let { data }: Props = $props();
</script>

<section class="py-8">
  <h2 class="font-serif text-2xl mb-6 text-center">
    Your Top 5 Picks
  </h2>

  <GlassCarousel
    itemCount={data.curatedItems.length}
    showDots={true}
    showArrows={true}
    autoplay={false}
  >
    {#snippet item(index)}
      {@const product = data.curatedItems[index]}
      <GlassCard class="w-full h-full overflow-hidden">
        <!-- Product Image -->
        <div class="aspect-square bg-surface-subtle relative">
          {#if product.image_url}
            <img
              src={product.image_url}
              alt={product.name}
              class="w-full h-full object-cover"
              loading="lazy"
            />
          {:else}
            <div class="w-full h-full flex items-center justify-center">
              <ShoppingBag class="w-12 h-12 text-muted" />
            </div>
          {/if}

          <!-- Rank badge -->
          <div class="absolute top-3 left-3 w-8 h-8 rounded-full bg-grove-500 text-white flex items-center justify-center font-bold">
            {index + 1}
          </div>
        </div>

        <!-- Product Info -->
        <div class="p-4 space-y-3">
          <h3 class="font-medium line-clamp-2">{product.name}</h3>

          <div class="flex items-center justify-between">
            <span class="text-lg font-semibold text-grove-600">
              ${product.price_current}
            </span>
            <span class="text-sm text-muted">{product.retailer}</span>
          </div>

          <!-- Match reason (AI-generated, auto-escaped by Svelte) -->
          <p class="text-sm text-muted italic">
            "{product.match_reason}"
          </p>

          <!-- Actions -->
          <div class="flex gap-2 pt-2">
            <a
              href={product.url}
              target="_blank"
              rel="noopener"
              class="grove-btn grove-btn-primary grove-btn-sm flex-1"
            >
              View <ExternalLink class="w-4 h-4 ml-1" />
            </a>
            <button class="grove-btn grove-btn-ghost grove-btn-sm" aria-label="Like this product">
              <ThumbsUp class="w-4 h-4" />
            </button>
            <button class="grove-btn grove-btn-ghost grove-btn-sm" aria-label="Dislike this product">
              <ThumbsDown class="w-4 h-4" />
            </button>
          </div>
        </div>
      </GlassCard>
    {/snippet}
  </GlassCarousel>
</section>
```

**Mobile Behavior:** On mobile, the carousel becomes swipeable with smooth momentum scrolling. The glass effect creates a beautiful layered appearance as cards overlap during scroll.

#### 3.4 Button Migration

| Scout Class | Grove Equivalent |
|-------------|------------------|
| `scout-btn-primary` | `GlassButton variant="primary"` or `grove-btn-primary` |
| `scout-btn-secondary` | `GlassButton variant="secondary"` or `grove-btn-secondary` |
| `scout-btn-ghost` | `GlassButton variant="ghost"` or `grove-btn-ghost` |
| `scout-btn-deal` | Keep custom (Scout-specific teal) |

#### 3.5 Type Definitions

Add type definitions for core domain types used throughout the migration:

```typescript
// src/lib/types/index.ts

/** Represents a curated product result from Scout search */
/**
 * Product type matching actual API response (snake_case from backend)
 * See: src/routes/search/[id]/+page.svelte for current usage
 */
export interface Product {
  id: string;
  name: string;              // Product name (not "title")
  price_current: number;     // Current price (snake_case from API)
  price_original?: number;   // Original price before discount
  retailer: string;
  url: string;
  image_url?: string;        // Snake_case from API
  match_score: number;       // AI match confidence (0-100)
  match_reason: string;      // AI explanation for recommendation
}

/**
 * Optional: Create a display-friendly version for components
 * This transforms API response to component props
 */
export function toDisplayProduct(p: Product, index: number) {
  return {
    ...p,
    rank: index + 1,
    imageUrl: p.image_url,
    matchReason: p.match_reason,
    price: p.price_current,
  };
}

/** Grove seasonal context for search personalization */
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

/** Seasonal context configuration for search queries */
export interface SeasonalContext {
  season: Season;
  keywords: string[];
  description: string;
}

export const SEASONAL_CONTEXTS: Record<Season, SeasonalContext> = {
  winter: {
    season: 'winter',
    keywords: ['warm', 'cozy', 'layered', 'cashmere', 'wool', 'insulated'],
    description: 'Cozy & warm'
  },
  spring: {
    season: 'spring',
    keywords: ['light layers', 'transitional', 'rain-ready', 'fresh colors'],
    description: 'Fresh & light'
  },
  summer: {
    season: 'summer',
    keywords: ['breathable', 'lightweight', 'shorts', 'swimwear', 'linen'],
    description: 'Cool & breezy'
  },
  autumn: {
    season: 'autumn',
    keywords: ['layering pieces', 'warm tones', 'flannel', 'boots', 'scarves'],
    description: 'Layered & warm'
  }
};
```

---

### Phase 4: Store Integration

#### 4.1 Theme Store Migration

Replace manual localStorage handling with GroveEngine's `themeStore`:

```svelte
<!-- Before (manual) -->
<script>
  let isDark = $state(false);

  function toggleTheme() {
    isDark = !isDark;
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', isDark);
  }

  onMount(() => {
    const saved = localStorage.getItem('theme');
    isDark = saved === 'dark';
  });
</script>

<!-- After (using store) -->
<script>
  import { themeStore } from '@autumnsgrove/groveengine/ui/stores';

  // Theme is automatically persisted and synced
  // ThemeToggle component handles everything
</script>
```

**Legacy localStorage Migration:**

Existing users may have theme preferences stored under Scout's old localStorage key. Add a one-time migration:

```typescript
// src/lib/utils/migrate-preferences.ts
import { browser } from '$app/environment';
import { themeStore } from '@autumnsgrove/groveengine/ui/stores';

const MIGRATION_KEY = 'scout_prefs_migrated_v1';
const LEGACY_THEME_KEY = 'theme'; // Old Scout localStorage key

export function migrateUserPreferences(): void {
  if (!browser) return;

  try {
    // Check if already migrated
    if (localStorage.getItem(MIGRATION_KEY)) return;

    // Migrate legacy theme preference
    const legacyTheme = localStorage.getItem(LEGACY_THEME_KEY);
    if (legacyTheme === 'dark' || legacyTheme === 'light') {
      try {
        themeStore.set(legacyTheme);
        localStorage.removeItem(LEGACY_THEME_KEY); // Clean up old key
      } catch (storeError) {
        // Store might be locked or have different format
        console.warn('[Scout] Failed to migrate theme to store:', storeError);
        // Don't block migration - theme will use default
      }
    }

    // Mark migration complete (even if theme migration failed)
    localStorage.setItem(MIGRATION_KEY, new Date().toISOString());
  } catch (error) {
    // localStorage unavailable (private browsing, quota exceeded, etc.)
    // Gracefully degrade - user will get default preferences
    console.warn('[Scout] Preference migration skipped:', error);
  }
}
```

Call this once in the root layout:

```svelte
<!-- src/routes/+layout.svelte -->
<script>
  import { migrateUserPreferences } from '$lib/utils/migrate-preferences';
  import { onMount } from 'svelte';

  onMount(() => {
    migrateUserPreferences();
  });
</script>
```

#### 4.2 Season Store - Functional Search Context

**This is Scout's killer feature integration with seasons.**

The season isn't just visual theming - it determines *what kind of clothes Scout searches for*:

| Season | Search Context | Example Items |
|--------|----------------|---------------|
| **Winter** | Cozy, warm, layered | Cashmere sweaters, blankets, wool coats |
| **Spring** | Light layers, transitional | Light jackets, rain gear, pastels |
| **Summer** | Breathable, minimal | Shorts, swimwear, linen, sandals |
| **Autumn** | Warm tones, layering | Flannel, boots, scarves, earth tones |

**Architecture: Client → Server Season Handoff**

```
┌─────────────────────────────────────────────────────────────────┐
│  CLIENT (Browser)                                               │
│  ┌─────────────────┐     ┌──────────────────────────────────┐  │
│  │  seasonStore    │────▶│  Search Form submits:            │  │
│  │  (Svelte store) │     │  { query: "cozy sweater",        │  │
│  └─────────────────┘     │    season: "winter" }            │  │
│                          └───────────────┬──────────────────┘  │
└──────────────────────────────────────────┼─────────────────────┘
                                           │ POST /api/search
                                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  SERVER (Cloudflare Workers)                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Orchestrator receives season as parameter               │  │
│  │  → Injects seasonal context into search                  │  │
│  │  → Backend handles the rest                              │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**Step 1: Client sends season with search request**

```svelte
<!-- src/routes/search/new/+page.svelte -->
<script lang="ts">
  import { seasonStore } from '@autumnsgrove/groveengine/ui/stores';
  import type { Season } from '$lib/types';

  let query = $state('');
  let loading = $state(false);

  async function handleSearch() {
    loading = true;

    const response = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        season: $seasonStore  // ← Season passed as parameter!
      })
    });

    const results = await response.json();
    // Navigate to results page...
  }
</script>
```

**Step 2: Server receives season as a parameter**

```typescript
// src/lib/server/agents/orchestrator.ts
import { SEASONAL_CONTEXTS, type Season } from '$lib/types';

interface SearchRequest {
  query: string;
  season: Season;  // ← Received from client
}

/**
 * Builds search context by injecting seasonal preferences.
 * Season is passed from the client - no store imports needed!
 */
export function buildSearchContext(request: SearchRequest): string {
  const { query, season } = request;
  const context = SEASONAL_CONTEXTS[season];

  return `${query} (seasonal preference: ${context.keywords.join(', ')})`;
}

// Example usage in the search handler
export async function handleSearch(request: SearchRequest) {
  const enrichedQuery = buildSearchContext(request);

  // Pass to backend - it handles everything from here
  return await searchBackend.search(enrichedQuery);
}
```

> ⚠️ **Testing Note:** The query enrichment approach (appending seasonal keywords) should be tested with your actual search backend before implementation. Some search APIs may:
> - Treat parenthetical text differently than main query
> - Have token limits that could truncate seasonal context
> - Perform better with structured filters vs. query modification
>
> **Recommended:** Test these queries manually first:
> - `"cozy sweater (seasonal preference: warm, cozy, layered)"`
> - `"summer dress (seasonal preference: breathable, lightweight)"`
>
> If results are poor, consider using the backend's filter/facet API instead of query modification.

**Step 3: API endpoint wires it together**

```typescript
// src/routes/api/search/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { handleSearch } from '$lib/server/agents/orchestrator';
import { z } from 'zod';

// Zod schema for type-safe runtime validation
const SearchRequestSchema = z.object({
  query: z.string()
    .min(1, 'Search query is required')
    .max(500, 'Search query too long'),
  season: z.enum(['spring', 'summer', 'autumn', 'winter'], {
    errorMap: () => ({ message: 'Invalid season' })
  })
});

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();

  // Validate with Zod - throws ZodError on invalid input
  const parseResult = SearchRequestSchema.safeParse(body);

  if (!parseResult.success) {
    // Return 400 with validation errors
    throw error(400, {
      message: 'Invalid request',
      errors: parseResult.error.flatten().fieldErrors
    });
  }

  const { query, season } = parseResult.data;
  const results = await handleSearch({ query, season });

  return json(results);
};
```

> **Why Zod?** It provides both TypeScript types AND runtime validation in one definition. If the schema passes, you get fully typed data. If it fails, you get detailed error messages. This aligns with project standards (see AGENT.md).

> **Why this works:** The client owns the UI state (season selector), and simply *tells* the server what season to use. The server doesn't need to know about Svelte stores - it just receives a string parameter. Clean separation of concerns!

**UI: Season Selector in Search Form:**

```svelte
<!-- src/routes/search/new/+page.svelte -->
<script lang="ts">
  import { seasonStore } from '@autumnsgrove/groveengine/ui/stores';
  import { Snowflake, Flower2, Sun, Leaf } from 'lucide-svelte';
  import type { Season } from '$lib/types';

  const seasons = [
    { value: 'winter' as Season, label: 'Winter', icon: Snowflake, hint: 'Cozy & warm' },
    { value: 'spring' as Season, label: 'Spring', icon: Flower2, hint: 'Fresh & light' },
    { value: 'summer' as Season, label: 'Summer', icon: Sun, hint: 'Cool & breezy' },
    { value: 'autumn' as Season, label: 'Autumn', icon: Leaf, hint: 'Layered & warm' },
  ];

  // Keyboard navigation for radiogroup pattern
  function handleKeydown(event: KeyboardEvent) {
    const currentIndex = seasons.findIndex(s => s.value === $seasonStore);
    let newIndex = currentIndex;

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        newIndex = (currentIndex + 1) % seasons.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        newIndex = (currentIndex - 1 + seasons.length) % seasons.length;
        break;
      case 'Home':
        event.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        newIndex = seasons.length - 1;
        break;
      default:
        return;
    }

    seasonStore.setSeason(seasons[newIndex].value);
    // Focus the newly selected button
    const buttons = document.querySelectorAll('[role="radio"]');
    (buttons[newIndex] as HTMLElement)?.focus();
  }
</script>

<fieldset
  class="flex gap-2"
  role="radiogroup"
  aria-labelledby="season-legend"
  onkeydown={handleKeydown}
>
  <legend id="season-legend" class="text-sm font-medium mb-2">Shopping for:</legend>
  {#each seasons as { value, label, icon: Icon, hint }, index}
    <button
      type="button"
      role="radio"
      aria-checked={$seasonStore === value}
      aria-label="{label} season: {hint}"
      tabindex={$seasonStore === value ? 0 : -1}
      class="flex flex-col items-center p-3 rounded-grove border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-grove-500"
      class:border-grove-500={$seasonStore === value}
      class:bg-grove-50={$seasonStore === value}
      onclick={() => seasonStore.setSeason(value)}
    >
      <Icon class="w-5 h-5" aria-hidden="true" />
      <span class="text-sm font-medium">{label}</span>
      <span class="text-xs text-muted">{hint}</span>
    </button>
  {/each}
</fieldset>
```

> **Accessibility Note:** This implements the [WAI-ARIA radio group pattern](https://www.w3.org/WAI/ARIA/apg/patterns/radio/). Arrow keys cycle through options, Home/End jump to first/last, and only the selected option is in the tab order (`tabindex={0/-1}`).

---

### Phase 5: Component-by-Component Migration Checklist

#### Layout & Navigation
- [ ] Replace `+layout.svelte` header section with `<Header>`
- [ ] Replace `+layout.svelte` footer section with `<Footer>`
- [ ] Create `ScoutUserMenu.svelte` for authenticated user dropdown
- [ ] Create `ScoutLogo.svelte` with ShoppingBasket icon
- [ ] Configure `navItems` for Scout-specific navigation
- [ ] Configure footer link sections

#### HTML & Configuration Updates
- [ ] Update `src/app.html` with font preconnect links
- [ ] Verify `manifest.json` theme_color matches new design
- [ ] Update meta theme-color tag if present
- [ ] Ensure CSP headers allow font origins (fonts.googleapis.com, fonts.gstatic.com)

#### Cleanup & Removal
- [ ] Remove legacy `src/lib/components/ThemeToggle.svelte`
- [ ] Update all imports that referenced removed components
- [ ] Remove unused Scout-specific CSS classes from `app.css`
- [ ] Clean up any orphaned component files

#### PWA & Service Worker
- [ ] Test ServiceWorker registration doesn't break with new layout
- [ ] Verify offline functionality still works
- [ ] Test app install flow (Add to Home Screen)
- [ ] Validate manifest.json icons are correct

#### Documentation Updates (Post-Migration)
- [ ] Update `README.md` with new GroveEngine dependency requirement
- [ ] Document seasonal search feature in user-facing docs
- [ ] Update component import examples in developer docs
- [ ] Add troubleshooting guide for common migration issues
- [ ] Update AGENT.md if any agent workflows changed
- [ ] Create migration notes for future reference

#### Seasonal Search Integration (High Priority)
- [ ] Add season selector UI to search form (uses `seasonStore` from GroveEngine)
- [ ] Pass season as parameter in search API request (`POST /api/search`)
- [ ] Update API endpoint to receive and validate season parameter
- [ ] Update orchestrator to accept season as parameter (not from store!)
- [ ] Inject seasonal context keywords into search query
- [ ] Display current season context on results page

#### GlassCarousel Results (High Priority)
- [ ] Replace grid/list results with `GlassCarousel`
- [ ] Create product card snippet for carousel items
- [ ] Add rank badges to carousel items
- [ ] Implement swipe gestures for mobile
- [ ] Add feedback buttons (thumbs up/down) to carousel cards

#### Accessibility Enhancements
- [ ] Add ARIA live region for search status updates (`aria-live="polite"`)
- [ ] Implement focus management in GlassCarousel (focus trap when open)
- [ ] Add skip navigation link ("Skip to main content")
- [ ] Ensure all images have descriptive alt text (not just product title)
- [ ] Test with screen readers (VoiceOver, NVDA)
- [ ] Verify color contrast meets WCAG AA (4.5:1 for text)
- [ ] Add `prefers-reduced-motion` support for carousel animations
- [ ] Ensure focus indicators are visible on all interactive elements

#### Cards & Containers
- [ ] Migrate `ProductCard.svelte` to use `GlassCard`
- [ ] Migrate `SearchCard.svelte` to use `GlassCard`
- [ ] Update dashboard cards to glass variants
- [ ] ~~Migrate `PlanCard.svelte`~~ (Deferred - pricing graft coming)

#### Forms & Inputs
- [ ] Update input styles to `grove-input` classes
- [ ] Update textarea styles to `grove-textarea`
- [ ] Update select elements
- [ ] Migrate search input styling

#### Buttons
- [ ] Replace `scout-btn-primary` with `grove-btn-primary` or `GlassButton`
- [ ] Replace `scout-btn-secondary` with equivalents
- [ ] Keep `scout-btn-deal` for teal Scout branding
- [ ] Update all button instances

#### State Indicators
- [ ] Migrate badges to `grove-badge-*` classes
- [ ] Update loading states to use `Spinner` from engine
- [ ] Update empty states styling
- [ ] Migrate skeleton loaders

#### Modals & Overlays
- [ ] Use `GlassOverlay` for backdrops
- [ ] Use `GlassConfirmDialog` for confirmations
- [ ] Update mobile menu to engine's `MobileMenu`

---

## File Change Summary

### Files to Modify

| File | Changes |
|------|---------|
| `package.json` | Update groveengine version |
| `tailwind.config.js` | Import engine preset, add content paths |
| `src/app.css` | Import engine styles, reduce custom CSS |
| `src/routes/+layout.svelte` | Major rewrite using chrome components |
| `src/routes/search/[id]/+page.svelte` | Use GlassCarousel for results |
| `src/routes/search/new/+page.svelte` | Add season selector UI, pass season to API |
| `src/routes/api/search/+server.ts` | Receive season parameter, validate, pass to orchestrator |
| `src/lib/server/agents/orchestrator.ts` | Accept season as parameter, inject into search context |
| `src/lib/components/scout/ProductCard.svelte` | Use GlassCard |
| `src/lib/components/scout/SearchCard.svelte` | Use GlassCard |

### Files to Create

| File | Purpose |
|------|---------|
| `src/lib/components/chrome/ScoutUserMenu.svelte` | User dropdown menu |
| `src/lib/components/chrome/ScoutLogo.svelte` | ShoppingBasket branding |
| `src/lib/components/chrome/index.ts` | Chrome exports |
| `src/lib/types/index.ts` | Product, Season, SeasonalContext types |
| `src/lib/components/scout/SeasonSelector.svelte` | Season picker for search form |
| `src/lib/utils/migrate-preferences.ts` | Legacy localStorage migration |

### Files to Remove/Deprecate

| File | Reason |
|------|--------|
| `src/lib/components/ThemeToggle.svelte` | Use engine's ThemeToggle |
| Most of `src/app.css` component section | Use engine's grove.css |

### Files Deferred (Pricing Graft)

| File | Reason |
|------|--------|
| `src/routes/pricing/+page.svelte` | Will use future Pricing graft from engine |
| `src/lib/components/scout/PlanCard.svelte` | Part of pricing - deferred |

---

## CSS Reduction Estimate

| Category | Before | After | Reduction |
|----------|--------|-------|-----------|
| Component styles | ~150 lines | ~30 lines | ~80% |
| Utility styles | ~30 lines | ~10 lines | ~67% |
| Layout chrome | ~270 lines | ~80 lines | ~70% |
| **Total app.css** | ~280 lines | ~100 lines | ~64% |

---

## Risk Assessment

### Low Risk
- Tailwind preset adoption (additive)
- Footer migration (no auth logic)
- Glass card adoption (cosmetic)
- Theme store adoption (improvement)

### Medium Risk
- Header migration (involves auth state)
- Mobile menu migration (UX change)
- CSS class renames (broad impact)

### Mitigations
1. **Feature flag**: Keep old layout temporarily with `USE_LEGACY_CHROME` env var
2. **Gradual rollout**: Migrate footer first, then header
3. **Visual testing**: Screenshot comparison before/after
4. **Staged deployment**: Deploy to staging, validate, then production

---

## Testing Strategy

### Visual Regression
- [ ] Screenshot all pages before migration
- [ ] Compare after each phase
- [ ] Verify mobile responsiveness

### Functional Testing
- [ ] Auth flow (login, logout)
- [ ] Navigation (all links work)
- [ ] Theme toggle persistence
- [ ] Mobile menu open/close
- [ ] User dropdown interactions
- [ ] Credit balance display

### Cross-Browser
- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari (backdrop-filter fallbacks)
- [ ] Mobile browsers

### Concrete Test Cases

#### Season Integration Tests
```typescript
// src/routes/api/search/+server.test.ts
describe('Search API', () => {
  it('accepts valid season parameter', async () => {
    const response = await POST({ query: 'cozy sweater', season: 'winter' });
    expect(response.status).toBe(200);
  });

  it('rejects invalid season parameter', async () => {
    const response = await POST({ query: 'test', season: 'invalid' });
    expect(response.status).toBe(400);
  });

  it('includes seasonal context in search', async () => {
    const result = await handleSearch({ query: 'jacket', season: 'winter' });
    // Verify seasonal keywords were injected
    expect(result.enrichedQuery).toContain('warm');
  });
});
```

#### Accessibility Tests
```typescript
// src/lib/components/scout/SeasonSelector.test.ts
describe('SeasonSelector', () => {
  it('supports keyboard navigation', async () => {
    render(SeasonSelector);
    const winter = screen.getByRole('radio', { name: /winter/i });
    winter.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: /spring/i })).toHaveFocus();
  });

  it('has correct ARIA attributes', () => {
    render(SeasonSelector);
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(4);
  });
});
```

#### localStorage Migration Tests
```typescript
// src/lib/utils/migrate-preferences.test.ts
describe('migrateUserPreferences', () => {
  it('migrates legacy theme preference', () => {
    localStorage.setItem('theme', 'dark');
    migrateUserPreferences();
    expect(localStorage.getItem('theme')).toBeNull(); // Cleaned up
  });

  it('handles localStorage errors gracefully', () => {
    // Mock localStorage.getItem to throw
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('QuotaExceeded');
    });
    expect(() => migrateUserPreferences()).not.toThrow();
  });

  it('handles themeStore.set errors gracefully', () => {
    // Mock themeStore.set to throw (store might be locked or have different format)
    vi.spyOn(themeStore, 'set').mockImplementation(() => {
      throw new Error('Store locked');
    });
    localStorage.setItem('theme', 'dark');
    expect(() => migrateUserPreferences()).not.toThrow();
    // Migration should still mark as complete
    expect(localStorage.getItem('scout_prefs_migrated_v1')).toBeTruthy();
  });

  it('only runs migration once', () => {
    localStorage.setItem('theme', 'dark');
    migrateUserPreferences();
    migrateUserPreferences(); // Second call
    expect(localStorage.getItem('scout_prefs_migrated_v1')).toBeTruthy();
  });
});
```

---

## Security Audit Checklist

### Content Security Policy (CSP)
- [ ] Allow font origins: `fonts.googleapis.com`, `fonts.gstatic.com`
- [ ] Verify `style-src` allows inline styles (for Glass components)
- [ ] Test CSP doesn't block GlassCarousel animations

### XSS Prevention
- [x] `product.match_reason` - Auto-escaped by Svelte ✅ (AI-generated from Claude API)
- [x] `product.name` and `product.retailer` - Auto-escaped by Svelte ✅
- [ ] Verify `match_reason` only comes from trusted Claude API responses
- [ ] Use `{@html}` sparingly and only with sanitized content (none currently)
- [x] All `target="_blank"` links have `rel="noopener"` ✅

> **Note:** Svelte automatically escapes all `{variable}` interpolations. XSS is only possible with `{@html}` which we don't use for user/external content.

### Input Validation
- [ ] Zod validates all API inputs (already implemented ✅)
- [ ] Query length limits prevent DoS (max 500 chars ✅)
- [ ] Season enum validation prevents injection

### External Content
- [ ] Product images loaded via `img` tags (not background-image with user URLs)
- [ ] External links (`product.url`) go through redirect warning or are trusted domains
- [ ] Avoid dynamic code evaluation with user data

---

## Rollback Plan

### Pre-Migration Safety
```bash
# Create checkpoint before starting migration
git tag pre-migration-checkpoint
npm run build && npm run test  # Verify baseline works
```

### If Issues Arise Post-Deployment

1. **Immediate**: Revert to previous commit
2. **Package**: Pin groveengine to working version
3. **Config**: Toggle feature flag to legacy mode
4. **Assets**: Old CSS is still in git history

### Rollback Procedure
```bash
# Full rollback to pre-migration state
git reset --hard pre-migration-checkpoint
npm install  # Restore old groveengine version
npm run build && npm run test  # Verify rollback works
npm run deploy  # Deploy rolled-back version
```

### Test Rollback Before You Need It
```bash
# After Phase 1, practice the rollback procedure:
git stash  # Save current work
git checkout pre-migration-checkpoint
npm install && npm run build && npm run test
# Verify app works at checkpoint
git checkout -  # Return to migration branch
git stash pop  # Restore work
```

### Partial Rollback (Single Feature)
If only one feature is problematic:
1. Use feature flags to disable specific components
2. Keep the rest of the migration in place
3. Fix the issue, then re-enable

---

## Success Criteria

1. **Visual Consistency**: Scout looks like part of the Grove family
2. **Code Reduction**: 50%+ reduction in custom chrome code
3. **Maintenance**: Single source of truth for shared components
4. **Performance**: No regression (see budgets below)
5. **Accessibility**: Maintains or improves WCAG compliance

### Performance Budgets

**Goal:** This migration should *reduce* bundle size by using shared components, not increase it.

Measure before and after migration:

| Metric | Budget | Rationale |
|--------|--------|-----------|
| **Bundle Size** | ≤ 0% increase (target -10%) | Shared components = less code. Any increase needs investigation. |
| **CSS Size** | -50% or better | Replacing ~280 lines custom CSS with shared styles |
| **Lighthouse Performance** | ≥ 90 | No regression allowed |
| **Lighthouse Accessibility** | ≥ 95 | Should improve with better ARIA |
| **First Contentful Paint** | ≤ 1.5s | Font preconnect should help |
| **Time to Interactive** | ≤ 3.0s | Glass animations must not block |
| **Cumulative Layout Shift** | ≤ 0.1 | Chrome layout must be stable |

**⚠️ If bundle size increases:**
1. Check tree-shaking is working (`npm run build -- --analyze`)
2. Verify you're not importing entire groveengine package
3. Review for duplicate dependencies
4. Consider lazy-loading Glass components

**Pre-migration baseline command:**
```bash
# Record baseline metrics before starting
npm run build
echo "Bundle size: $(du -sh .svelte-kit/cloudflare)"
echo "CSS size: $(wc -c < src/app.css)"
# Run Lighthouse audit and save report
```

**Post-migration validation:**
```bash
# Compare after Phase 6 (CSS cleanup)
npm run build
echo "Bundle size: $(du -sh .svelte-kit/cloudflare)"
# Run Lighthouse audit and compare
```

If any budget is exceeded, investigate tree-shaking, remove unused imports, or defer non-critical components.

---

## Implementation Order

1. **Phase 0**: Pre-migration audit (verify exports, APIs, CSS overlap)
2. **Phase 1**: Update dependencies and Tailwind config
3. **Phase 2**: Migrate Footer (low risk, validates approach)
4. **Phase 3**: Migrate Header with ScoutLogo (ShoppingBasket icon)
5. **Phase 4a**: Implement GlassCarousel for curated results (high impact)
6. **Phase 4b**: Add seasonal search context integration
7. **Phase 5**: Migrate remaining cards to Glass variants
8. **Phase 6**: Clean up deprecated CSS
9. ~~**Phase 7**: Pricing page~~ (Deferred - awaiting graft)

---

## Future Considerations

### Pricing Graft Integration

When the Pricing graft is available from GroveEngine:

```svelte
<!-- Future implementation -->
<script>
  import { PricingPage } from '@autumnsgrove/groveengine/grafts/pricing';
</script>

<PricingPage
  plans={scoutPlans}
  features={scoutFeatures}
  ctaText="Start Scouting"
/>
```

The graft will provide:
- Consistent pricing card layout across Grove products
- Feature comparison tables
- Billing period toggles
- Mobile-responsive design

---

*Last Updated: 2026-01-20*
*Author: Claude (Opus 4.5)*
