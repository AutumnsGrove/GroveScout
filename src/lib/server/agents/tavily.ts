// Scout - Tavily Search Integration
// Tavily provides AI-optimized web search with better product extraction

import { z } from 'zod';

// Zod schema for runtime validation of Tavily API responses
const TavilySearchResultSchema = z.object({
	title: z.string(),
	url: z.string().url(),
	content: z.string(),
	score: z.number().min(0).max(1),
	published_date: z.string().optional()
});

const TavilySearchResponseSchema = z.object({
	results: z.array(TavilySearchResultSchema),
	query: z.string(),
	response_time: z.number()
});

// Export types derived from Zod schemas for type safety
export type TavilySearchResult = z.infer<typeof TavilySearchResultSchema>;
export type TavilySearchResponse = z.infer<typeof TavilySearchResponseSchema>;

const TAVILY_API_URL = 'https://api.tavily.com/search';

/**
 * Search using Tavily API
 * Tavily is optimized for AI agents and returns cleaner results than traditional search
 */
export async function tavilySearch(
	apiKey: string,
	query: string,
	options: {
		searchDepth?: 'basic' | 'advanced';
		maxResults?: number;
		includeAnswer?: boolean;
		includeDomains?: string[];
		excludeDomains?: string[];
	} = {}
): Promise<TavilySearchResult[]> {
	const {
		searchDepth = 'basic',
		maxResults = 10,
		includeAnswer = false,
		includeDomains = [],
		excludeDomains = []
	} = options;

	const body: Record<string, unknown> = {
		api_key: apiKey,
		query,
		search_depth: searchDepth,
		max_results: maxResults,
		include_answer: includeAnswer,
	};

	if (includeDomains.length > 0) {
		body.include_domains = includeDomains;
	}

	if (excludeDomains.length > 0) {
		body.exclude_domains = excludeDomains;
	}

	const response = await fetch(TAVILY_API_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(body),
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Tavily Search failed: ${response.status} - ${errorText}`);
	}

	const json = await response.json();

	// Validate response with Zod schema
	const parseResult = TavilySearchResponseSchema.safeParse(json);
	if (!parseResult.success) {
		console.error('[Tavily] Invalid API response:', parseResult.error.format());
		// Return empty results rather than crash on unexpected format
		return [];
	}

	return parseResult.data.results;
}

/**
 * Build Tavily search queries optimized for product discovery
 */
export function buildTavilyQueries(query: string, profile: {
	favorite_retailers?: string[];
	budget_max?: number;
}): string[] {
	const queries: string[] = [];
	const budgetStr = profile.budget_max ? ` under $${profile.budget_max / 100}` : '';

	// Direct product search
	queries.push(`buy ${query}${budgetStr}`);

	// Deal-focused search
	queries.push(`${query} best deals discounts${budgetStr}`);

	// Review-based search (helps find quality products)
	queries.push(`best ${query} reviews${budgetStr}`);

	return queries;
}

/**
 * Search products with Tavily using retailer-focused domain filtering
 */
export async function tavilyProductSearch(
	apiKey: string,
	query: string,
	options: {
		favoriteRetailers?: string[];
		excludedRetailers?: string[];
		budget_max?: number;
	} = {}
): Promise<TavilySearchResult[]> {
	const allResults: TavilySearchResult[] = [];

	// Major e-commerce domains for product searches
	const retailerDomains = [
		'amazon.com',
		'walmart.com',
		'target.com',
		'bestbuy.com',
		'ebay.com',
		'costco.com',
		'kohls.com',
		'macys.com',
		'nordstrom.com',
		...(options.favoriteRetailers || [])
	].filter(d => !options.excludedRetailers?.includes(d));

	const queries = buildTavilyQueries(query, {
		favorite_retailers: options.favoriteRetailers,
		budget_max: options.budget_max
	});

	// Run searches in parallel
	const searchPromises = queries.map(q =>
		tavilySearch(apiKey, q, {
			searchDepth: 'advanced',
			maxResults: 10,
			includeDomains: retailerDomains,
			excludeDomains: options.excludedRetailers
		}).catch(err => {
			console.error(`Tavily search failed for "${q}":`, err);
			return [];
		})
	);

	const results = await Promise.all(searchPromises);

	for (const batch of results) {
		allResults.push(...batch);
	}

	// Deduplicate by URL
	const seen = new Set<string>();
	const deduplicated = allResults.filter(r => {
		if (seen.has(r.url)) return false;
		seen.add(r.url);
		return true;
	});

	return deduplicated;
}
