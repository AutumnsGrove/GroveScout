// Scout - Orchestrator Agent
// Main agent that coordinates search, aggregation, and curation

import Anthropic from '@anthropic-ai/sdk';
import { braveSearch, buildSearchQueries } from './brave';
import type { SavedProduct, SearchContext } from './types';
import { AGENT_CONFIG } from './config';

// Known safe retail domains (partial list - expand as needed)
const KNOWN_SAFE_DOMAINS = new Set([
	'amazon.com', 'www.amazon.com',
	'ebay.com', 'www.ebay.com',
	'walmart.com', 'www.walmart.com',
	'target.com', 'www.target.com',
	'bestbuy.com', 'www.bestbuy.com',
	'costco.com', 'www.costco.com',
	'nordstrom.com', 'www.nordstrom.com',
	'macys.com', 'www.macys.com',
	'kohls.com', 'www.kohls.com',
	'homedepot.com', 'www.homedepot.com',
	'lowes.com', 'www.lowes.com',
	'etsy.com', 'www.etsy.com',
	'wayfair.com', 'www.wayfair.com',
	'zappos.com', 'www.zappos.com',
	'nike.com', 'www.nike.com',
	'adidas.com', 'www.adidas.com',
	'gap.com', 'www.gap.com',
	'oldnavy.com', 'www.oldnavy.com',
	'hm.com', 'www.hm.com',
	'zara.com', 'www.zara.com',
	'asos.com', 'www.asos.com',
	'shein.com', 'www.shein.com',
	'aliexpress.com', 'www.aliexpress.com',
	'newegg.com', 'www.newegg.com',
	'bhphotovideo.com', 'www.bhphotovideo.com',
	'overstock.com', 'www.overstock.com',
	'chewy.com', 'www.chewy.com',
	'sephora.com', 'www.sephora.com',
	'ulta.com', 'www.ulta.com'
]);

/**
 * Validate a product URL for safety
 * Returns sanitized URL or null if unsafe
 */
function validateProductUrl(urlString: string | undefined): string | null {
	if (!urlString || typeof urlString !== 'string') {
		return null;
	}

	try {
		const url = new URL(urlString);

		// Only allow HTTPS URLs
		if (url.protocol !== 'https:') {
			return null;
		}

		// Block URLs with credentials
		if (url.username || url.password) {
			return null;
		}

		// Block localhost and private IPs
		const hostname = url.hostname.toLowerCase();
		if (
			hostname === 'localhost' ||
			hostname.startsWith('127.') ||
			hostname.startsWith('192.168.') ||
			hostname.startsWith('10.') ||
			hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)
		) {
			return null;
		}

		// Return sanitized URL (removes any fragment)
		return `${url.protocol}//${url.host}${url.pathname}${url.search}`;
	} catch {
		return null;
	}
}

/**
 * Validate image URL with stricter checks
 */
function validateImageUrl(urlString: string | undefined): string | null {
	if (!urlString || typeof urlString !== 'string') {
		return null;
	}

	try {
		const url = new URL(urlString);

		// Only allow HTTPS
		if (url.protocol !== 'https:') {
			return null;
		}

		// Check for common image extensions or CDN patterns
		const pathname = url.pathname.toLowerCase();
		const hasImageExtension = /\.(jpg|jpeg|png|gif|webp|avif|svg)$/i.test(pathname);
		const isCommonCDN = /\.(cloudfront\.net|cloudinary\.com|imgix\.net|akamaized\.net|shopify\.com)$/i.test(url.hostname);

		if (!hasImageExtension && !isCommonCDN) {
			// Allow known retailer domains even without extension
			if (!KNOWN_SAFE_DOMAINS.has(url.hostname.replace(/^www\./, ''))) {
				return null;
			}
		}

		return urlString;
	} catch {
		return null;
	}
}

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
					// Sanitized error logging - don't expose query details or full error
					const errorMessage = err instanceof Error ? err.message : 'Unknown error';
					console.error(`Search batch failed: ${errorMessage.slice(0, 100)}`);
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
		model: AGENT_CONFIG.model.primary,
		max_tokens: AGENT_CONFIG.model.orchestratorMaxTokens,
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

	// Track token usage from orchestrator call
	const orchestratorUsage = orchestratorResponse.usage;

	// Parse products from response
	const rawProducts = parseProductsFromResponse(orchestratorResponse);

	if (rawProducts.length === 0) {
		return {
			raw: [],
			curated: [],
			usage: {
				input_tokens: orchestratorUsage.input_tokens,
				output_tokens: orchestratorUsage.output_tokens,
				api_calls: 1
			}
		};
	}

	// Run curator to select top 5
	const curatorResponse = await anthropic.messages.create({
		model: AGENT_CONFIG.model.primary,
		max_tokens: AGENT_CONFIG.model.curatorMaxTokens,
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

	// Track token usage from curator call
	const curatorUsage = curatorResponse.usage;

	const curatedProducts = parseCuratedProducts(curatorResponse);

	// Calculate total token usage across both API calls
	const totalUsage = {
		input_tokens: orchestratorUsage.input_tokens + curatorUsage.input_tokens,
		output_tokens: orchestratorUsage.output_tokens + curatorUsage.output_tokens,
		api_calls: 2
	};

	return {
		raw: rawProducts,
		curated: curatedProducts,
		usage: totalUsage
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

				// Validate required fields
				if (!product.name || !product.price_current || !product.url || !product.retailer) {
					continue;
				}

				// SECURITY: Validate and sanitize URLs
				const validatedUrl = validateProductUrl(product.url);
				if (!validatedUrl) {
					// Skip products with invalid/unsafe URLs
					continue;
				}

				// Validate image URL if provided
				const validatedImageUrl = product.image_url
					? validateImageUrl(product.image_url)
					: undefined;

				// Sanitize string fields to prevent XSS (even though Svelte escapes)
				const sanitizedName = String(product.name).slice(0, 500);
				const sanitizedRetailer = String(product.retailer).slice(0, 100);
				const sanitizedDescription = product.description
					? String(product.description).slice(0, 2000)
					: undefined;

				products.push({
					name: sanitizedName,
					price_current: Math.abs(Number(product.price_current)) || 0,
					price_original: product.price_original
						? Math.abs(Number(product.price_original))
						: undefined,
					retailer: sanitizedRetailer,
					url: validatedUrl,
					image_url: validatedImageUrl,
					description: sanitizedDescription,
					confidence: Math.min(100, Math.max(0, Number(product.confidence) || 70)),
					notes: product.notes ? String(product.notes).slice(0, 500) : undefined
				});
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
