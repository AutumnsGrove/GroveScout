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
- Custom Scout logo (search icon in green box)
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
| `GlassCarousel` | Glass-styled carousel | Product galleries |

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

**ScoutLogo.svelte** - Scout-branded logo (if needed):

```svelte
<!-- src/lib/components/chrome/ScoutLogo.svelte -->
<script lang="ts">
  import { Logo } from '@autumnsgrove/groveengine/ui';
  import { Icons } from '$lib/components/scout';
</script>

<a href="/" class="flex items-center gap-2">
  <div class="w-8 h-8 bg-grove-500 rounded-grove flex items-center justify-center">
    <Icons name="search" size="sm" class="text-white" />
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

#### 3.3 Button Migration

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

#### 4.2 Season Store (Optional Enhancement)

Scout can optionally participate in Grove's seasonal theming:

```svelte
<script>
  import { seasonStore } from '@autumnsgrove/groveengine/ui/stores';

  // Use current season for accent colors or seasonal messaging
  const seasonalGreeting = $derived(
    $seasonStore === 'winter' ? 'Cozy up with winter deals!' :
    $seasonStore === 'spring' ? 'Fresh finds for spring!' :
    $seasonStore === 'summer' ? 'Hot summer savings!' :
    'Fall into great deals!'
  );
</script>
```

---

### Phase 5: Component-by-Component Migration Checklist

#### Layout & Navigation
- [ ] Replace `+layout.svelte` header section with `<Header>`
- [ ] Replace `+layout.svelte` footer section with `<Footer>`
- [ ] Create `ScoutUserMenu.svelte` for authenticated user dropdown
- [ ] Create `ScoutLogo.svelte` if custom branding needed
- [ ] Configure `navItems` for Scout-specific navigation
- [ ] Configure footer link sections

#### Cards & Containers
- [ ] Migrate `ProductCard.svelte` to use `GlassCard`
- [ ] Migrate `SearchCard.svelte` to use `GlassCard`
- [ ] Migrate `PlanCard.svelte` to use `GlassCard`
- [ ] Update dashboard cards to glass variants

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
| `src/lib/components/scout/ProductCard.svelte` | Use GlassCard |
| `src/lib/components/scout/SearchCard.svelte` | Use GlassCard |
| `src/lib/components/scout/PlanCard.svelte` | Use GlassCard |
| All page files | Update class names where needed |

### Files to Create

| File | Purpose |
|------|---------|
| `src/lib/components/chrome/ScoutUserMenu.svelte` | User dropdown menu |
| `src/lib/components/chrome/ScoutLogo.svelte` | Scout branding (optional) |
| `src/lib/components/chrome/index.ts` | Chrome exports |

### Files to Remove/Deprecate

| File | Reason |
|------|--------|
| `src/lib/components/ThemeToggle.svelte` | Use engine's ThemeToggle |
| Most of `src/app.css` component section | Use engine's grove.css |

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

1. **Phase 1**: Update dependencies and Tailwind config (1 commit)
2. **Phase 2**: Migrate Footer (low risk, validates approach)
3. **Phase 3**: Migrate Header (higher complexity)
4. **Phase 4**: Migrate cards to Glass variants
5. **Phase 5**: Clean up deprecated CSS

---

*Last Updated: 2026-01-20*
*Author: Claude (Opus 4.5)*
