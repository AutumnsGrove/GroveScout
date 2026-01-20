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
    './node_modules/@autumnsgrove/groveengine/**/*.{html,js,svelte,ts}'
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

#### 1.3 Update CSS Imports

```css
/* src/app.css */
@import '@autumnsgrove/groveengine/ui/styles';  /* Grove base styles */
@import url('https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700&display=swap');

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
    items={data.curatedItems}
    showDots={true}
    showArrows={true}
    autoplay={false}
  >
    {#snippet item(product: Product, index: number)}
      <GlassCard class="w-[300px] overflow-hidden">
        <!-- Product Image -->
        <div class="aspect-square bg-surface-subtle relative">
          {#if product.imageUrl}
            <img
              src={product.imageUrl}
              alt={product.title}
              class="w-full h-full object-cover"
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
          <h3 class="font-medium line-clamp-2">{product.title}</h3>

          <div class="flex items-center justify-between">
            <span class="text-lg font-semibold text-grove-600">
              ${product.price}
            </span>
            <span class="text-sm text-muted">{product.retailer}</span>
          </div>

          <!-- Match reason -->
          <p class="text-sm text-muted italic">
            "{product.matchReason}"
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
            <button class="grove-btn grove-btn-ghost grove-btn-sm">
              <ThumbsUp class="w-4 h-4" />
            </button>
            <button class="grove-btn grove-btn-ghost grove-btn-sm">
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

#### 4.2 Season Store - Functional Search Context

**This is Scout's killer feature integration with seasons.**

The season isn't just visual theming - it determines *what kind of clothes Scout searches for*:

| Season | Search Context | Example Items |
|--------|----------------|---------------|
| **Winter** | Cozy, warm, layered | Cashmere sweaters, blankets, wool coats |
| **Spring** | Light layers, transitional | Light jackets, rain gear, pastels |
| **Summer** | Breathable, minimal | Shorts, swimwear, linen, sandals |
| **Autumn** | Warm tones, layering | Flannel, boots, scarves, earth tones |

```svelte
<!-- src/lib/server/agents/orchestrator.ts -->
<script>
  import { seasonStore } from '@autumnsgrove/groveengine/ui/stores';
  import { get } from 'svelte/store';

  // Inject season context into search queries
  function buildSearchContext(userQuery: string): string {
    const season = get(seasonStore);

    const seasonalContext = {
      winter: 'warm, cozy, layered, cashmere, wool, insulated',
      spring: 'light layers, transitional, rain-ready, fresh colors',
      summer: 'breathable, lightweight, shorts, swimwear, linen',
      autumn: 'layering pieces, warm tones, flannel, boots, scarves'
    };

    return `${userQuery} (seasonal preference: ${seasonalContext[season]})`;
  }
</script>
```

**Server-Side Season Detection:**

Since seasonStore is client-side, we need server-side season awareness:

```typescript
// src/lib/server/utils/season.ts
export function getCurrentSeason(): 'spring' | 'summer' | 'autumn' | 'winter' {
  const month = new Date().getMonth(); // 0-11
  if (month >= 2 && month <= 4) return 'spring';   // Mar-May
  if (month >= 5 && month <= 7) return 'summer';   // Jun-Aug
  if (month >= 8 && month <= 10) return 'autumn';  // Sep-Nov
  return 'winter';                                  // Dec-Feb
}

// Allow user override (stored in profile preferences)
export function getEffectiveSeason(userPreference?: string): Season {
  if (userPreference && ['spring', 'summer', 'autumn', 'winter'].includes(userPreference)) {
    return userPreference as Season;
  }
  return getCurrentSeason();
}
```

**UI: Season Selector in Search Form:**

```svelte
<!-- src/routes/search/new/+page.svelte -->
<script>
  import { seasonStore } from '@autumnsgrove/groveengine/ui/stores';
  import { Snowflake, Flower2, Sun, Leaf } from 'lucide-svelte';

  const seasons = [
    { value: 'winter', label: 'Winter', icon: Snowflake, hint: 'Cozy & warm' },
    { value: 'spring', label: 'Spring', icon: Flower2, hint: 'Fresh & light' },
    { value: 'summer', label: 'Summer', icon: Sun, hint: 'Cool & breezy' },
    { value: 'autumn', label: 'Autumn', icon: Leaf, hint: 'Layered & warm' },
  ];
</script>

<fieldset class="flex gap-2">
  <legend class="text-sm font-medium mb-2">Shopping for:</legend>
  {#each seasons as { value, label, icon: Icon, hint }}
    <button
      type="button"
      class="flex flex-col items-center p-3 rounded-grove border transition-all"
      class:border-grove-500={$seasonStore === value}
      class:bg-grove-50={$seasonStore === value}
      onclick={() => seasonStore.set(value)}
    >
      <Icon class="w-5 h-5" />
      <span class="text-sm font-medium">{label}</span>
      <span class="text-xs text-muted">{hint}</span>
    </button>
  {/each}
</fieldset>
```

---

### Phase 5: Component-by-Component Migration Checklist

#### Layout & Navigation
- [ ] Replace `+layout.svelte` header section with `<Header>`
- [ ] Replace `+layout.svelte` footer section with `<Footer>`
- [ ] Create `ScoutUserMenu.svelte` for authenticated user dropdown
- [ ] Create `ScoutLogo.svelte` with ShoppingBasket icon
- [ ] Configure `navItems` for Scout-specific navigation
- [ ] Configure footer link sections

#### Seasonal Search Integration (High Priority)
- [ ] Create `src/lib/server/utils/season.ts` for server-side season detection
- [ ] Add seasonal context injection to orchestrator agent
- [ ] Add season selector UI to search form
- [ ] Store user's season preference in profile
- [ ] Display current season context on results page

#### GlassCarousel Results (High Priority)
- [ ] Replace grid/list results with `GlassCarousel`
- [ ] Create product card snippet for carousel items
- [ ] Add rank badges to carousel items
- [ ] Implement swipe gestures for mobile
- [ ] Add feedback buttons (thumbs up/down) to carousel cards

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
| `src/routes/search/new/+page.svelte` | Add season selector UI |
| `src/lib/server/agents/orchestrator.ts` | Inject seasonal context |
| `src/lib/components/scout/ProductCard.svelte` | Use GlassCard |
| `src/lib/components/scout/SearchCard.svelte` | Use GlassCard |

### Files to Create

| File | Purpose |
|------|---------|
| `src/lib/components/chrome/ScoutUserMenu.svelte` | User dropdown menu |
| `src/lib/components/chrome/ScoutLogo.svelte` | ShoppingBasket branding |
| `src/lib/components/chrome/index.ts` | Chrome exports |
| `src/lib/server/utils/season.ts` | Server-side season detection |
| `src/lib/components/scout/SeasonSelector.svelte` | Season picker for search form |

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

---

## Rollback Plan

If issues arise post-deployment:

1. **Immediate**: Revert to previous commit
2. **Package**: Pin groveengine to working version
3. **Config**: Toggle feature flag to legacy mode
4. **Assets**: Old CSS is still in git history

---

## Success Criteria

1. **Visual Consistency**: Scout looks like part of the Grove family
2. **Code Reduction**: 50%+ reduction in custom chrome code
3. **Maintenance**: Single source of truth for shared components
4. **Performance**: No increase in bundle size or load time
5. **Accessibility**: Maintains or improves WCAG compliance

---

## Implementation Order

1. **Phase 1**: Update dependencies and Tailwind config
2. **Phase 2**: Migrate Footer (low risk, validates approach)
3. **Phase 3**: Migrate Header with ScoutLogo (ShoppingBasket icon)
4. **Phase 4a**: Implement GlassCarousel for curated results (high impact)
5. **Phase 4b**: Add seasonal search context integration
6. **Phase 5**: Migrate remaining cards to Glass variants
7. **Phase 6**: Clean up deprecated CSS
8. ~~**Phase 7**: Pricing page~~ (Deferred - awaiting graft)

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
