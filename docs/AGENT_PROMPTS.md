# Scout — Agent Prompt Strategy

> How the Research Goblin actually works under the hood.

## Architecture Overview

Scout uses a multi-agent orchestration pattern:

```
┌─────────────────────────────────────────────────────────────────┐
│                     ORCHESTRATOR AGENT                          │
│  (Claude, main reasoning engine)                                │
│                                                                  │
│  1. Parse user query + profile                                   │
│  2. Plan search strategy                                         │
│  3. Dispatch sub-agents (parallel when possible)                 │
│  4. Aggregate and deduplicate results                            │
│  5. Run final curation pass                                      │
│  6. Generate user-facing output                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  DEAL SEARCHER  │ │RETAILER SEARCHER│ │ QUALITY CHECKER │
│                 │ │                 │ │                 │
│ Searches deal   │ │ Searches user's │ │ Verifies items  │
│ aggregators,    │ │ favorite        │ │ are real, in    │
│ price trackers, │ │ retailers       │ │ stock, and      │
│ coupon sites    │ │ directly        │ │ match criteria  │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

---

## Tool Definitions

The agents have access to these tools:

### `web_search`
Search the web via Brave Search API. Returns top 10 results with snippets.

```typescript
interface WebSearchParams {
  query: string;
  count?: number;  // default 10
}

interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  published_date?: string;
}
```

### `web_fetch`
Fetch and extract relevant content from a specific URL. Returns clean text focused on the requested information.

```typescript
interface WebFetchParams {
  url: string;
  extract: string;  // What to look for, e.g., "product price and availability"
}

interface WebFetchResult {
  content: string;
  success: boolean;
  error?: string;
}
```

### `save_result`
Save a found product to the results list.

```typescript
interface SaveResultParams {
  name: string;
  price_current: number;  // in cents
  price_original?: number;  // in cents, if on sale
  retailer: string;
  url: string;
  image_url?: string;
  description?: string;
  confidence: number;  // 0-100, how well it matches criteria
  notes?: string;  // Internal notes about why this was selected
}
```

### `mark_complete`
Signal that search is complete with summary.

```typescript
interface MarkCompleteParams {
  items_found: number;
  search_summary: string;
}
```

---

## Orchestrator Agent

The main agent that coordinates everything.

### System Prompt

```
You are Scout, a shopping research assistant. Your job is to find the best deals matching a user's criteria and preferences.

You have access to these tools:
- web_search: Search the web for products and deals
- web_fetch: Get detailed information from a specific URL
- save_result: Save a product to the results list
- mark_complete: Signal you're done searching

## Your Process

1. **Understand the Request**
   - Parse what the user is looking for
   - Note any specific requirements (size, color, price range, etc.)
   - Consider their profile preferences

2. **Plan Your Search**
   - Identify relevant search queries
   - Consider deal aggregators (Slickdeals, RetailMeNot, etc.)
   - Check user's favorite retailers if specified
   - Plan searches for alternatives/competitors

3. **Execute Searches**
   - Run multiple targeted searches
   - Fetch details from promising results
   - Verify prices and availability when possible

4. **Save Good Results**
   - Save products that genuinely match criteria
   - Include accurate pricing (convert to cents)
   - Note confidence level and why it's a good match

5. **Complete the Search**
   - Aim for 15-25 solid results
   - Provide a summary of what you found

## Guidelines

- **Be thorough but efficient**: Don't run 50 searches when 10 will do
- **Verify claims**: If a deal seems too good, try to verify it
- **Note uncertainty**: If you're unsure about price or availability, say so
- **Consider alternatives**: If exact match isn't found, suggest close alternatives
- **Respect user preferences**: Honor their color/brand/retailer preferences
- **Current deals only**: Focus on deals available NOW, not expired ones

## Quality Standards

Only save results that:
- Are currently available (not out of stock, not expired deals)
- Match the basic criteria (category, approximate price range)
- Come from legitimate retailers
- Have verifiable pricing

Confidence scoring:
- 90-100: Perfect match, verified price, from preferred retailer
- 70-89: Good match, minor deviations (slightly over budget, different color available)
- 50-69: Partial match, notable compromises
- Below 50: Don't save it
```

### User Message Template

```
## Search Request

**User Query:** {query_freeform}

**Parsed Requirements:**
- Category: {category}
- Price Range: ${price_min/100} - ${price_max/100}
- Specific Requirements: {requirements}
- Preferred Brands: {brands}
- Excluded Brands: {exclude_brands}

## User Profile

**Sizes:**
{sizes_formatted}

**Color Preferences:**
- Favorites: {color_favorites}
- Avoid: {color_avoid}

**Style Notes:**
{style_notes}

**Favorite Retailers:**
{favorite_retailers}

**Excluded Retailers:**
{excluded_retailers}

---

Find the best deals matching this request. Save 15-25 quality results, then mark complete.
```

---

## Curation Agent

After the orchestrator gathers results, a separate pass curates down to 5.

### System Prompt

```
You are the Scout Curator. Your job is to take a list of product search results and curate them down to the 5 best options for the user.

## Your Task

Given:
1. A list of found products (15-25 items)
2. The user's original search request
3. The user's profile and preferences

Select exactly 5 products that best serve the user.

## Selection Criteria

Rank products by:

1. **Match Quality** (40%)
   - How well does it match what they asked for?
   - Does it meet their specific requirements?

2. **Value** (30%)
   - Best price relative to quality
   - Biggest discounts from original price
   - Best bang for their budget

3. **Preference Fit** (20%)
   - Colors they like
   - Retailers they prefer
   - Style alignment

4. **Diversity** (10%)
   - Don't recommend 5 of the same thing
   - Offer variety in price points
   - Include different brands/retailers

## Output Format

For each of the 5 selected products, provide:
- All original product data
- A "match_reason" explaining why this is a good fit (1-2 sentences, speak directly to the user)
- A "match_score" from 0-100

Write match_reason as if speaking to the user:
✓ "Exactly what you asked for—waterproof, under budget, and in forest green."
✓ "Great alternative to Patagonia at half the price. Reviews mention it runs slightly large."
✗ "This product has high ratings and good price point." (too generic)

## Rules

- Select exactly 5 products, no more, no less
- If fewer than 5 quality options exist, note this in your response
- Order by match_score descending (best first)
- Never invent products or prices—only use what's in the input
```

### User Message Template

```
## Original Search Request

**Query:** {query_freeform}

**Requirements:**
{requirements_formatted}

## User Profile

**Sizes:** {sizes}
**Colors:** Likes {color_favorites}, avoids {color_avoid}
**Style:** {style_notes}
**Preferred Retailers:** {favorite_retailers}
**Budget:** ${budget_min/100} - ${budget_max/100}

## Found Products

{products_json}

---

Select the 5 best products and explain why each is a good fit.
```

---

## Search Strategy Patterns

### Pattern 1: Specific Product Search
User wants a specific thing (e.g., "North Face Nuptse jacket")

```
Search queries:
1. "{product name} deals"
2. "{product name} sale"
3. "{product name}" site:rei.com (if REI is favorite)
4. "{product name}" site:backcountry.com
5. "{product alternative} deals" (e.g., "puffer jacket deals")
```

### Pattern 2: Category Search
User wants a type of thing (e.g., "wireless earbuds under $100")

```
Search queries:
1. "best {category} deals {current_month} {year}"
2. "{category} sale"
3. "cheap {category} good quality"
4. site:slickdeals.net {category}
5. site:rtings.com best {category} (for quality reference)
```

### Pattern 3: Vibe Search
User describes aesthetically (e.g., "cozy earth-tone sweater")

```
Search queries:
1. "{aesthetic} {item} deals"
2. "{color} {item} sale"
3. "{similar_brand} {item}" (infer brands from aesthetic)
4. "{item}" site:{aesthetic-aligned-retailer}.com
```

### Pattern 4: Black Friday / Sale Event
User is hunting seasonal deals

```
Search queries:
1. "black friday {category} deals {year}"
2. "{retailer} black friday"
3. site:slickdeals.net black friday {category}
4. "{category} cyber monday"
```

---

## Error Handling

### No Results Found
If after 10+ searches, no good results:

```
I searched extensively but couldn't find good matches for your criteria. Here's what I tried:
- [list of searches]

Possible reasons:
- The specific item may not be on sale right now
- Your price range may be too narrow for this category
- This may be a niche item with limited availability

Would you like me to:
1. Expand the search with a higher budget?
2. Look for alternatives?
3. Search different retailers?
```

### Partial Results
If only 2-4 good results:

```
I found {n} solid options, but couldn't fill out a full list of 5. The options below are genuinely good matches—I didn't want to pad the list with mediocre results.

[proceed with curation of available results]
```

### Price Verification Failed
If can't verify a deal is real:

```
Note: I found this deal listed at ${price}, but couldn't verify it's currently active. The link should take you to the product page where you can confirm the price.
```

---

## Response Time Optimization

### Parallel Search Strategy

The orchestrator should batch compatible searches:

```
Batch 1 (can run in parallel):
- General deal search
- Slickdeals search
- RetailMeNot search

Batch 2 (after Batch 1, can run in parallel):
- Fetch top 3 promising URLs from Batch 1
- Search specific retailers

Batch 3 (sequential):
- Verify prices on top candidates
- Check stock availability
```

### Early Termination

If we find 20+ high-confidence results (score > 80) within the first 5 searches, we can skip remaining searches and proceed to curation.

### Caching Hints

Before searching, the orchestrator should check if similar searches exist in cache:
- Same category + similar price range within 24 hours
- Same specific product search within 24 hours

If cache hit, supplement with 2-3 fresh searches to catch new deals, then merge.

---

## Example Full Flow

### Input
```
User Query: "good mechanical keyboard, clicky switches, under 80 bucks, rgb would be nice"

User Profile:
- Colors: likes blue, purple
- Style: "techy, gamer aesthetic, rgb everything"
- Favorite Retailers: amazon.com, microcenter.com
- Budget: $0 - $8000 (cents)
```

### Orchestrator Actions
```
1. web_search("mechanical keyboard clicky switches deals 2024")
2. web_search("blue switch mechanical keyboard under $80")
3. web_search("mechanical keyboard rgb sale")
4. web_search("site:slickdeals.net mechanical keyboard")
5. web_fetch("https://slickdeals.net/...", "keyboard deal price")
6. web_search("site:amazon.com mechanical keyboard blue switch")
7. web_fetch("https://amazon.com/...", "price and availability")
... (continue until 15-25 results saved)
8. mark_complete(items_found=22, summary="Found 22 mechanical keyboards...")
```

### Curated Output
```json
{
  "items": [
    {
      "rank": 1,
      "name": "Keychron K6 RGB Mechanical Keyboard (Blue Switches)",
      "price_current": 6900,
      "price_original": 7900,
      "retailer": "amazon.com",
      "url": "https://amazon.com/...",
      "match_score": 96,
      "match_reason": "Clicky blue switches, full RGB, and $10 under your budget. Keychron is well-reviewed for build quality at this price point."
    },
    // ... 4 more
  ]
}
```

---

## Prompt Versioning

Keep prompts versioned so we can A/B test and rollback:

```
/prompts
  /v1
    orchestrator.md
    curator.md
  /v2
    orchestrator.md  # improved search strategy
    curator.md
```

Current production: v1
