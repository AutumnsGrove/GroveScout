// Scout - Orchestrator Agent
// Main agent that coordinates search, aggregation, and curation

import Anthropic from '@anthropic-ai/sdk';
import { braveSearch, buildSearchQueries } from './brave';
import type { SavedProduct, SearchContext } from './types';

const ORCHESTRATOR_SYSTEM_PROMPT = `You are Scout, a shopping research assistant. Your job is to find the best deals matching a user's criteria and preferences.

You analyze search results and extract product information. For each promising product you find, output a JSON object with this structure:
{
  "name": "Product Name",
  "price_current": 4999,  // price in CENTS
  "price_original": 7999, // original price in CENTS if on sale, omit if not
  "retailer": "amazon.com",
  "url": "https://...",
  "description": "Brief description",
  "confidence": 85  // 0-100 how well it matches the criteria
}

Rules:
- Only include products that genuinely match the search criteria
- Price must be in CENTS (e.g., $49.99 = 4999)
- Confidence should reflect how well the product matches (price range, requirements, style)
- Skip products that are out of stock, expired deals, or from sketchy retailers
- Aim for 15-25 quality results`;

const CURATOR_SYSTEM_PROMPT = `You are the Scout Curator. Your job is to take a list of products and select the 5 best options for the user.

Selection criteria:
1. Match Quality (40%) - How well does it match what they asked for?
2. Value (30%) - Best price relative to quality, biggest discounts
3. Preference Fit (20%) - Colors they like, retailers they prefer
4. Diversity (10%) - Offer variety, don't recommend 5 of the same thing

For each of the 5 selected products, add:
- "match_score": 0-100 score
- "match_reason": 1-2 sentences explaining why this is good for the user (speak directly to them)

Output exactly 5 products in JSON format, ordered by match_score descending.`;

export async function runSearchOrchestrator(
	anthropicApiKey: string,
	braveApiKey: string,
	context: SearchContext
): Promise<{ raw: SavedProduct[]; curated: SavedProduct[] }> {
	const anthropic = new Anthropic({ apiKey: anthropicApiKey });

	// Build search queries
	const queries = buildSearchQueries(context.query, {
		favorite_retailers: context.profile.favorite_retailers,
		budget_max: context.profile.budget_max
	});

	// Execute searches in parallel (batch of 3)
	const allResults: string[] = [];
	for (let i = 0; i < queries.length; i += 3) {
		const batch = queries.slice(i, i + 3);
		const results = await Promise.all(
			batch.map(async (q) => {
				try {
					const searchResults = await braveSearch(braveApiKey, q, 8);
					return searchResults
						.map((r) => `Title: ${r.title}\nURL: ${r.url}\nSnippet: ${r.description}`)
						.join('\n\n');
				} catch (err) {
					console.error(`Search failed for "${q}":`, err);
					return '';
				}
			})
		);
		allResults.push(...results.filter(Boolean));
	}

	// Build context for Claude
	const searchResultsText = allResults.join('\n\n---\n\n');

	const profileContext = buildProfileContext(context.profile);

	// Run orchestrator to extract products
	const orchestratorResponse = await anthropic.messages.create({
		model: 'claude-sonnet-4-20250514',
		max_tokens: 4000,
		system: ORCHESTRATOR_SYSTEM_PROMPT,
		messages: [
			{
				role: 'user',
				content: `## Search Request
**Query:** ${context.query}

${profileContext}

## Search Results
${searchResultsText}

---

Extract all products that match the criteria. Output each product as a JSON object on its own line. Only output JSON, no explanations.`
			}
		]
	});

	// Parse products from response
	const rawProducts = parseProductsFromResponse(orchestratorResponse);

	if (rawProducts.length === 0) {
		return { raw: [], curated: [] };
	}

	// Run curator to select top 5
	const curatorResponse = await anthropic.messages.create({
		model: 'claude-sonnet-4-20250514',
		max_tokens: 2000,
		system: CURATOR_SYSTEM_PROMPT,
		messages: [
			{
				role: 'user',
				content: `## Original Request
**Query:** ${context.query}

${profileContext}

## Products Found (${rawProducts.length} items)
${JSON.stringify(rawProducts, null, 2)}

---

Select the 5 best products and add match_score and match_reason to each. Output as a JSON array.`
			}
		]
	});

	const curatedProducts = parseCuratedProducts(curatorResponse);

	return {
		raw: rawProducts,
		curated: curatedProducts
	};
}

function buildProfileContext(profile: SearchContext['profile']): string {
	const parts: string[] = ['## User Profile'];

	if (profile.sizes && Object.keys(profile.sizes).length > 0) {
		parts.push(`**Sizes:** ${JSON.stringify(profile.sizes)}`);
	}

	if (profile.color_favorites?.length) {
		parts.push(`**Favorite Colors:** ${profile.color_favorites.join(', ')}`);
	}

	if (profile.color_avoid?.length) {
		parts.push(`**Colors to Avoid:** ${profile.color_avoid.join(', ')}`);
	}

	if (profile.budget_min || profile.budget_max) {
		const min = profile.budget_min ? `$${profile.budget_min / 100}` : '$0';
		const max = profile.budget_max ? `$${profile.budget_max / 100}` : 'any';
		parts.push(`**Budget:** ${min} - ${max}`);
	}

	if (profile.favorite_retailers?.length) {
		parts.push(`**Preferred Retailers:** ${profile.favorite_retailers.join(', ')}`);
	}

	if (profile.excluded_retailers?.length) {
		parts.push(`**Excluded Retailers:** ${profile.excluded_retailers.join(', ')}`);
	}

	if (profile.style_notes) {
		parts.push(`**Style Notes:** ${profile.style_notes}`);
	}

	return parts.join('\n');
}

function parseProductsFromResponse(response: Anthropic.Message): SavedProduct[] {
	const products: SavedProduct[] = [];

	const content = response.content[0];
	if (content.type !== 'text') return products;

	const text = content.text;

	// Try to find JSON objects in the response
	const jsonPattern = /\{[^{}]*"name"[^{}]*\}/g;
	const matches = text.match(jsonPattern);

	if (matches) {
		for (const match of matches) {
			try {
				const product = JSON.parse(match);
				if (product.name && product.price_current && product.url && product.retailer) {
					products.push({
						name: product.name,
						price_current: product.price_current,
						price_original: product.price_original,
						retailer: product.retailer,
						url: product.url,
						image_url: product.image_url,
						description: product.description,
						confidence: product.confidence || 70,
						notes: product.notes
					});
				}
			} catch {
				// Skip invalid JSON
			}
		}
	}

	return products;
}

function parseCuratedProducts(response: Anthropic.Message): SavedProduct[] {
	const content = response.content[0];
	if (content.type !== 'text') return [];

	const text = content.text;

	// Try to find JSON array
	const arrayMatch = text.match(/\[[\s\S]*\]/);
	if (arrayMatch) {
		try {
			const products = JSON.parse(arrayMatch[0]);
			if (Array.isArray(products)) {
				return products.slice(0, 5).map((p, i) => ({
					...p,
					rank: i + 1
				}));
			}
		} catch {
			// Fall through to individual parsing
		}
	}

	// Fall back to parsing individual objects
	return parseProductsFromResponse(response).slice(0, 5);
}
