// Scout - Orchestrator Agent
// Main agent that coordinates search, aggregation, and curation

import Anthropic from '@anthropic-ai/sdk';
import { braveSearch, braveImageSearch, buildSearchQueries, buildProductUrl } from './brave';
import { tavilyProductSearch, type TavilySearchResult } from './tavily';
import type { SavedProduct, SearchContext, OrchestratorResult, BraveImageResult } from './types';
import { AGENT_CONFIG } from './config';
import { buildProfileContext } from './utils';

// Search provider type - allows switching between Brave and Tavily
export type SearchProvider = 'brave' | 'tavily';

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

const ORCHESTRATOR_SYSTEM_PROMPT = `You are Scout, a comprehensive shopping research assistant. Your mission is to find AS MANY relevant products as possible matching the user's criteria.

IMPORTANT: Be THOROUGH. Extract EVERY product that could match - we want 20-40 products minimum. Don't be selective at this stage - that's the curator's job.

For each product found, output a JSON object:
{
  "name": "Full Product Name with Brand",
  "price_current": 4999,
  "price_original": 7999,
  "retailer": "amazon.com",
  "url": "https://...",
  "description": "Brief description of features",
  "confidence": 85
}

EXTRACTION RULES:
1. **Extract EVERY product** from the search results that could match - err on the side of inclusion
2. **URL**: Copy the EXACT URL from search results - never invent URLs
3. **Price**: Convert to CENTS (e.g., $49.99 = 4999). If you see "$49.99" or "49.99", output 4999
4. **If price is missing**: Estimate based on product type, set confidence lower (50-60)
5. **Retailer**: Extract domain from URL (e.g., "amazon.com", "walmart.com")
6. **Confidence scoring**:
   - 90-100: Perfect match, in budget, from preferred retailer
   - 70-89: Good match, reasonable price
   - 50-69: Partial match or missing info
   - Below 50: Skip this product

OUTPUT FORMAT: One JSON object per line, no markdown formatting, no explanations.`;

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
	context: SearchContext,
	options: {
		searchProvider?: SearchProvider;
		tavilyApiKey?: string;
	} = {}
): Promise<OrchestratorResult> {
	const anthropic = new Anthropic({ apiKey: anthropicApiKey });
	const searchProvider = options.searchProvider || 'brave';

	// Execute searches based on provider
	const allResults: string[] = [];
	const imageResults: BraveImageResult[] = [];

	console.log(`[Orchestrator] Using search provider: ${searchProvider}`);

	if (searchProvider === 'tavily' && options.tavilyApiKey) {
		// Use Tavily for search
		const tavilyResults = await runTavilySearch(
			options.tavilyApiKey,
			context.query,
			context.profile
		);
		allResults.push(...tavilyResults);

		// Still use Brave for image search (Tavily doesn't have image search)
		try {
			const images = await braveImageSearch(braveApiKey, `${context.query} product`, 10);
			imageResults.push(...images);
		} catch {
			// Image search is optional
		}
	} else {
		// Use Brave for search (default)
		const braveResults = await runBraveSearch(braveApiKey, context);
		allResults.push(...braveResults.textResults);
		imageResults.push(...braveResults.imageResults);
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

## Search Results (${allResults.length} sources)
${searchResultsText}

---

Extract ALL products that match or could match the criteria. Be thorough - extract 20-40 products. Output each product as a JSON object on its own line.`
			}
		]
	});

	const orchestratorUsage = orchestratorResponse.usage;

	// Parse products from response
	let rawProducts = parseProductsFromResponse(orchestratorResponse);

	// Post-process: fix URLs and try to add images
	rawProducts = rawProducts.map(product => {
		// Fix retailer URLs that might be search pages
		const fixedUrl = buildProductUrl(product.retailer, product.name, product.url);

		// Try to find a matching image from our image search results
		let imageUrl = product.image_url;
		if (!imageUrl && imageResults.length > 0) {
			const matchingImage = findMatchingImage(product.name, imageResults);
			if (matchingImage) {
				imageUrl = validateImageUrl(matchingImage);
			}
		}

		return {
			...product,
			url: fixedUrl,
			image_url: imageUrl
		};
	});

	if (rawProducts.length === 0) {
		return {
			raw: [],
			curated: [],
			usage: {
				input_tokens: orchestratorUsage.input_tokens,
				output_tokens: orchestratorUsage.output_tokens,
				api_calls: 2 // Count image search as well
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

Select the 5 BEST products. Add match_score (0-100) and match_reason (1-2 sentences, speak directly to user) to each. Output as a JSON array.`
			}
		]
	});

	const curatorUsage = curatorResponse.usage;
	const curatedProducts = parseCuratedProducts(curatorResponse);

	// Calculate total token usage
	const totalUsage = {
		input_tokens: orchestratorUsage.input_tokens + curatorUsage.input_tokens,
		output_tokens: orchestratorUsage.output_tokens + curatorUsage.output_tokens,
		api_calls: 3 // web search batch + image search + 2 Claude calls
	};

	return {
		raw: rawProducts,
		curated: curatedProducts,
		usage: totalUsage
	};
}

/**
 * Run Brave Search with comprehensive queries
 */
async function runBraveSearch(
	braveApiKey: string,
	context: SearchContext
): Promise<{ textResults: string[]; imageResults: BraveImageResult[] }> {
	const textResults: string[] = [];
	const imageResults: BraveImageResult[] = [];

	// Build comprehensive search queries
	const queries = buildSearchQueries(context.query, {
		favorite_retailers: context.profile.favorite_retailers,
		excluded_retailers: context.profile.excluded_retailers,
		budget_max: context.profile.budget_max
	});

	// Run web searches in batches using Promise.allSettled for resilience
	const batchSize = AGENT_CONFIG.search?.searchBatchSize || 5;
	for (let i = 0; i < queries.length; i += batchSize) {
		const batch = queries.slice(i, i + batchSize);
		const settledResults = await Promise.allSettled(
			batch.map(async (q) => {
				const searchResults = await braveSearch(braveApiKey, q, 12);
				return searchResults
					.map((r) => {
						let entry = `Title: ${r.title}\nURL: ${r.url}\nSnippet: ${r.description}`;
						if (r.thumbnail) {
							entry += `\nThumbnail: ${r.thumbnail}`;
						}
						return entry;
					})
					.join('\n\n');
			})
		);

		// Extract successful results, log failures
		for (const result of settledResults) {
			if (result.status === 'fulfilled' && result.value) {
				textResults.push(result.value);
			} else if (result.status === 'rejected') {
				const errorMessage = result.reason instanceof Error ? result.reason.message : 'Unknown error';
				console.error(`Brave search batch failed: ${errorMessage.slice(0, 100)}`);
			}
		}
	}

	// Run image search
	try {
		const imageCount = AGENT_CONFIG.search?.imageSearchCount || 10;
		const images = await braveImageSearch(braveApiKey, `${context.query} product`, imageCount);
		imageResults.push(...images);
	} catch (err) {
		// Image search is optional but log for debugging
		const errorMessage = err instanceof Error ? err.message : 'Unknown error';
		console.warn(`[Orchestrator] Image search failed (non-fatal): ${errorMessage.slice(0, 100)}`);
	}

	return { textResults, imageResults };
}

/**
 * Run Tavily Search with product-focused queries
 */
async function runTavilySearch(
	tavilyApiKey: string,
	query: string,
	profile: SearchContext['profile']
): Promise<string[]> {
	try {
		const results = await tavilyProductSearch(tavilyApiKey, query, {
			favoriteRetailers: profile.favorite_retailers,
			excludedRetailers: profile.excluded_retailers,
			budget_max: profile.budget_max
		});

		// Format Tavily results similar to Brave results for the orchestrator
		return results.map((r: TavilySearchResult) => {
			return `Title: ${r.title}\nURL: ${r.url}\nSnippet: ${r.content}\nRelevance: ${r.score}`;
		}).map(entry => entry);
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : 'Unknown error';
		console.error(`Tavily search failed: ${errorMessage.slice(0, 100)}`);
		return [];
	}
}

// Find a matching image from image search results based on product name
function findMatchingImage(productName: string, images: BraveImageResult[]): string | null {
	const nameLower = productName.toLowerCase();
	const nameWords = nameLower.split(/\s+/).filter(w => w.length > 3);

	for (const image of images) {
		const titleLower = image.title.toLowerCase();
		// Check if at least 2 significant words match
		const matches = nameWords.filter(word => titleLower.includes(word));
		if (matches.length >= 2) {
			return image.thumbnail || image.url;
		}
	}

	return null;
}

// buildProfileContext is imported from ./utils

function parseProductsFromResponse(response: Anthropic.Message): SavedProduct[] {
	const products: SavedProduct[] = [];

	const content = response.content[0];
	if (content.type !== 'text') return products;

	const text = content.text;

	// Multiple parsing strategies for robustness

	// Strategy 1: Try to find a JSON array first
	const arrayMatch = text.match(/\[[\s\S]*?\]/);
	if (arrayMatch) {
		try {
			const parsed = JSON.parse(arrayMatch[0]);
			if (Array.isArray(parsed)) {
				for (const product of parsed) {
					const validated = validateAndSanitizeProduct(product);
					if (validated) products.push(validated);
				}
				if (products.length > 0) return products;
			}
		} catch (err) {
			// Continue to other strategies, but log for debugging
			console.debug(`[Orchestrator] JSON array parse failed, trying other strategies: ${err instanceof Error ? err.message : 'Unknown'}`);
		}
	}

	// Strategy 2: Parse line by line (most reliable for streaming-style output)
	const lines = text.split('\n');
	for (const line of lines) {
		const trimmed = line.trim();
		if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
			try {
				const product = JSON.parse(trimmed);
				const validated = validateAndSanitizeProduct(product);
				if (validated) products.push(validated);
			} catch {
				// Not valid JSON, continue
			}
		}
	}

	if (products.length > 0) return products;

	// Strategy 3: Regex to find JSON objects (handles nested braces better)
	const jsonObjects: string[] = [];
	let depth = 0;
	let start = -1;

	for (let i = 0; i < text.length; i++) {
		if (text[i] === '{') {
			if (depth === 0) start = i;
			depth++;
		} else if (text[i] === '}') {
			depth--;
			if (depth === 0 && start !== -1) {
				jsonObjects.push(text.slice(start, i + 1));
				start = -1;
			}
		}
	}

	let parseFailures = 0;
	for (const jsonStr of jsonObjects) {
		try {
			const product = JSON.parse(jsonStr);
			const validated = validateAndSanitizeProduct(product);
			if (validated) products.push(validated);
		} catch {
			parseFailures++;
		}
	}

	if (parseFailures > 0) {
		console.debug(`[Orchestrator] Strategy 3: ${parseFailures} JSON objects failed to parse`);
	}

	if (products.length === 0) {
		console.warn(`[Orchestrator] No products parsed from Claude response. Response preview: ${text.slice(0, 200)}...`);
	}

	return products;
}

// Validate and sanitize a product object
function validateAndSanitizeProduct(product: any): SavedProduct | null {
	// Must have name and either URL or retailer
	if (!product.name) return null;

	// Price can be missing (we'll estimate or mark low confidence)
	const priceValue = product.price_current || product.price || product.priceInCents || 0;
	let priceCurrent = 0;

	if (typeof priceValue === 'string') {
		// Handle string prices like "$49.99" or "49.99"
		const cleaned = priceValue.replace(/[$,]/g, '');
		const parsed = parseFloat(cleaned);
		if (!isNaN(parsed)) {
			// If it looks like dollars (has decimal or is small), convert to cents
			priceCurrent = parsed < 1000 ? Math.round(parsed * 100) : Math.round(parsed);
		}
	} else if (typeof priceValue === 'number') {
		// If price is less than 1000, assume it's dollars and convert
		priceCurrent = priceValue < 1000 ? Math.round(priceValue * 100) : Math.round(priceValue);
	}

	// URL validation
	const url = product.url || product.link || product.productUrl;
	const validatedUrl = validateProductUrl(url);
	if (!validatedUrl) return null;

	// Extract retailer from URL if not provided
	let retailer = product.retailer || product.store || product.merchant || '';
	if (!retailer && validatedUrl) {
		try {
			const urlObj = new URL(validatedUrl);
			retailer = urlObj.hostname.replace(/^www\./, '');
		} catch {
			retailer = 'unknown';
		}
	}

	// Validate image URL if provided
	const imageUrl = product.image_url || product.imageUrl || product.image || product.thumbnail;
	const validatedImageUrl = imageUrl ? validateImageUrl(imageUrl) : undefined;

	// Sanitize string fields
	const sanitizedName = String(product.name).slice(0, 500);
	const sanitizedRetailer = String(retailer).slice(0, 100);
	const sanitizedDescription = product.description
		? String(product.description).slice(0, 2000)
		: undefined;

	// Handle original price
	let priceOriginal: number | undefined;
	const origValue = product.price_original || product.originalPrice || product.wasPrice;
	if (origValue) {
		if (typeof origValue === 'string') {
			const cleaned = origValue.replace(/[$,]/g, '');
			const parsed = parseFloat(cleaned);
			if (!isNaN(parsed)) {
				priceOriginal = parsed < 1000 ? Math.round(parsed * 100) : Math.round(parsed);
			}
		} else if (typeof origValue === 'number') {
			priceOriginal = origValue < 1000 ? Math.round(origValue * 100) : Math.round(origValue);
		}
	}

	return {
		name: sanitizedName,
		price_current: Math.abs(priceCurrent),
		price_original: priceOriginal ? Math.abs(priceOriginal) : undefined,
		retailer: sanitizedRetailer,
		url: validatedUrl,
		image_url: validatedImageUrl,
		description: sanitizedDescription,
		confidence: Math.min(100, Math.max(0, Number(product.confidence) || (priceCurrent > 0 ? 70 : 50))),
		notes: product.notes ? String(product.notes).slice(0, 500) : undefined
	};
}

function parseCuratedProducts(response: Anthropic.Message): SavedProduct[] {
	const content = response.content[0];
	if (content.type !== 'text') {
		console.warn('[Orchestrator] Curator response was not text type');
		return [];
	}

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
		} catch (err) {
			// Fall through to individual parsing, but log for debugging
			console.debug(`[Orchestrator] Curator JSON array parse failed: ${err instanceof Error ? err.message : 'Unknown'}`);
		}
	}

	// Fall back to parsing individual objects
	const fallbackProducts = parseProductsFromResponse(response).slice(0, 5);
	if (fallbackProducts.length === 0) {
		console.warn(`[Orchestrator] No curated products parsed. Response preview: ${text.slice(0, 200)}...`);
	}
	return fallbackProducts;
}
