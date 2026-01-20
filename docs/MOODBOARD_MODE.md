# Scout Moodboard Mode: Planning Document

> **Status**: Planning Phase
> **Feature Type**: Major Addition
> **Target Release**: Post-Chrome Migration

## Executive Summary

Moodboard Mode is a discovery-first shopping experience that helps users find their style *before* they search. Instead of requiring users to know what they want, Scout lets them explore visually, react intuitively, and discover their preferences through interaction.

### The Vision

> "Shop with your eyes first. We'll find the pieces later."

For many people - especially those whose bodies are changing, who are exploring their identity, or who simply struggle to articulate what they want - traditional search-first shopping doesn't work. Moodboard Mode flips the paradigm:

1. **Browse** - Swipe through curated fashion images
2. **React** - Quick emotional responses (love, want, vibe, skip)
3. **Discover** - Scout identifies patterns in your choices
4. **Search** - Get targeted search terms that match YOUR style

### Why This Matters

| User | Challenge | How Moodboard Helps |
|------|-----------|---------------------|
| **Trans folks** | Can't visualize clothes on changing body | See themselves in Custom Model mode |
| **Style-uncertain** | "I don't know what I want" | Discover taste through reaction, not description |
| **Overwhelmed shoppers** | Too many options, decision paralysis | Curated flow narrows to *their* preferences |
| **Identity explorers** | Want to try styles outside comfort zone | Safe space to explore without commitment |

---

## Core Principle: Humans First

**Human models are always the default.** AI-generated try-ons are opt-in, premium, and treated with maximum privacy care.

| Mode | Description | Tier | AI Involvement |
|------|-------------|------|----------------|
| **Human Models** | Real photos from fashion shoots | Free | Analysis only (no generation) |
| **Custom Model** | User sees clothes on themselves | Premium | Image generation with ZDR |

---

## Mode 1: Human Models (Default)

### How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│  MOODBOARD MODE: Human Models                                    │
│                                                                  │
│  ┌─────────────────────────────────────────┐                    │
│  │                                         │                    │
│  │         [Fashion Photo]                 │                    │
│  │         Real model, real shoot          │                    │
│  │                                         │                    │
│  └─────────────────────────────────────────┘                    │
│                                                                  │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                       │
│  │ 💜  │ │ 🖤  │ │ ✨  │ │ 🔥  │ │ ➡️  │                       │
│  │Love │ │Want │ │Vibe │ │Bold │ │Skip │                       │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘                       │
│                                                                  │
│  Swipe or tap to react. ~20 images to build your profile.       │
└─────────────────────────────────────────────────────────────────┘
```

### Image Sources

Fashion images sourced from:
- Brand photography (H&M, ASOS, etc. - verify licensing)
- Stock photo services with commercial licenses
- Potentially: partnerships with brands for promotional images
- User-submitted outfit photos (with consent, future feature)

### Reaction Types

| Reaction | Meaning | Weight |
|----------|---------|--------|
| 💜 **Love** | "This is ME" | High positive |
| 🖤 **Want** | "I'd wear this" | Medium positive |
| ✨ **Vibe** | "Not my style but I appreciate it" | Low positive |
| 🔥 **Bold** | "Too bold for daily wear, but intriguing" | Context signal |
| ➡️ **Skip** | "Not for me" | Negative signal |

### Output: Style Profile

After ~20 reactions, Scout analyzes patterns and generates:

```typescript
interface StyleProfile {
  // Core aesthetic
  primaryStyle: string;      // e.g., "earthy minimalist"
  secondaryStyle: string;    // e.g., "structured silhouettes"

  // Specific preferences
  colors: string[];          // ["earth tones", "muted greens", "cream"]
  patterns: string[];        // ["solid", "subtle texture"]
  silhouettes: string[];     // ["oversized tops", "fitted bottoms"]
  accessories: string[];     // ["minimal jewelry", "structured bags"]

  // Mood/vibe
  keywords: string[];        // For search queries
  avoidKeywords: string[];   // Things they consistently skipped

  // Season alignment (ties into seasonal search!)
  suggestedSeason: Season;   // Which Scout season fits their vibe
}
```

### User-Facing Summary

```
┌─────────────────────────────────────────────────────────────────┐
│  ✨ Your Style Profile                                          │
│                                                                  │
│  "You're drawn to earthy minimalism with structured             │
│   silhouettes. You love layering pieces in warm, muted          │
│   tones. Bold accessories catch your eye, but you prefer        │
│   them as accents rather than statement pieces."                │
│                                                                  │
│  🔍 Search terms that match your vibe:                          │
│                                                                  │
│  • "oversized wool cardigan earth tones"                        │
│  • "structured linen pants cream"                               │
│  • "minimal gold jewelry layering"                              │
│  • "chelsea boots brown leather"                                │
│                                                                  │
│  🍂 Suggested season: Autumn                                    │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Ready to find these pieces?                              │  │
│  │                                                           │  │
│  │  [ Start Searching with Scout - $10/mo ]                 │  │
│  │                                                           │  │
│  │  Your first search is on us! Sign up for free.           │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Mode 2: Custom Model (Premium)

### The Promise

> "See yourself in the clothes before you buy."

Users upload a photo of themselves. Scout shows them what they'd look like wearing the items in Moodboard Mode. This is especially powerful for:

- **Trans people** who can't find models that look like them
- **Anyone** whose body doesn't match "standard" model bodies
- **Style explorers** who want to try something new safely

### Privacy Architecture: Zero Data Retention

**This is non-negotiable.** User photos are sacred.

```
┌─────────────────────────────────────────────────────────────────┐
│  CUSTOM MODEL: Data Flow                                         │
│                                                                  │
│  1. User uploads photo                                          │
│     ↓                                                           │
│  2. Photo sent to inference API (Together.ai ZDR / self-hosted) │
│     ↓                                                           │
│  3. Generated images returned to user                           │
│     ↓                                                           │
│  4. Original photo DELETED from memory                          │
│     ↓                                                           │
│  5. Generated images shown, then DELETED after session          │
│     ↓                                                           │
│  6. Only TEXT (style profile) is saved                          │
│                                                                  │
│  ⚠️  NOTHING persists except the style profile text.            │
│  ⚠️  No images are ever stored in our database.                 │
│  ⚠️  No images are ever used for training.                      │
└─────────────────────────────────────────────────────────────────┘
```

### What We Keep vs. What We Delete

| Data | Kept? | Notes |
|------|-------|-------|
| User's uploaded photo | ❌ NO | Deleted immediately after inference |
| Generated try-on images | ❌ NO | Deleted after session ends |
| Style profile (text) | ✅ YES | Only useful output |
| Reaction history | ✅ YES | Which images they liked (not the images themselves) |
| Search terms generated | ✅ YES | Text only |

### Consent Flow

```svelte
<!-- Before enabling Custom Model -->
<dialog open={showConsentDialog}>
  <h2>Enable Custom Model?</h2>

  <p>
    Custom Model lets you see yourself wearing the clothes in your moodboard.
  </p>

  <h3>How your photo is handled:</h3>
  <ul>
    <li>✅ Your photo is sent to our AI service for processing</li>
    <li>✅ Generated images are shown to you</li>
    <li>✅ Your photo is deleted immediately after processing</li>
    <li>✅ Generated images are deleted when you leave</li>
    <li>❌ We NEVER store your photo</li>
    <li>❌ We NEVER use your photo for AI training</li>
    <li>❌ We NEVER share your photo with anyone</li>
  </ul>

  <p class="text-sm text-muted">
    We use {provider} with Zero Data Retention.
    <a href="/privacy/moodboard">Read our full privacy policy →</a>
  </p>

  <div class="flex gap-4">
    <button onclick={decline}>No thanks, use human models</button>
    <button onclick={accept} class="primary">I understand, enable Custom Model</button>
  </div>
</dialog>
```

### Session End Confirmation

```svelte
<!-- When user leaves Moodboard Mode -->
<dialog open={showExitDialog}>
  <h2>Leaving Moodboard Mode</h2>

  <p>Your session data will be cleared:</p>

  <ul>
    <li>🗑️ Your uploaded photo: <strong>Deleting...</strong> ✓ Deleted</li>
    <li>🗑️ Generated try-on images: <strong>Deleting...</strong> ✓ Deleted</li>
    <li>📝 Your style profile: <strong>Saved</strong> (text only)</li>
  </ul>

  <p class="text-grove-600">
    ✨ No trace of your photos remains on our servers.
  </p>

  <button onclick={confirmExit}>Done</button>
</dialog>
```

---

## Cost Analysis

### Per-Image Pricing (2026)

| Provider | Model | Price/Image | ZDR Available |
|----------|-------|-------------|---------------|
| **Together.ai** | FLUX Kontext [pro] | $0.04 | ✅ Yes |
| **Replicate** | FLUX Kontext [pro] | $0.04 | ⚠️ 1hr auto-delete |
| **FAL.ai** | FLUX Kontext [pro] | $0.04 | ✅ Enterprise |
| **FAL.ai** | FLUX.2 [dev] Turbo | $0.008 | ✅ Enterprise |

### Scout Economics

```
Average moodboard session: ~20 try-on images
Cost per session: 20 × $0.04 = $0.80

Scout Pro subscription: $10/month
Average user: 2 sessions/month = $1.60 cost

Margin per user: $10 - $1.60 = $8.40 (84% profit!)
```

### Scale Projections

| Subscribers | Try-ons/mo | Inference Cost | Revenue | Profit | Margin |
|-------------|------------|----------------|---------|--------|--------|
| 10 | 400 | $16 | $100 | $84 | 84% |
| 50 | 2,000 | $80 | $500 | $420 | 84% |
| 100 | 4,000 | $160 | $1,000 | $840 | 84% |
| 500 | 20,000 | $800 | $5,000 | $4,200 | 84% |
| 1,000 | 40,000 | $1,600 | $10,000 | $8,400 | 84% |

### When to Switch Infrastructure

| Scale | Best Option | Monthly Cost | Notes |
|-------|-------------|--------------|-------|
| 0-50k images | Serverless (Together.ai) | Pay per use | Like Cloudflare - scales automatically |
| 50k-200k images | Dedicated GPU (RunPod) | ~$285-400 | RTX 4090 or A6000 |
| 200k+ images | Multiple GPUs | ~$600-2,000 | Mix of dedicated + serverless overflow |
| 500k+ images | Own cluster | Variable | Years away, serious scale |

**Breakeven for dedicated GPU:**
- RTX 4090 ($285/mo) breaks even at ~7,125 images/month
- That's ~180 very active Pro users
- Until then, serverless is optimal!

---

## Infrastructure Progression

### Phase 1: Together.ai with ZDR (Launch)

**When:** MVP / Initial launch
**Cost:** ~$0.02-0.05 per inference
**Subscribers needed:** 0 (we eat the cost for free tier, charge for premium)

```typescript
// Cloudflare Worker calls Together.ai API
const response = await fetch('https://api.together.xyz/inference', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${env.TOGETHER_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'flux-kontext-pro',  // Or similar image editing model
    input: {
      image: userPhotoBase64,   // Sent, processed, then deleted by Together
      prompt: clothingDescription
    }
  })
});

// Together.ai ZDR policy:
// - Content NOT stored after processing
// - NOT used for training
// - Deleted once processing concludes
```

**Pros:**
- Fast to implement
- No infrastructure management
- ZDR is opt-in in Together settings

**Cons:**
- Still sending photos to external API (even with ZDR)
- Dependent on Together's policy enforcement

---

### Phase 2: Self-Hosted on RunPod (Scale)

**When:** ~12+ paying subscribers (~$120/mo revenue)
**Cost:** ~$50-100/mo for dedicated GPU
**Why:** Maximum privacy, "your photo never leaves Grove"

```
┌─────────────────────────────────────────────────────────────────┐
│  SELF-HOSTED ARCHITECTURE                                        │
│                                                                  │
│  Cloudflare Worker                                              │
│       │                                                         │
│       │ HTTPS (encrypted)                                       │
│       ▼                                                         │
│  RunPod GPU Instance (YOUR infrastructure)                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  FLUX Kontext / Stable Diffusion                         │   │
│  │  - Processes image                                       │   │
│  │  - Returns result                                        │   │
│  │  - Clears GPU memory                                     │   │
│  │  - NO LOGGING of images                                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│       │                                                         │
│       │ Result returned                                         │
│       ▼                                                         │
│  Cloudflare Worker                                              │
│  - Sends to user                                                │
│  - Deletes from memory                                          │
│  - Only style profile text persists                             │
└─────────────────────────────────────────────────────────────────┘
```

**RunPod Setup:**
- SOC2 compliant infrastructure
- Serverless GPU option (pay per inference) or dedicated pod
- ComfyUI for workflow management
- Custom endpoint that enforces no-logging

**Alternative: Chutes.ai**
- "Upload your own chute" - deploy your model as an API
- Similar to RunPod but more managed
- Worth evaluating when we reach this phase

---

### Phase 3: Dedicated Infrastructure (Grove Scale)

**When:** Grove is thriving, Scout has hundreds of subscribers
**Cost:** Worth it
**Why:** Full control, audit capability, compliance certifications

At this scale, consider:
- Dedicated GPU server (Hetzner, OVH, or similar)
- Air-gapped processing option for maximum security
- Third-party security audit of the pipeline
- SOC2 certification for Scout itself

---

## Business Model Integration

### Free Tier: The Hook

| Feature | Free | Scout Pro ($10/mo) |
|---------|------|-------------------|
| Human Models moodboard | ✅ Unlimited | ✅ Unlimited |
| Style profile generation | ✅ Full | ✅ Full |
| Search terms | ✅ Yes | ✅ Yes |
| **Custom Model (try-on)** | ❌ No | ✅ Yes |
| **Actually search for items** | ❌ No | ✅ Yes |
| **Seasonal search context** | ❌ No | ✅ Yes |
| **Midnight mode** | ❌ No | ✅ Yes |

**The funnel:**
1. Free user discovers Moodboard Mode
2. Swipes through, gets excited about their style profile
3. "Here are search terms that match your vibe!"
4. "Want to actually find these pieces? Subscribe to Scout!"

**Cost to serve free users:**
- Human Models mode: Basically free (serving static images)
- Style analysis: Cheap (DeepSeek v3.2 or similar, ~$0.001/profile)
- No image generation for free tier = sustainable

### Premium Tier: Custom Model

**Cost per Custom Model session:**
- Together.ai inference: ~$0.02-0.05 per image
- Average session: ~20 try-ons = ~$0.40-1.00
- Subscriber pays $10/mo, can do multiple sessions
- Margin is healthy once we have volume

---

## UI/UX Flow

### Entry Points

```
┌─────────────────────────────────────────────────────────────────┐
│  SCOUT HOME                                                      │
│                                                                  │
│  ┌─────────────────────┐  ┌─────────────────────┐               │
│  │                     │  │                     │               │
│  │  🔍 Search          │  │  🎨 Moodboard       │               │
│  │                     │  │                     │               │
│  │  Know what you      │  │  Discover your      │               │
│  │  want? Search for   │  │  style first.       │               │
│  │  it directly.       │  │  Browse, react,     │               │
│  │                     │  │  find your vibe.    │               │
│  └─────────────────────┘  └─────────────────────┘               │
│                                                                  │
│  "Not sure what you want? Start with Moodboard Mode →"          │
└─────────────────────────────────────────────────────────────────┘
```

### Moodboard Flow

```
1. Choose mode:
   [ Human Models (Free) ]  [ Custom Model (Pro) ]

2. If Custom Model → consent flow → upload photo

3. Start swiping:
   - 20-30 images
   - Quick reactions
   - Can undo last swipe
   - Progress indicator

4. Analysis:
   "Analyzing your style..."
   (2-3 seconds, DeepSeek processes reactions)

5. Results:
   - Style profile text
   - Suggested search terms
   - Recommended season
   - CTA to subscribe/search

6. Exit:
   - Confirmation of data deletion (Custom Model)
   - Option to save style profile to account
```

### Accessibility

- **Keyboard navigation:** Arrow keys to react, Enter to select
- **Screen reader:** Describe each image, announce reactions
- **Reduced motion:** Disable swipe animations if preferred
- **High contrast:** Ensure reaction buttons are visible
- **Alternative text:** Every fashion image needs good alt text

---

## Technical Implementation Notes

### Image Analysis (Style Profiling)

```typescript
// Use a cheap, fast model for style analysis
const analyzeReactions = async (reactions: Reaction[]): Promise<StyleProfile> => {
  const prompt = `
    Analyze these fashion image reactions and generate a style profile.

    Loved: ${reactions.filter(r => r.type === 'love').map(r => r.imageDescription)}
    Wanted: ${reactions.filter(r => r.type === 'want').map(r => r.imageDescription)}
    Vibed: ${reactions.filter(r => r.type === 'vibe').map(r => r.imageDescription)}
    Skipped: ${reactions.filter(r => r.type === 'skip').map(r => r.imageDescription)}

    Generate a style profile with:
    - Primary and secondary style descriptors
    - Color preferences
    - Silhouette preferences
    - 5-10 specific search terms they'd love
    - Which Scout season (winter/spring/summer/autumn/midnight) fits best
  `;

  // DeepSeek v3.2 or similar cheap model
  const response = await deepseek.chat({
    model: 'deepseek-chat',
    messages: [{ role: 'user', content: prompt }]
  });

  return parseStyleProfile(response);
};
```

### Image Deletion (Critical Path)

```typescript
// MUST be bulletproof - never persist user photos

class MoodboardSession {
  private userPhoto: Buffer | null = null;
  private generatedImages: Buffer[] = [];

  async uploadPhoto(photo: Buffer): Promise<void> {
    // Store in memory only, never to disk/database
    this.userPhoto = photo;
  }

  async generateTryOn(clothingDescription: string): Promise<Buffer> {
    if (!this.userPhoto) throw new Error('No photo uploaded');

    const result = await inferenceAPI.generate({
      image: this.userPhoto,
      prompt: clothingDescription
    });

    this.generatedImages.push(result);
    return result;
  }

  async endSession(): Promise<void> {
    // CRITICAL: Clear all image data
    this.userPhoto = null;
    this.generatedImages = [];

    // Force garbage collection hint (V8)
    if (global.gc) global.gc();

    console.log('[Moodboard] Session ended, all images cleared');
  }
}

// Ensure cleanup on all exit paths
process.on('SIGTERM', async () => {
  await activeSessions.forEach(s => s.endSession());
});
```

---

## Success Metrics

| Metric | Target | Why It Matters |
|--------|--------|----------------|
| **Moodboard completion rate** | >60% | Are people engaged enough to finish? |
| **Free → Paid conversion** | >5% | Does moodboard drive subscriptions? |
| **Custom Model opt-in rate** | >20% of Pro users | Is the try-on feature compelling? |
| **Style profile accuracy** | User satisfaction >4/5 | Do people feel "seen" by their profile? |
| **Session data deletion** | 100% verified | Non-negotiable privacy metric |

---

## Privacy Policy Language (Draft)

```markdown
## Moodboard Mode Privacy

### Human Models Mode
- We show you curated fashion images from licensed sources
- Your reactions (love, want, skip) are recorded to generate your style profile
- We never store the images themselves - only your reaction to them
- Your style profile is saved to your account (text only)

### Custom Model Mode (Premium)
- You may upload a photo of yourself to see how clothes would look on you
- Your photo is processed by our AI service to generate try-on images
- **Your original photo is deleted immediately after processing**
- **Generated images are deleted when you end your session**
- **We NEVER store your photos in our database**
- **We NEVER use your photos to train AI models**
- **We NEVER share your photos with third parties**

### What We Keep
- Your style profile (text description of your preferences)
- Your reaction history (which image IDs you liked/skipped)
- Search terms generated for you

### What We Never Keep
- Your uploaded photos
- Generated try-on images
- Any visual data from Custom Model sessions

### Third-Party Services
We use [Together.ai / self-hosted infrastructure] for image processing.
[Together.ai maintains Zero Data Retention policies / Our self-hosted
infrastructure never logs or stores processed images.]
```

---

## Open Questions

1. **Image sourcing:** Where do we get licensed fashion photos for Human Models mode?
   - Stock services (Unsplash, Pexels - check commercial use)
   - Brand partnerships
   - User-submitted (with consent)

2. **Try-on quality:** How good are current image editing models at realistic try-ons?
   - Need to evaluate FLUX Kontext, Stable Diffusion inpainting, etc.
   - May need to limit to certain clothing types initially

3. **Abuse prevention:** How do we prevent misuse of Custom Model?
   - CSAM scanning is mandatory (all providers do this)
   - Rate limiting
   - Content moderation on generated outputs

4. **International privacy:** GDPR, CCPA compliance for the deletion claims?
   - Need legal review of "immediate deletion" claims
   - Documentation of deletion process for audits

---

## Implementation Phases

### Phase 1: Human Models MVP
- [ ] Image curation pipeline
- [ ] Reaction UI (swipe/tap)
- [ ] Style analysis with DeepSeek
- [ ] Style profile generation
- [ ] Search term output
- [ ] Free tier integration

### Phase 2: Custom Model (Together.ai)
- [ ] Photo upload flow
- [ ] Consent dialog
- [ ] Together.ai integration with ZDR
- [ ] Try-on generation
- [ ] Session cleanup verification
- [ ] Premium tier integration

### Phase 3: Self-Hosted Migration
- [ ] RunPod/Chutes evaluation
- [ ] FLUX Kontext deployment
- [ ] Custom endpoint with no-logging
- [ ] Migration from Together.ai
- [ ] Privacy audit

---

*Last Updated: 2026-01-20*
*Author: Claude (Opus 4.5) + Autumn*
