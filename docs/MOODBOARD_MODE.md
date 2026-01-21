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

## Quick Start: Developer Dogfood Mode

> **Purpose**: Skip the content pipeline, test the core experience NOW
> **Who**: Developers willing to use their own photos
> **Status**: Proof of Concept

### Why This Exists

The full Moodboard Mode requires either:
- Licensing deals with photographers/brands (expensive, slow)
- Model Farm photo shoots (good long-term, but $5k+ upfront)

**Dogfood Mode lets us validate the experience before investing.**

### The Shortcut

Instead of browsing a catalog of human models, YOU become the model:

```
┌─────────────────────────────────────────────────────────────────┐
│  DOGFOOD MODE: Be Your Own Wanderer                              │
│                                                                  │
│  1. Upload a photo of yourself (full body, neutral pose)        │
│     ↓                                                           │
│  2. Claude generates outfit descriptions                         │
│     ↓                                                           │
│  3. FLUX Kontext dresses you in each outfit                     │
│     ↓                                                           │
│  4. You react (Love/Want/Vibe/Bold/Skip)                        │
│     ↓                                                           │
│  5. After ~20 reactions → Style profile generated               │
│     ↓                                                           │
│  6. Real Scout searches with YOUR style!                        │
└─────────────────────────────────────────────────────────────────┘
```

### What We're Testing

| Question | How Dogfood Answers It |
|----------|------------------------|
| Does FLUX Kontext produce good try-ons? | You'll see immediately |
| Is the swipe UX actually fun? | You'll feel it |
| Does style analysis work? | Check if search terms match your vibe |
| Is "see yourself in clothes" magical? | The whole point! |

### What We're NOT Testing

- Human Models catalog browsing (no catalog yet)
- Free → Premium upgrade funnel (you skip straight to "premium")
- Diverse body representation (just you for now)

### Technical Flow

```typescript
// Dogfood-specific entry point
interface DogfoodSession {
  userId: string;                    // Must be admin/developer
  basePhoto: string;                 // User's uploaded photo (temp)
  outfitQueue: OutfitDescription[];  // Claude-generated outfits
  reactions: Reaction[];             // Same as regular moodboard

  // Feature flags
  isDogfood: true;
  skipCatalog: true;
  generateOutfitsOnFly: true;
}

// Outfit generation (no catalog needed)
const generateOutfitIdeas = async (
  previousReactions: Reaction[],
  count: number = 5
): Promise<OutfitDescription[]> => {
  // Claude analyzes reactions and generates outfit descriptions
  // that explore the style space intelligently

  const prompt = `
    Based on these reactions to previous outfits:
    ${formatReactions(previousReactions)}

    Generate ${count} new outfit descriptions that:
    - Build on what they loved
    - Explore adjacent styles they might like
    - Include one "stretch" option outside their comfort zone

    Format each as: top, bottom, shoes, accessories, vibe keywords
  `;

  return await claude.generate(prompt);
};

// Then FLUX dresses user in each outfit
const generateTryOn = async (
  userPhoto: string,
  outfit: OutfitDescription
): Promise<string> => {
  return await flux.kontext({
    image: userPhoto,
    prompt: buildOutfitPrompt(outfit),
    preserve_face: true,
    preserve_body_shape: true
  });
};
```

### UI Entry Point

Hidden route for developers only:

```
/moodboard/dogfood
```

Gated by:
- `user.role === 'admin'` OR
- `user.email` in allowed dogfood list OR
- Feature flag `ENABLE_DOGFOOD_MODE`

### Privacy (Even for Dogfood)

Same ZDR principles apply:
- Photo deleted after session
- Generated images not stored permanently
- Only style profile text persists

**You're the developer, but treat your own data with respect.**

### Success Criteria

Dogfood is successful if:
1. You actually enjoy using it
2. Style profile feels accurate to your taste
3. Generated search terms find clothes you'd actually buy
4. You want to show it to friends

If all four → green light the Model Farm investment.

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

### Image Sources: The Model Farm Approach

**CRITICAL BLOCKER RESOLVED:** Brand photos are NOT licensed for commercial use.

Instead of fighting licensing battles, we generate our own fashion catalog:

#### The Model Farm

```
┌─────────────────────────────────────────────────────────────────┐
│  THE MODEL FARM: Ethical Fashion Image Generation                │
│                                                                  │
│  Step 1: Contract ~12 diverse real models (one-time)            │
│          ↓                                                       │
│  Step 2: Professional photo shoot (base poses, lighting)         │
│          ↓                                                       │
│  Step 3: Store base model images with full consent               │
│          ↓                                                       │
│  Step 4: Use FLUX Kontext to dress them in any outfit           │
│          ↓                                                       │
│  Step 5: Unlimited licensed fashion images! ✨                   │
│                                                                  │
│  Cost: One-time model fees + ongoing inference                   │
│  Result: No licensing issues, diverse representation             │
└─────────────────────────────────────────────────────────────────┘
```

#### Model Diversity Requirements

Our model farm must represent our users:

| Category | Target Representation |
|----------|----------------------|
| **Body types** | 3-4 different sizes/shapes per gender presentation |
| **Skin tones** | Full Monk Skin Tone scale representation |
| **Age ranges** | 20s, 30s, 40s+ |
| **Gender presentation** | Masc, femme, androgynous |
| **Height** | Short, average, tall |

**Minimum farm size:** 12 models (can expand later)

```typescript
interface ModelFarmModel {
  id: string;
  name: string;                    // "Model A", "Model B" (privacy)
  consentDocumentId: string;       // Legal consent on file

  // Physical characteristics (for matching to users)
  bodyType: 'slim' | 'average' | 'curvy' | 'plus';
  skinTone: number;                // 1-10 Monk scale
  height: 'petite' | 'average' | 'tall';
  genderPresentation: 'masc' | 'femme' | 'andro';
  ageRange: '20s' | '30s' | '40s' | '50s+';

  // Base images
  baseImages: {
    standing: string;              // Full body, neutral pose
    sitting: string;               // Seated pose
    walking: string;               // Movement pose
  };

  // Usage tracking
  timesUsed: number;
  lastUsed: Date;
}
```

#### Content Generation Pipeline

```typescript
interface FashionImage {
  id: string;
  modelId: string;                 // Which farm model
  baseImage: 'standing' | 'sitting' | 'walking';

  // Clothing description (for Kontext prompt)
  outfit: {
    top: string;                   // "cream cable-knit oversized sweater"
    bottom: string;                // "high-waisted brown corduroy pants"
    shoes: string;                 // "brown leather chelsea boots"
    accessories: string[];         // ["minimal gold necklace", "leather watch"]
  };

  // Style metadata
  season: Season;
  vibes: string[];                 // ["cozy", "earthy", "minimal"]
  colors: string[];                // ["cream", "brown", "gold"]
  silhouette: string;              // "oversized-top-fitted-bottom"

  // For accessibility
  altText: string;
  detailedDescription: string;     // For screen readers
}

const generateFashionImage = async (
  model: ModelFarmModel,
  outfit: OutfitDescription
): Promise<Buffer> => {
  const prompt = buildKontextPrompt(model, outfit);

  const result = await togetherAI.image({
    model: 'flux-kontext-pro',
    input: {
      image: model.baseImages.standing,
      prompt: prompt,
      // Preserve face/body, only change clothes
      preserve_face: true,
      preserve_body_shape: true
    }
  });

  return result.image;
};

const buildKontextPrompt = (model: ModelFarmModel, outfit: OutfitDescription): string => {
  return `
    Dress this model in:
    Top: ${outfit.top}
    Bottom: ${outfit.bottom}
    Shoes: ${outfit.shoes}
    Accessories: ${outfit.accessories.join(', ')}

    Style: ${outfit.vibes.join(', ')} aesthetic
    Lighting: Professional fashion photography, soft natural light
    Keep the model's face, body, and pose exactly the same.
    Only change the clothing and accessories.
  `;
};
```

#### Pre-Generation vs On-Demand

**Phase 1: Pre-generated catalog**
- Generate ~500-1000 images upfront
- Cover common styles/seasons
- Fast loading, cached in R2/Amber
- Low cost (batch generation)

**Phase 2: On-demand generation**
- If user's reactions indicate niche style not in catalog
- Generate new images in real-time
- Add to catalog for future users
- Higher cost but better coverage

```typescript
const getNextMoodboardImage = async (
  user: User,
  reactions: Reaction[]
): Promise<FashionImage> => {
  // First, try to find matching pre-generated image
  const catalogMatch = await findCatalogImage(reactions);

  if (catalogMatch && catalogMatch.score > 0.7) {
    return catalogMatch.image;
  }

  // No good match - generate on-demand
  const inferredStyle = analyzeReactionsForStyle(reactions);
  const bestModel = selectModelForUser(user.preferences);

  return await generateFashionImage(bestModel, {
    ...inferredStyle,
    vibes: inferredStyle.emergingVibes
  });
};
```

#### Cost Analysis: Model Farm vs Licensing

| Approach | Initial Cost | Ongoing Cost | Legal Risk | Diversity |
|----------|-------------|--------------|------------|-----------|
| **Brand photos** | $0 | Licensing fees or lawsuits | HIGH | Limited to their models |
| **Stock photos** | $0 | $0.10-1.00/image | Medium | Generic, limited |
| **Model Farm** | ~$5,000 (shoot + fees) | ~$0.02-0.04/image (inference) | NONE | Full control |

**Break-even analysis:**
- Stock at $0.50/image × 10,000 images = $5,000
- Model Farm at $0.04/image × 10,000 images = $400 + $5,000 setup = $5,400
- After 12,500 images, Model Farm is cheaper AND we own everything

#### Ethical Considerations

**Model consent requirements:**
- Full commercial usage rights in perpetuity
- Right to use likeness for AI-generated fashion images
- Clear explanation of how images will be used
- Fair compensation (above industry standard)
- Option to revoke consent (we stop using their images)
- Credit offered but optional (some prefer anonymity)

**We will NOT:**
- Use models' likenesses without explicit consent
- Generate inappropriate or explicit content with their images
- Share base images with third parties
- Use models under 18

**Documentation:**
- All consent forms signed and stored securely
- Legal review of consent language
- Model release agreement template in `/docs/legal/`

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

## Content Moderation: Petal

> *Petals protect what's precious. They close when danger comes.*

### Overview

Petal is Scout's image moderation system, extending the Thorn pattern to handle visual content. Named for how petals shield the flower's center - protective without being aggressive.

**Key Principle:** We MUST verify user-uploaded images before processing. AI-generated outputs MUST also be checked before delivery.

### Moderation Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  CUSTOM MODEL MODERATION FLOW                                    │
│                                                                  │
│  User uploads photo                                              │
│       │                                                          │
│       ▼                                                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  PETAL LAYER 1: PhotoDNA / CSAM Scanning                │    │
│  │  - Microsoft PhotoDNA (industry standard)               │    │
│  │  - Hash-based detection                                 │    │
│  │  - MANDATORY - no opt-out, no bypass                    │    │
│  │  - Cost: Included in cloud provider                     │    │
│  └─────────────────────────────────────────────────────────┘    │
│       │                                                          │
│  Pass? ───No──→ BLOCK + REPORT (federal reporting required)     │
│       │                                                          │
│      Yes                                                         │
│       │                                                          │
│       ▼                                                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  PETAL LAYER 2: Content Classification                  │    │
│  │  - Together.ai native moderation OR                     │    │
│  │  - LlamaGuard / similar vision model                    │    │
│  │  - Check: nudity, violence, minors, explicit content    │    │
│  └─────────────────────────────────────────────────────────┘    │
│       │                                                          │
│  Pass? ───No──→ REJECT with user-friendly message               │
│       │                                                          │
│      Yes                                                         │
│       │                                                          │
│       ▼                                                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  PETAL LAYER 3: Basic Sanity Check                      │    │
│  │  - Is this actually a photo of a person?                │    │
│  │  - Not a screenshot, meme, or non-human subject         │    │
│  │  - Face detection (at least one face present)           │    │
│  └─────────────────────────────────────────────────────────┘    │
│       │                                                          │
│  Pass? ───No──→ REJECT: "Please upload a photo of yourself"     │
│       │                                                          │
│      Yes                                                         │
│       │                                                          │
│       ▼                                                          │
│  ✅ PROCEED TO INFERENCE                                         │
│       │                                                          │
│       ▼                                                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  PETAL LAYER 4: Output Verification                     │    │
│  │  - Check generated image BEFORE showing to user         │    │
│  │  - Same classification as Layer 2                       │    │
│  │  - Catch any AI hallucinations or inappropriate outputs │    │
│  └─────────────────────────────────────────────────────────┘    │
│       │                                                          │
│  Pass? ───No──→ RETRY with different seed, or reject gracefully │
│       │                                                          │
│      Yes                                                         │
│       │                                                          │
│       ▼                                                          │
│  ✅ DELIVER TO USER                                              │
└─────────────────────────────────────────────────────────────────┘
```

### Layer 1: CSAM Detection (Mandatory)

**THIS IS NON-NEGOTIABLE AND LEGALLY REQUIRED.**

```typescript
const scanForCSAM = async (image: Buffer): Promise<CSAMResult> => {
  // Microsoft PhotoDNA or equivalent
  // Most cloud providers include this:
  // - Together.ai: Built-in
  // - AWS: Amazon Rekognition
  // - Cloudflare: Available via Worker
  // - RunPod: Must implement manually

  const hash = await photoDNA.hash(image);
  const match = await photoDNA.checkAgainstDatabase(hash);

  if (match.found) {
    // MANDATORY: Report to NCMEC (National Center for Missing & Exploited Children)
    await reportToNCMEC({
      hash: hash,
      timestamp: new Date(),
      userIdentifier: anonymizedUserId,  // For law enforcement
      // We MUST retain this info even with ZDR
    });

    // Log for internal records (no image stored)
    logSecurityEvent('csam_detected', {
      timestamp: new Date().toISOString(),
      hash: hash,
      reported: true
    });

    return { safe: false, reason: 'CSAM_DETECTED', mustReport: true };
  }

  return { safe: true };
};
```

**Legal obligations:**
- US federal law requires reporting to NCMEC within 24 hours
- We must retain certain metadata for law enforcement
- This is the ONE exception to our ZDR policy
- Failure to report is a federal crime

### Layer 2: Content Classification

```typescript
const PETAL_CATEGORIES = {
  ALLOWED: ['appropriate_fashion', 'selfie', 'portrait'],
  BLOCKED: [
    'nudity',           // Full or partial nudity
    'sexual',           // Sexually explicit or suggestive
    'violence',         // Gore, injury, weapons
    'minor',            // Detected minor in photo
    'drugs',            // Drug paraphernalia
    'self_harm',        // Self-harm imagery
  ],
  NEEDS_REVIEW: [
    'swimwear',         // Allowed for fashion, but verify context
    'underwear',        // Similar - fashion context check
    'revealing',        // Verify it's fashion-appropriate
  ]
};

interface PetalClassification {
  category: string;
  confidence: number;
  decision: 'allow' | 'block' | 'review';
  reason?: string;
}

const classifyImage = async (image: Buffer): Promise<PetalClassification> => {
  // Option 1: Together.ai built-in moderation
  const moderation = await together.moderate({
    image: image,
    categories: Object.values(PETAL_CATEGORIES).flat()
  });

  // Option 2: LlamaGuard 3 Vision (if self-hosting)
  // const classification = await llamaGuard.classifyImage(image);

  // Find highest confidence blocked category
  const blockedMatch = moderation.results
    .filter(r => PETAL_CATEGORIES.BLOCKED.includes(r.category))
    .sort((a, b) => b.confidence - a.confidence)[0];

  if (blockedMatch && blockedMatch.confidence > 0.8) {
    return {
      category: blockedMatch.category,
      confidence: blockedMatch.confidence,
      decision: 'block',
      reason: getCategoryReason(blockedMatch.category)
    };
  }

  // Check for needs-review categories
  const reviewMatch = moderation.results
    .filter(r => PETAL_CATEGORIES.NEEDS_REVIEW.includes(r.category))
    .sort((a, b) => b.confidence - a.confidence)[0];

  if (reviewMatch && reviewMatch.confidence > 0.7) {
    // For swimwear/underwear, check if it's fashion-appropriate
    const fashionContext = await checkFashionContext(image, reviewMatch.category);
    if (!fashionContext.appropriate) {
      return {
        category: reviewMatch.category,
        confidence: reviewMatch.confidence,
        decision: 'block',
        reason: 'This image type is not supported for try-on.'
      };
    }
  }

  return {
    category: 'appropriate',
    confidence: moderation.results[0]?.confidence || 0.9,
    decision: 'allow'
  };
};

const getCategoryReason = (category: string): string => {
  const reasons: Record<string, string> = {
    nudity: 'Please upload a photo where you are fully clothed.',
    sexual: 'This image is not appropriate for our platform.',
    violence: 'This image contains content we cannot process.',
    minor: 'Custom Model is only available for adults (18+).',
    drugs: 'This image contains content we cannot process.',
    self_harm: 'This image contains content we cannot process.'
  };
  return reasons[category] || 'This image cannot be processed.';
};
```

### Layer 3: Sanity Check

```typescript
const sanitycheckImage = async (image: Buffer): Promise<SanityResult> => {
  // Detect faces - at least one required for try-on
  const faces = await detectFaces(image);

  if (faces.length === 0) {
    return {
      valid: false,
      reason: 'Please upload a photo that shows your face and body.',
      suggestion: 'A full-body or half-body selfie works best!'
    };
  }

  if (faces.length > 1) {
    return {
      valid: false,
      reason: 'Please upload a photo with just you in it.',
      suggestion: 'Group photos don't work well for try-on.'
    };
  }

  // Check if it's a screenshot or meme
  const imageType = await classifyImageType(image);
  if (imageType.isScreenshot || imageType.isMeme || imageType.isDrawing) {
    return {
      valid: false,
      reason: 'Please upload an actual photo of yourself.',
      suggestion: 'Screenshots and drawings don't work for try-on.'
    };
  }

  // Check minimum quality
  const quality = await assessImageQuality(image);
  if (quality.resolution < 256 || quality.blur > 0.7) {
    return {
      valid: false,
      reason: 'This image is too low quality for a good try-on.',
      suggestion: 'Try a clearer, higher-resolution photo.'
    };
  }

  return { valid: true };
};
```

### Layer 4: Output Verification

**AI can hallucinate.** We must verify generated images before showing them.

```typescript
const verifyGeneratedOutput = async (
  originalImage: Buffer,
  generatedImage: Buffer,
  intendedOutfit: OutfitDescription
): Promise<OutputVerification> => {
  // Re-run content classification on generated image
  const classification = await classifyImage(generatedImage);

  if (classification.decision !== 'allow') {
    // AI generated something inappropriate
    logSecurityEvent('petal_output_blocked', {
      reason: classification.category,
      confidence: classification.confidence,
      // Don't log images - just metadata
    });

    return {
      safe: false,
      action: 'retry_or_reject',
      reason: 'Generated image did not meet safety standards.'
    };
  }

  // Verify the output looks like the intended outfit
  // (catch cases where AI completely ignored the prompt)
  const outfitMatch = await verifyOutfitMatch(generatedImage, intendedOutfit);

  if (outfitMatch.score < 0.5) {
    // AI hallucinated something unrelated
    return {
      safe: false,
      action: 'retry',
      reason: 'Generation did not match intended outfit.'
    };
  }

  return { safe: true };
};
```

### Provider CSAM Policies

| Provider | CSAM Scanning | Reporting | Policy |
|----------|---------------|-----------|--------|
| **Together.ai** | ✅ Built-in | Automatic | Required on all image APIs |
| **Replicate** | ✅ Built-in | Automatic | Zero tolerance |
| **FAL.ai** | ✅ Built-in | Automatic | Required |
| **RunPod** | ⚠️ Manual | Manual | Must implement yourself |

**If self-hosting:** We MUST integrate PhotoDNA or equivalent before processing ANY user photos.

### User Messaging

**Blocked upload:**
```
We couldn't process this photo.

For the best try-on experience, please upload:
✓ A clear photo of yourself
✓ Fully clothed (we'll change the outfit!)
✓ Just you in the photo
✓ Good lighting and quality

[Try Another Photo]
```

**Blocked output (AI failed):**
```
Something went wrong with this try-on.

We're trying again with a different approach...

[If retries exhausted:]
We couldn't generate this outfit. Try:
• A different base photo
• A simpler outfit description

[Try Again] [Change Photo]
```

### Petal Integration with Thorn

Petal extends Thorn's three-bird pattern for images:

| Thorn Layer | Petal Layer | Purpose |
|-------------|-------------|---------|
| Canary | CSAM scan | Tripwire for immediate threats |
| Kestrel | Content classification | Semantic validation |
| Robin | Output verification | Production safety |

**Shared infrastructure:**
- Same security logging format (no content, only hashes/metadata)
- Same escalation paths
- Same audit trail requirements
- Integrate into Thorn dashboard for unified moderation view

### Abuse Prevention

**Rate limiting:**
```typescript
const PETAL_RATE_LIMITS = {
  // Per-session limits
  maxUploadsPerSession: 5,        // Can't try 100 photos in one session
  maxRetriesPerImage: 3,          // Don't let bad actors burn GPU time

  // Per-user limits
  maxUploadsPerDay: 20,           // Even Pro users have limits
  maxBlockedUploadsBeforeReview: 3,  // Multiple blocks = manual review
};

const checkPetalRateLimits = async (userId: string): Promise<RateLimitResult> => {
  const recentUploads = await getRecentUploads(userId, '24h');
  const recentBlocks = await getRecentBlocks(userId, '7d');

  if (recentBlocks.length >= 3) {
    // User keeps uploading inappropriate content
    await flagForReview(userId, 'repeated_petal_blocks');
    return { allowed: false, reason: 'Account under review.' };
  }

  if (recentUploads.length >= PETAL_RATE_LIMITS.maxUploadsPerDay) {
    return { allowed: false, reason: 'Daily upload limit reached. Try again tomorrow!' };
  }

  return { allowed: true };
};
```

**Detection patterns:**
- Same user uploading variations of blocked content → Auto-flag
- Rapid-fire uploads → Likely automated abuse
- All uploads getting blocked → Review account
- Attempting to bypass with minimal changes → Escalate

---

## Cost Analysis

### Complete Cost Breakdown

#### Image Generation (Custom Model)

| Provider | Model | Price/Image | ZDR Available |
|----------|-------|-------------|---------------|
| **Together.ai** | FLUX Kontext [pro] | $0.04 | ✅ Yes |
| **Replicate** | FLUX Kontext [pro] | $0.04 | ⚠️ 1hr auto-delete |
| **FAL.ai** | FLUX Kontext [pro] | $0.04 | ✅ Enterprise |
| **FAL.ai** | FLUX.2 [dev] Turbo | $0.008 | ✅ Enterprise |

#### Style Analysis (DeepSeek v3.2 via OpenRouter/NovitaAI)

From OpenRouter pricing (NovitaAI provider):
- **Input:** $0.269 per million tokens
- **Output:** $0.40 per million tokens
- **Cache Read:** $0.1345 per million tokens
- **Zero Retention:** ✅ Yes

```
Average style analysis:
- Input: ~1,500 tokens (reactions + prompt)
- Output: ~500 tokens (profile JSON)

Cost per analysis:
- Input: 1,500 × ($0.269 / 1,000,000) = $0.0004
- Output: 500 × ($0.40 / 1,000,000) = $0.0002
- Total: $0.0006 per style profile

At scale:
- 1,000 profiles = $0.60
- 10,000 profiles = $6.00
- 100,000 profiles = $60.00

This is NEGLIGIBLE compared to image generation costs.
```

#### Infrastructure Costs (Grove Stack)

| Component | Cost | Notes |
|-----------|------|-------|
| **R2 Storage** | ~$0.015/GB/month | ~600MB catalog = $0.01/month |
| **Amber CDN** | $0 | Egress is free on Cloudflare |
| **D1 Database** | Free tier: 5M reads/day | Paid: $0.75/million reads |
| **Vectorize** | Free tier: 5M queries/month | Then ~$0.01/1K queries |
| **Durable Objects** | $0.15/million requests | Plus $12.50/million GB-seconds |
| **Workers** | Free tier generous | Then $0.50/million requests |

**Monthly fixed cost estimate: ~$5-10** until significant scale

### Scout Economics (Updated)

```
┌─────────────────────────────────────────────────────────────────┐
│  SEEKER TIER ($10/month) - Per User Cost                         │
│                                                                  │
│  Fixed costs (minimal):                                          │
│  - Infrastructure share: ~$0.01                                  │
│                                                                  │
│  Variable costs (average user):                                  │
│  - 30 searches × ~$0.008 (agent costs): $0.24                   │
│  - 8 Custom Model try-ons × $0.04: $0.32                        │
│  - 2 style analyses × $0.0006: $0.001                           │
│  - Moodboard sessions (Human Models): ~$0                        │
│                                                                  │
│  Total cost per user/month: ~$0.57                               │
│  Revenue per user/month: $10.00                                  │
│  Profit per user/month: $9.43                                    │
│  Margin: 94.3%                                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  PATHFINDER TIER ($25/month) - Per User Cost                     │
│                                                                  │
│  Variable costs (power user):                                    │
│  - 100 searches × ~$0.008: $0.80                                │
│  - 25 Custom Model try-ons × $0.04: $1.00                       │
│  - 4 style analyses × $0.0006: $0.002                           │
│                                                                  │
│  Total cost per user/month: ~$1.80                               │
│  Revenue per user/month: $25.00                                  │
│  Profit per user/month: $23.20                                   │
│  Margin: 92.8%                                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  WANDERER TIER (Free) - Per User Cost                            │
│                                                                  │
│  - 5 searches × ~$0.008: $0.04                                  │
│  - 1 style analysis: $0.0006                                    │
│  - Moodboard (Human Models): ~$0                                │
│                                                                  │
│  Total cost per free user/month: ~$0.04                         │
│  Revenue: $0.00                                                  │
│  Net: -$0.04 per free user                                       │
│                                                                  │
│  Break-even: 1 paid Seeker covers 235 free Wanderers!           │
└─────────────────────────────────────────────────────────────────┘
```

### Scale Projections (Realistic)

| Users | Mix | Monthly Revenue | Monthly Cost | Profit | Margin |
|-------|-----|-----------------|--------------|--------|--------|
| 100 | 50 Wanderers + 40 Seekers + 10 Pathfinders | $650 | ~$50 | $600 | 92% |
| 500 | 300 + 150 + 50 | $2,750 | ~$200 | $2,550 | 93% |
| 1,000 | 600 + 300 + 100 | $5,500 | ~$400 | $5,100 | 93% |
| 5,000 | 3,000 + 1,500 + 500 | $27,500 | ~$2,000 | $25,500 | 93% |

**Why are margins so high?**
1. Pre-generated catalog (Human Models) = nearly zero marginal cost
2. DeepSeek is absurdly cheap
3. Cloudflare egress is free
4. We only pay for Custom Model inference (premium feature)

### When to Switch Infrastructure

| Scale | Best Option | Monthly Cost | Notes |
|-------|-------------|--------------|-------|
| 0-50k images | Serverless (Together.ai) | Pay per use | Like Cloudflare - scales automatically |
| 50k-200k images | Dedicated GPU (RunPod) | ~$285-400 | RTX 4090 or A6000 |
| 200k+ images | Multiple GPUs | ~$600-2,000 | Mix of dedicated + serverless overflow |
| 500k+ images | Own cluster | Variable | Years away, serious scale |

**Breakeven for dedicated GPU:**
- RTX 4090 ($285/mo) breaks even at ~7,125 images/month
- That's ~356 Seeker users all maxing out Custom Model
- Until then, serverless is optimal!

### Hidden Costs Addressed

| Concern | Status | Notes |
|---------|--------|-------|
| Bandwidth (image upload/download) | ✅ Covered | Amber CDN = $0 egress |
| Storage (Model Farm + catalog) | ✅ Covered | R2 ~$0.01/month |
| DeepSeek API | ✅ Covered | $0.0006/analysis |
| Image generation | ✅ Covered | $0.04/image (only Custom Model) |
| Moderation (PhotoDNA) | ✅ Covered | Built into Together.ai |
| D1/Vectorize | ✅ Covered | Free tier + minimal paid |
| Durable Objects | ✅ Covered | ~$5-10/month at scale |

---

## Grove Infrastructure Integration

Moodboard Mode leverages the full Grove stack. Here's how all the pieces fit together.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  MOODBOARD MODE INFRASTRUCTURE                                   │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                     CLOUDFLARE EDGE                        │  │
│  │                                                            │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │  │
│  │  │   Amber     │  │    Scout    │  │   Heartwood │       │  │
│  │  │    CDN      │  │   Worker    │  │    Auth     │       │  │
│  │  │  (images)   │  │  (API)      │  │  (session)  │       │  │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘       │  │
│  │         │                │                │               │  │
│  └─────────┼────────────────┼────────────────┼───────────────┘  │
│            │                │                │                   │
│            ▼                ▼                ▼                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                  LOOM (Durable Objects)                    │  │
│  │                                                            │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │  │
│  │  │ SessionDO   │  │ MoodboardDO │  │  StyleDO    │       │  │
│  │  │ (per user)  │  │ (per user)  │  │ (per style) │       │  │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘       │  │
│  │         │                │                │               │  │
│  └─────────┼────────────────┼────────────────┼───────────────┘  │
│            │                │                │                   │
│            ▼                ▼                ▼                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    PERSISTENCE LAYER                        ││
│  │                                                             ││
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        ││
│  │  │     R2      │  │     D1      │  │  Vectorize  │        ││
│  │  │  (images)   │  │ (metadata)  │  │ (semantic)  │        ││
│  │  └─────────────┘  └─────────────┘  └─────────────┘        ││
│  │                                                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    EXTERNAL SERVICES                       │  │
│  │                                                            │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │  │
│  │  │ Together.ai │  │  DeepSeek   │  │  PhotoDNA   │       │  │
│  │  │ (images)    │  │ (analysis)  │  │ (CSAM scan) │       │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘       │  │
│  │                                                            │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Amber: CDN & Image Delivery

**Purpose:** Serve Model Farm images and generated fashion images fast and cheap.

```typescript
// Fashion images served from Amber
const AMBER_CONFIG = {
  bucket: 'scout-images',
  publicUrl: 'https://cdn.scout.place',
  cacheRules: {
    // Model Farm base images - cache forever (immutable)
    'models/*': { maxAge: 31536000, immutable: true },

    // Pre-generated fashion catalog - long cache
    'catalog/*': { maxAge: 604800 },  // 7 days

    // User-generated try-ons - never cache (ephemeral)
    'tryons/*': { maxAge: 0, noStore: true },
  }
};
```

**Cost:** Cloudflare R2 + CDN = $0 egress. We only pay for storage.

### R2: Image Storage

**Purpose:** Store Model Farm base images, pre-generated catalog, and temporary processing.

```typescript
interface R2BucketStructure {
  // Model Farm - permanent
  'models/': {
    '[modelId]/': {
      'standing.webp': Buffer;
      'sitting.webp': Buffer;
      'walking.webp': Buffer;
      'consent.pdf': Buffer;  // Legal document
    }
  };

  // Pre-generated catalog - permanent
  'catalog/': {
    '[imageId].webp': Buffer;
    '[imageId].json': FashionImageMetadata;
  };

  // Processing scratch - ephemeral
  'processing/': {
    '[sessionId]/': {
      'upload.webp': Buffer;     // Deleted after inference
      'output-[n].webp': Buffer; // Deleted after delivery
    }
  };
}
```

**Storage estimates:**
- Model Farm (~12 models × 3 poses): ~72MB
- Catalog (1000 images): ~500MB
- Processing buffer: <10MB (ephemeral)
- **Total: ~600MB** = ~$0.01/month

### D1: Metadata Storage

**Purpose:** Style profiles, catalog metadata, usage tracking.

```sql
-- User styles
CREATE TABLE user_styles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  profile_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  search_count INTEGER DEFAULT 0
);

-- Fashion catalog metadata
CREATE TABLE catalog_images (
  id TEXT PRIMARY KEY,
  model_id TEXT NOT NULL,
  outfit_json TEXT NOT NULL,
  season TEXT NOT NULL,
  vibes TEXT NOT NULL,
  alt_text TEXT NOT NULL
);

CREATE INDEX idx_catalog_season ON catalog_images(season);
```

### Vectorize: Semantic Search

**Purpose:** Match user reactions to similar catalog images.

```typescript
// Find similar images based on user's reactions
const findSimilarImages = async (
  lovedImages: FashionImage[],
  skippedImages: FashionImage[]
): Promise<FashionImage[]> => {
  const positiveEmbedding = await createAverageEmbedding(lovedImages);

  const results = await env.VECTORIZE.query(positiveEmbedding, {
    topK: 20,
    filter: { id: { $nin: skippedImages.map(i => i.id) } }
  });

  return results.matches.map(m => getCatalogImage(m.id));
};
```

### Loom: MoodboardDO

**Purpose:** Coordinate moodboard sessions with state, rate limiting, and cleanup.

```typescript
class MoodboardDO extends DurableObject {
  // Start session
  async startSession(params: { mode: 'human' | 'custom' }): Promise<void>;

  // Record reaction
  async recordReaction(reaction: Reaction): Promise<void>;

  // Upload photo (Custom Model)
  async uploadPhoto(photo: Buffer): Promise<UploadResult>;

  // Generate try-on
  async generateTryOn(outfit: OutfitDescription): Promise<TryOnResult>;

  // End session - CRITICAL cleanup
  async endSession(): Promise<EndSessionResult> {
    // Delete uploaded photo from R2
    // Delete all generated images from R2
    // Return style profile (text only)
    // Reset state
  }

  // Alarm: force cleanup after timeout
  async alarm(): Promise<void>;
}
```

### DeepSeek Integration via OpenRouter

**Purpose:** Style analysis at minimal cost.

```typescript
const DEEPSEEK_CONFIG = {
  model: 'deepseek/deepseek-chat-v3.2',
  provider: 'novitaai',  // $0.269/$0.40 per million tokens
  zeroRetention: true
};

// Cost: ~$0.0006 per style analysis
// 1000 analyses = $0.60
```

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

### Philosophy: Let Wanderers Wander

> *"You can lead a horse to water, but you can't make it drink."*
>
> — And that's fine. Sometimes they come back thirsty.

From [Grove User Identity](https://grove.place/philosophy):

> **Wanderers are welcome to stay as long as they like, or pass through and never return. The grove doesn't demand anything of you.**

Scout embraces this philosophy. If someone screenshots their style profile and searches manually? **Good for them.** They got value. That's the point.

**Why this is OK:**
- They experienced Scout's magic (style discovery)
- They'll remember when they need it again
- Word of mouth from satisfied users > forced conversion
- The free experience builds trust

**What we're betting on:**
Once they see how much *better* Scout's actual searches are - the AI agents finding deals they couldn't find themselves, the seasonal context, the curated results - they'll be back.

### Tiered Access: Taste Before You Buy

| Feature | Wanderer (Free) | Scout Seeker ($10/mo) | Scout Pathfinder ($25/mo) |
|---------|-----------------|----------------------|---------------------------|
| **Human Models moodboard** | ✅ Unlimited | ✅ Unlimited | ✅ Unlimited |
| **Style profile generation** | ✅ Full | ✅ Full | ✅ Full |
| **Search terms (take with you!)** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Scout searches** | 5/month | 50/month | Unlimited |
| **Custom Model (try-on)** | ❌ No | 10/month | 25/month |
| **Seasonal context** | ❌ No | ✅ Yes | ✅ Yes |
| **Midnight mode** | ❌ No | ✅ Yes | ✅ Yes |
| **Multiple saved styles** | 1 | 5 | Unlimited |
| **Evolution tracking** | ❌ No | ✅ Yes | ✅ Yes |
| **Priority processing** | ❌ No | ❌ No | ✅ Yes |

### The Free Tier: Not a Trap

**What Wanderers get for free:**
1. **Full Moodboard experience** - Swipe through Human Models mode
2. **Complete style profile** - Know exactly what they like
3. **Search terms** - Take them anywhere! Google, Amazon, wherever
4. **5 Scout searches/month** - Enough to see the value
5. **One saved style** - Their primary vibe, persistent

**Why 5 free searches?**

```
┌─────────────────────────────────────────────────────────────────┐
│  FREE SEARCH EXPERIENCE                                          │
│                                                                  │
│  Search 1: "Oh this is cool, it found me good stuff!"           │
│  Search 2: "Let me try a different category..."                 │
│  Search 3: "Nice deals! Better than I found manually."          │
│  Search 4: "OK I'm getting hooked on this..."                   │
│  Search 5: "I need more of this."                               │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  You've used all 5 free searches this month!             │   │
│  │                                                          │   │
│  │  Your style profile and search terms are still yours -   │   │
│  │  use them anywhere you like!                             │   │
│  │                                                          │   │
│  │  Want Scout to keep finding deals for you?               │   │
│  │                                                          │   │
│  │  [ Upgrade to Scout Seeker - $10/mo ]                    │   │
│  │                                                          │   │
│  │  Or come back next month for 5 more free searches!       │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

**The psychology:**
- 5 is enough to demonstrate real value
- Not so many that they never feel the need
- Resets monthly - they can always come back
- No shame, no dark patterns, no guilt

### Cost to Serve Free Users

| Component | Cost per User | Notes |
|-----------|---------------|-------|
| Human Models images | ~$0 | Pre-generated, served from Amber CDN |
| Style analysis (DeepSeek) | ~$0.001 | Per profile generation |
| 5 Scout searches | ~$0.25-0.50 | Depends on search complexity |
| Storage (profile text) | ~$0 | Negligible |
| **Total/month** | **~$0.30-0.50** | Sustainable at scale |

**Break-even:** A free user costs us ~$0.50/month. If 10% convert at $10/month, each paid user covers 20 free users. We just need >5% conversion to be sustainable.

### Premium Tiers: Worth the Money

**Scout Seeker ($10/month):**
- For regular shoppers who want Scout to do the work
- 50 searches covers most people's needs
- 10 Custom Model try-ons for special purchases
- The "sweet spot" tier

**Scout Pathfinder ($25/month):**
- For fashion enthusiasts and frequent shoppers
- Unlimited searches, generous try-on allocation
- Multiple saved styles (work, weekend, going out)
- Priority processing (skip the queue)
- Grove identity: Aligns with Pathfinder role

### No Lock-In, No Dark Patterns

**What we WON'T do:**
- ❌ Make profiles expire if you don't pay
- ❌ Delete your style history after free trial
- ❌ Watermark or degrade free search results
- ❌ Spam you with upgrade prompts
- ❌ Make cancellation difficult
- ❌ Hide the "downgrade" button

**What we WILL do:**
- ✅ Let you export your data anytime
- ✅ Keep your profile forever (even free tier)
- ✅ Show upgrade benefits honestly
- ✅ One-click cancellation
- ✅ Prorated refunds if you cancel mid-month

**The Wanderer Promise:**
> *Come, go, return. Your style profile is always here. Take what you need.*

---

## Usage Caps & Fair Use Policy

### Why Caps?

1. **Cost management** - AI inference isn't free
2. **Abuse prevention** - Stop automated exploitation
3. **Fair resource sharing** - Don't let power users crowd out everyone
4. **Sustainable business** - We want to exist long-term

### Detailed Limits by Tier

```typescript
const TIER_LIMITS = {
  wanderer: {
    // Free tier - generous taste, sustainable limits
    monthlySearches: 5,
    customModelTryons: 0,           // Upgrade to unlock
    moodboardSessions: Infinity,    // Free, almost no cost
    savedStyles: 1,
    styleRefreshes: 1,              // Once per month
    searchesPerDay: 2,              // Max 2/day even within monthly limit
  },

  seeker: {
    // $10/month - the sweet spot
    monthlySearches: 50,
    customModelTryons: 10,          // About 1 session of 10 images
    moodboardSessions: Infinity,
    savedStyles: 5,
    styleRefreshes: 4,              // Quarterly (once per season)
    searchesPerDay: 10,             // Generous daily cap
    tryonsPerSession: 20,           // Can't burn all 10 in one session
    tryonsPerDay: 5,                // Spread across days
  },

  pathfinder: {
    // $25/month - power users
    monthlySearches: Infinity,      // No cap, but burst limits apply
    customModelTryons: 25,
    moodboardSessions: Infinity,
    savedStyles: Infinity,
    styleRefreshes: Infinity,
    searchesPerDay: 50,             // Reasonable burst limit
    tryonsPerSession: 25,           // Full monthly allocation if wanted
    tryonsPerDay: 10,
  }
};
```

### Burst Protection (Anti-Abuse)

Even with high limits, we protect against abuse:

```typescript
const BURST_LIMITS = {
  // Searches
  searchesPerMinute: 2,           // Slow down, think about what you want
  searchesPerHour: 10,            // You're not a bot, right?

  // Custom Model
  uploadsPerMinute: 2,            // One every 30 seconds max
  generationsPerHour: 20,         // That's a lot of outfits
  failedUploadsPerHour: 5,        // Stop after 5 blocked uploads

  // Moodboard
  reactionsPerMinute: 30,         // Swipe speed limit
  sessionsPerDay: 10,             // You can refresh, but not spam
};

const checkBurstLimits = async (
  userId: string,
  action: 'search' | 'upload' | 'generate' | 'react'
): Promise<BurstCheckResult> => {
  const key = `burst:${userId}:${action}`;
  const window = getBurstWindow(action);
  const limit = BURST_LIMITS[`${action}sPerMinute`] || BURST_LIMITS[`${action}sPerHour`];

  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, window);
  }

  if (count > limit) {
    return {
      allowed: false,
      retryAfter: await redis.ttl(key),
      message: getBurstMessage(action)
    };
  }

  return { allowed: true };
};

const getBurstMessage = (action: string): string => {
  const messages = {
    search: "Slow down! Take a moment to review your results before searching again.",
    upload: "One photo at a time - good try-ons take a moment to process.",
    generate: "That's a lot of outfits! Let's pace ourselves.",
    react: "Rapid reactions? Take a breath and really feel each look."
  };
  return messages[action] || "Please slow down and try again in a moment.";
};
```

### Fair Use Policy (Legal Language)

```markdown
## Scout Fair Use Policy

Scout is designed for personal fashion discovery and shopping assistance.
The following uses are prohibited:

### Prohibited Uses

1. **Automated Access**
   - Bots, scripts, or automated tools
   - API scraping or reverse engineering
   - Bulk data extraction

2. **Commercial Exploitation**
   - Reselling Scout search results
   - Using Scout for commercial research without authorization
   - Building competing products using Scout data

3. **Abuse of Resources**
   - Sharing account credentials
   - Creating multiple free accounts to bypass limits
   - Attempting to bypass rate limits or usage caps

4. **Harmful Behavior**
   - Uploading illegal or harmful content
   - Attempting to generate inappropriate images
   - Harassing other users or Scout staff

### Enforcement

Violations may result in:
- First offense: Warning
- Second offense: Temporary suspension (7 days)
- Third offense: Account termination

Severe violations (automated abuse, illegal content) may result
in immediate termination without warning.

### Appeals

Email appeals to support@scout.place within 14 days of enforcement action.
```

### Graceful Limit Handling

**When limits are reached:**

```svelte
{#if limitReached}
  <div class="limit-notice glass">
    {#if limit.type === 'monthly_searches'}
      <h3>You've used your searches for this month 🔍</h3>
      <p>
        You had {limit.used} searches - nice work finding great stuff!
      </p>
      <p class="text-muted">
        Resets in {formatDaysUntilReset(limit.resetsAt)}
      </p>

      <div class="options">
        <a href="/upgrade" class="btn primary">
          Upgrade for more searches
        </a>
        <p class="or">or</p>
        <p class="alternative">
          Use your style profile to search manually -
          <a href="/profile/export">export your keywords</a>
        </p>
      </div>

    {:else if limit.type === 'custom_model'}
      <h3>Custom Model limit reached ✨</h3>
      <p>
        You've used {limit.used}/{limit.max} try-ons this month.
      </p>
      <p class="text-muted">
        Human Models mode is still unlimited!
      </p>

      <div class="options">
        <button onclick={() => switchToHumanModels()} class="btn secondary">
          Continue with Human Models
        </button>
        <a href="/upgrade" class="btn primary">
          Upgrade for more try-ons
        </a>
      </div>

    {:else if limit.type === 'burst'}
      <h3>Let's slow down a bit 🌿</h3>
      <p>
        {limit.message}
      </p>
      <p class="countdown">
        Ready again in {formatCountdown(limit.retryAfter)}
      </p>
    {/if}
  </div>
{/if}
```

### Usage Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│  YOUR USAGE THIS MONTH                     Resets in 12 days   │
│                                                                  │
│  Scout Searches                                                  │
│  ████████████████████░░░░░░░░░░░  32 / 50 used                  │
│                                                                  │
│  Custom Model Try-ons                                            │
│  ████████░░░░░░░░░░░░░░░░░░░░░░░  4 / 10 used                   │
│                                                                  │
│  Saved Styles                                                    │
│  ██████████████████████████████░  3 / 5 active                  │
│                                                                  │
│  Style Refreshes                                                 │
│  ████████████████████░░░░░░░░░░░  2 / 4 this quarter            │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  Need more? [ Upgrade to Pathfinder - $25/mo ]                  │
│  Unlimited searches, 25 try-ons/month, unlimited styles          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Style Library & Evolution

### Multiple Styles Per User

Users aren't one-dimensional. They contain multitudes. Scout should too.

```
┌─────────────────────────────────────────────────────────────────┐
│  MY STYLES                                           + New Style │
│                                                                  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│  │  🌙 Midnight │ │  🍂 Cozy     │ │  💼 Office   │             │
│  │  Avant-garde │ │  Earth tones │ │  Polished    │             │
│  │  Bold, queer │ │  Cashmere    │ │  Minimal     │             │
│  │              │ │              │ │              │             │
│  │  Jan 2026    │ │  Oct 2025    │ │  Jun 2025    │             │
│  │  ★ Active    │ │              │ │              │             │
│  └──────────────┘ └──────────────┘ └──────────────┘             │
│                                                                  │
│  Tap a style to search with that vibe instantly.                │
└─────────────────────────────────────────────────────────────────┘
```

### Why Multiple Styles?

| Scenario | Old Way (Filters) | Scout Way (Styles) |
|----------|-------------------|-------------------|
| "I want cozy today" | Remember 10+ filter settings | Tap "🍂 Cozy" |
| "Going out tonight" | Start from scratch | Tap "🌙 Midnight" |
| "Job interview" | Guess at filters | Tap "💼 Office" |
| "Feeling adventurous" | ??? | Create new style! |

### Data Model

```typescript
interface UserStyle {
  id: string;
  name: string;              // "Midnight Me", "Cozy Autumn", "Office Slay"
  icon: string;              // Emoji chosen by user
  color: string;             // Accent color for the style card
  profile: StyleProfile;     // The actual preferences from moodboard

  // Metadata
  createdAt: Date;
  updatedAt: Date;           // Last refresh
  lastUsedAt: Date;
  searchCount: number;       // How often they use this style

  // Evolution tracking
  version: number;           // Increments on refresh
  history: StyleSnapshot[];  // Previous versions with timestamps
}

interface StyleSnapshot {
  version: number;
  capturedAt: Date;
  profile: StyleProfile;
}
```

### Style as Personal Seasons

User styles integrate with the season selector:

```svelte
<fieldset role="radiogroup" aria-label="Search context">
  <!-- Built-in seasons -->
  {#each builtInSeasons as season}
    <SeasonButton {season} />
  {/each}

  <div class="divider" />

  <!-- User's custom styles -->
  {#each userStyles as style}
    <button
      role="radio"
      aria-checked={activeStyle === style.id}
      class="style-button"
      style:--accent={style.color}
    >
      <span class="icon">{style.icon}</span>
      <span class="name">{style.name}</span>
    </button>
  {/each}

  <!-- Create new -->
  <button onclick={startMoodboard} class="add-style">
    + New Style
  </button>
</fieldset>
```

---

## Evolution Tracking

### The Journey, Not Just the Destination

Scout doesn't just know who you are *now*. It remembers who you *were*.

```typescript
interface StyleEvolution {
  userId: string;
  styles: UserStyle[];

  // Computed insights
  dominantColors: { period: DateRange; colors: string[] }[];
  silhouetteShift: { from: string[]; to: string[]; when: Date }[];
  confidenceGrowth: { date: Date; boldnessScore: number }[];
}

// Example evolution data:
{
  dominantColors: [
    { period: "2025-Q1", colors: ["gray", "black", "navy"] },
    { period: "2025-Q3", colors: ["burgundy", "forest", "cream"] },
    { period: "2026-Q1", colors: ["magenta", "gold", "electric blue"] }
  ],
  silhouetteShift: [
    { from: ["oversized", "hiding"], to: ["fitted", "structured"], when: "2025-09" }
  ],
  confidenceGrowth: [
    { date: "2025-03", boldnessScore: 23 },
    { date: "2025-09", boldnessScore: 56 },
    { date: "2026-01", boldnessScore: 84 }
  ]
}
```

### AI Commentary on Growth

Scout can recognize patterns and celebrate growth:

```typescript
const generateEvolutionInsight = async (evolution: StyleEvolution): Promise<string> => {
  const prompt = `
    Analyze this user's style evolution and write a warm, celebratory message
    about their growth. Be specific about what changed. Be encouraging.

    Early styles: ${JSON.stringify(evolution.styles.slice(0, 2))}
    Recent styles: ${JSON.stringify(evolution.styles.slice(-2))}

    Boldness scores over time: ${JSON.stringify(evolution.confidenceGrowth)}

    Write 2-3 sentences that feel like a supportive friend noticing their growth.
    Use "you" language. Be genuine, not corporate.
  `;

  return await generateWithDeepSeek(prompt);
};

// Example outputs:
//
// "I noticed something beautiful. 💜 Your first style profile from March 2025
// was mostly neutrals, oversized fits, things that hide rather than show.
// Your latest profile? Bold colors, fitted silhouettes, statement pieces
// that demand attention. You're not hiding anymore. You're HERE. ✨"
//
// "Look at you! A year ago, you wouldn't touch anything with color. Now
// you're reaching for electric blue and gold? That's not just a style
// change - that's confidence. I see you. 💜"
//
// "Your cozy autumn style has gotten even cozier. More textures, richer
// colors, pieces that feel like a hug. You're leaning into comfort without
// apologizing for it. That's beautiful."
```

### When to Surface Evolution Insights

- **Style Anniversary:** "It's been one year since you created 'Midnight Me'!"
- **Major Shift Detected:** When a style refresh shows significant change
- **Milestone:** After 10th, 50th, 100th search with a style
- **Seasonal Prompt:** During quarterly moodboard refresh

```svelte
{#if evolutionInsight}
  <div class="evolution-card glass">
    <p class="insight">{evolutionInsight.message}</p>

    {#if evolutionInsight.comparison}
      <div class="then-now">
        <div class="then">
          <span class="label">Then</span>
          <StylePreview profile={evolutionInsight.oldProfile} />
        </div>
        <div class="arrow">→</div>
        <div class="now">
          <span class="label">Now</span>
          <StylePreview profile={evolutionInsight.newProfile} />
        </div>
      </div>
    {/if}

    <button onclick={dismissInsight}>Thanks, Scout 💜</button>
  </div>
{/if}
```

---

## Seasonal Refresh Prompts

### Keep Styles Fresh

People change. Fashion evolves. Styles should too.

```svelte
<!-- Gentle prompt after ~90 days -->
{#if daysSinceLastMoodboard(style) > 90}
  <div class="refresh-prompt glass">
    <p>It's been a while since you refreshed "{style.name}"</p>
    <p class="text-muted">
      You've probably changed since {formatDate(style.updatedAt)}.
      Want to see if your vibe has shifted?
    </p>
    <div class="actions">
      <button onclick={() => refreshStyle(style)} class="primary">
        Refresh This Style
      </button>
      <button onclick={snoozePrompt} class="ghost">
        Maybe Later
      </button>
    </div>
  </div>
{/if}
```

### Refresh Flow

When refreshing an existing style:
1. Start moodboard with their current preferences as baseline
2. Show mix of items they'd probably still like + new items to test
3. After completion, compare old vs new profile
4. Ask: "Save as update or create new style?"

```svelte
<dialog open={showRefreshComplete}>
  <h2>Your style has evolved!</h2>

  <div class="comparison">
    <div class="before">
      <h3>Before</h3>
      <StyleSummary profile={oldProfile} />
    </div>
    <div class="after">
      <h3>After</h3>
      <StyleSummary profile={newProfile} />
    </div>
  </div>

  <div class="changes">
    <h3>What changed:</h3>
    <ul>
      {#each changes as change}
        <li>{change}</li>
      {/each}
    </ul>
  </div>

  <div class="actions">
    <button onclick={updateExisting}>
      Update "{style.name}"
    </button>
    <button onclick={createNew}>
      Keep both (create new style)
    </button>
  </div>
</dialog>
```

---

## Nostalgic Surfacing

### Occasional Delights from Past Styles

Sometimes, Scout surfaces items from older styles - a gentle reminder of where you've been.

```typescript
const shouldSurfaceNostalgia = (user: User): boolean => {
  // Rare - maybe 1 in 50 searches
  if (Math.random() > 0.02) return false;

  // Only if they have old styles (6+ months)
  const oldStyles = user.styles.filter(s =>
    monthsAgo(s.createdAt) > 6 && s.id !== user.activeStyleId
  );

  return oldStyles.length > 0;
};

const generateNostalgiaItem = async (user: User): Promise<NostalgiaResult | null> => {
  const oldStyle = pickRandom(getOldStyles(user));
  const item = await findItemMatchingProfile(oldStyle.profile);

  if (!item) return null;

  return {
    item,
    style: oldStyle,
    message: generateNostalgiaMessage(oldStyle)
  };
};

const generateNostalgiaMessage = (style: UserStyle): string => {
  const messages = [
    `From your "${style.name}" era (${formatDate(style.createdAt)}). Still love it?`,
    `Remember this vibe? Your "${style.name}" style from ${formatRelative(style.createdAt)}.`,
    `Throwback! This matches your old "${style.name}" profile. Feeling nostalgic?`,
    `A blast from the past - this is SO your "${style.name}" energy.`
  ];
  return pickRandom(messages);
};
```

### UI for Nostalgia Items

```svelte
{#if nostalgiaItem}
  <div class="nostalgia-card glass accent-purple">
    <div class="header">
      <span class="label">✨ From your past</span>
      <span class="style-name">{nostalgiaItem.style.icon} {nostalgiaItem.style.name}</span>
    </div>

    <ProductCard product={nostalgiaItem.item} />

    <p class="message">{nostalgiaItem.message}</p>

    <div class="actions">
      <button onclick={() => addToResults(nostalgiaItem.item)}>
        Still love it!
      </button>
      <button onclick={dismissNostalgia} class="ghost">
        I've moved on
      </button>
    </div>
  </div>
{/if}
```

---

## The Emotional Core

### Why This Matters

For anyone going through change - transition, weight journey, new chapter - Scout becomes more than a shopping tool. It becomes a **witness to their becoming**.

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  "Scout isn't just helping me shop.                             │
│                                                                  │
│   It's the only app that's noticed I've changed.                │
│   That I'm not hiding anymore.                                  │
│   That I'm finally dressing like HER.                           │
│                                                                  │
│   It saw my journey before I did."                              │
│                                                                  │
│                                          - Future Scout User 💜  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

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

Moodboard Mode must be exceptional for ALL users, including those who cannot see images.

#### Keyboard Navigation

- **Arrow keys:** Left/Right to navigate images
- **Number keys:** 1-5 for reaction shortcuts (1=Love, 2=Want, 3=Vibe, 4=Bold, 5=Skip)
- **Enter:** Confirm current selection
- **Z:** Undo last reaction
- **Tab:** Navigate between UI sections
- **Escape:** Exit moodboard mode (with confirmation)

#### Screen Reader Experience

```svelte
<div
  role="region"
  aria-label="Fashion moodboard"
  aria-description="Rate fashion images to build your style profile"
>
  <img
    src={currentImage.url}
    alt={currentImage.altText}
    aria-describedby="image-details"
  />

  <div id="image-details" class="sr-only">
    {currentImage.detailedDescription}
    <!-- e.g., "A model wearing an oversized cream wool sweater with
         high-waisted brown corduroy pants. The sweater has dropped
         shoulders and ribbed cuffs. Styling includes minimal gold
         jewelry and brown leather ankle boots." -->
  </div>

  <div role="status" aria-live="polite">
    Image {currentIndex + 1} of {totalImages}.
    {#if lastReaction}
      You reacted: {lastReaction}.
    {/if}
  </div>

  <div role="group" aria-label="Reaction buttons">
    {#each reactions as reaction}
      <button
        aria-label="{reaction.label}: {reaction.description}"
        aria-keyshortcuts="{reaction.shortcut}"
      >
        {reaction.emoji} {reaction.label}
      </button>
    {/each}
  </div>
</div>
```

#### Text-Based Alternative: "Describe Your Style"

For users who prefer text or cannot process images:

```
┌─────────────────────────────────────────────────────────────────┐
│  🎨 Build Your Style Profile                                     │
│                                                                  │
│  [ Visual Moodboard ]    [ Describe Your Style ]                │
│                          ★ Text-based alternative                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Tell us about your style preferences:                           │
│                                                                  │
│  Colors I love:                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ earth tones, deep burgundy, forest green...               │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Colors I avoid:                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ neon, pastels, bright orange...                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Describe your ideal outfit:                                     │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Oversized cozy sweater with fitted pants, minimal          │  │
│  │ jewelry, comfortable but put-together...                   │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  What vibes resonate with you? (select all that apply)           │
│  ☑ Cozy/Comfortable  ☐ Bold/Statement   ☐ Minimalist            │
│  ☐ Vintage/Retro     ☑ Earthy/Natural   ☐ Edgy/Alternative      │
│  ☐ Preppy/Classic    ☐ Streetwear       ☑ Layered looks         │
│                                                                  │
│  [ Generate My Style Profile ]                                   │
└─────────────────────────────────────────────────────────────────┘
```

**Implementation:**

```typescript
interface TextStyleInput {
  lovedColors: string;
  avoidedColors: string;
  idealOutfit: string;
  vibeSelections: string[];  // Preset options
  additionalNotes?: string;
}

const analyzeTextInput = async (input: TextStyleInput): Promise<StyleProfile> => {
  const prompt = `
    Generate a style profile from this user's text description.
    They prefer text-based input (may be vision-impaired or prefer verbal).

    Colors they love: ${input.lovedColors}
    Colors they avoid: ${input.avoidedColors}
    Ideal outfit description: ${input.idealOutfit}
    Vibes selected: ${input.vibeSelections.join(', ')}
    Additional notes: ${input.additionalNotes || 'None'}

    Generate a complete style profile with search terms they'd love.
    Be warm and affirming in the summary text.
  `;

  return await analyzeWithDeepSeek(prompt);
};
```

**Why Both Modes:**

| Visual Moodboard | Text-Based |
|------------------|------------|
| Discover preferences you can't articulate | Express preferences you already know |
| Learn through reaction | Create through description |
| Best for exploration | Best for intention |
| Requires image processing | Works with screen readers |

Both modes produce the same `StyleProfile` output format, so the rest of Scout works identically regardless of how the profile was created.

#### Other Accessibility Features

- **Reduced motion:** Disable swipe animations via `prefers-reduced-motion`
- **High contrast:** WCAG AAA contrast ratios for all text
- **Focus indicators:** Visible, high-contrast focus rings
- **Color blindness:** Don't rely on color alone - use icons + labels
- **Cognitive load:** Option to see fewer images per session (10/15/20)

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

### ✅ Resolved

1. **Image sourcing:** ~~Where do we get licensed fashion photos?~~
   - **RESOLVED:** Model Farm approach - contract ~12 diverse models, generate unlimited variations
   - See "Image Sources: The Model Farm Approach" section

2. **Abuse prevention:** ~~How do we prevent misuse of Custom Model?~~
   - **RESOLVED:** Petal moderation system (4 layers)
   - See "Content Moderation: Petal" section

3. **Hidden costs:** ~~Bandwidth, storage, API costs?~~
   - **RESOLVED:** Full cost analysis shows 92-94% margins
   - See "Cost Analysis" section

4. **Usage caps:** ~~How do we prevent abuse?~~
   - **RESOLVED:** Tiered limits with burst protection
   - See "Usage Caps & Fair Use Policy" section

5. **Accessibility:** ~~What about blind/low-vision users?~~
   - **RESOLVED:** Text-based "Describe Your Style" alternative
   - See "Accessibility" section

### 🔄 In Progress

1. **Try-on quality:** How good are current image editing models?
   - Need to build POC and evaluate FLUX Kontext
   - May need to limit to certain clothing types initially
   - **Action:** Build POC before committing to Custom Model feature

2. **Model contracting:** How do we find and contract diverse models?
   - Need to identify modeling agencies or individual models
   - Create consent documentation
   - **Action:** Legal review of model release agreement

### ❓ Still Open

1. **International privacy:** GDPR, CCPA compliance for deletion claims?
   - Need legal review of "immediate deletion" claims
   - Documentation of deletion process for audits
   - GDPR right to be forgotten implications

2. **Brand partnerships:** Should we pursue brand image licensing as backup?
   - Could supplement Model Farm with real brand photos
   - Some brands might pay US for featuring their items
   - Worth exploring but not blocking on

3. **User-generated content:** Future feature?
   - Users submitting their own outfit photos (with consent)
   - Community-driven moodboards
   - Moderation complexity increases significantly

---

## Implementation Phases

### Phase 0: POC & Validation
- [ ] **CRITICAL: Build try-on POC first** - verify quality before committing
- [ ] Test FLUX Kontext with diverse body types
- [ ] Evaluate output quality for different clothing types
- [ ] Document what works and what doesn't
- [ ] **Gate:** Only proceed to Phase 1 if POC shows acceptable quality

### Phase 1: Human Models MVP (Model Farm)
- [ ] Create model release agreement template (legal review)
- [ ] Identify and contract ~12 diverse models
- [ ] Photo shoot: 3 poses per model (standing, sitting, walking)
- [ ] Generate initial catalog (~500 fashion images)
- [ ] Implement catalog metadata in D1 + Vectorize
- [ ] Build reaction UI (swipe/tap + keyboard shortcuts)
- [ ] Implement text-based alternative ("Describe Your Style")
- [ ] Style analysis with DeepSeek via OpenRouter
- [ ] Style profile generation and display
- [ ] Search term output (take with you!)
- [ ] Integrate with Amber CDN for image delivery
- [ ] Free tier integration (Wanderer: 5 searches/month)
- [ ] Usage tracking and limits (D1 + Loom)

### Phase 2: Content Moderation (Petal)
- [ ] Integrate PhotoDNA for CSAM scanning
- [ ] Implement content classification (LlamaGuard or Together.ai moderation)
- [ ] Build sanity check layer (face detection, image type)
- [ ] Output verification for generated images
- [ ] Rate limiting and abuse detection
- [ ] Security logging (hashes only, no content)
- [ ] Connect to Thorn dashboard for unified moderation

### Phase 3: Custom Model (Premium)
- [ ] Photo upload flow with consent dialog
- [ ] Together.ai integration with ZDR
- [ ] MoodboardDO (Loom) for session coordination
- [ ] Try-on generation pipeline
- [ ] Output verification before delivery
- [ ] Session cleanup verification (images deleted)
- [ ] Premium tier integration (Seeker: 10/month, Pathfinder: 25/month)
- [ ] Exit confirmation showing deletion status

### Phase 4: Style Library & Evolution
- [ ] Multiple saved styles per user
- [ ] Style switching in search UI
- [ ] Evolution tracking (snapshots)
- [ ] AI commentary on growth (DeepSeek)
- [ ] Seasonal refresh prompts
- [ ] Nostalgic surfacing (2% of searches)
- [ ] Style export functionality

### Phase 5: Self-Hosted Migration
- [ ] RunPod/Chutes evaluation
- [ ] FLUX Kontext deployment with no-logging
- [ ] Custom endpoint with audit capability
- [ ] Migration from Together.ai
- [ ] Third-party security audit
- [ ] Privacy compliance documentation

---

## Success Metrics (Updated)

| Metric | Target | Why It Matters |
|--------|--------|----------------|
| **Moodboard completion rate** | >60% | Are people engaged enough to finish? |
| **Text-mode adoption** | >5% of moodboards | Accessibility feature is discoverable |
| **Free → Paid conversion** | >8% | Does moodboard drive subscriptions? |
| **Custom Model opt-in rate** | >25% of paid users | Is the try-on feature compelling? |
| **Style profile accuracy** | User satisfaction >4/5 | Do people feel "seen" by their profile? |
| **Session data deletion** | 100% verified | Non-negotiable privacy metric |
| **Moderation accuracy** | >99% bad content caught | Safety is paramount |
| **False positive rate** | <1% | Don't frustrate legitimate users |

---

*Last Updated: 2026-01-20*
*Author: Claude (Opus 4.5) + Autumn*
*Comprehensive Update: PR Feedback Integration*
