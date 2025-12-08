// Scout - Brave Search Integration
import type { BraveSearchResponse, BraveSearchResult, BraveImageResult } from './types';

const BRAVE_WEB_API_URL = 'https://api.search.brave.com/res/v1/web/search';
const BRAVE_IMAGE_API_URL = 'https://api.search.brave.com/res/v1/images/search';

export async function braveSearch(
	apiKey: string,
	query: string,
	count: number = 10
): Promise<BraveSearchResult[]> {
	const params = new URLSearchParams({
		q: query,
		count: count.toString(),
		safesearch: 'moderate',
		text_decorations: 'false'
	});

	const response = await fetch(`${BRAVE_WEB_API_URL}?${params}`, {
		headers: {
			Accept: 'application/json',
			'X-Subscription-Token': apiKey
		}
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Brave Search failed: ${response.status} - ${errorText}`);
	}

	const data: BraveSearchResponse = await response.json();

	return (
		data.web?.results.map((r) => ({
			title: r.title,
			url: r.url,
			description: r.description,
			age: r.age,
			thumbnail: r.thumbnail?.src
		})) ?? []
	);
}

// Search for product images
export async function braveImageSearch(
	apiKey: string,
	query: string,
	count: number = 5
): Promise<BraveImageResult[]> {
	const params = new URLSearchParams({
		q: query,
		count: count.toString(),
		safesearch: 'moderate'
	});

	const response = await fetch(`${BRAVE_IMAGE_API_URL}?${params}`, {
		headers: {
			Accept: 'application/json',
			'X-Subscription-Token': apiKey
		}
	});

	if (!response.ok) {
		// Image search might not be available on all plans, fail gracefully
		console.warn(`Brave Image Search failed: ${response.status}`);
		return [];
	}

	const data = await response.json();

	return (
		data.results?.map((r: any) => ({
			title: r.title || '',
			url: r.url || '',
			thumbnail: r.thumbnail?.src || r.properties?.url || '',
			source: r.source || ''
		})) ?? []
	);
}

// Major retailers for comprehensive searches
const MAJOR_RETAILERS = [
	'amazon.com',
	'walmart.com',
	'target.com',
	'bestbuy.com',
	'ebay.com',
	'costco.com',
	'kohls.com',
	'macys.com',
	'nordstrom.com',
	'wayfair.com',
	'homedepot.com',
	'lowes.com'
];

// Deal and coupon sites
const DEAL_SITES = [
	'slickdeals.net',
	'dealnews.com',
	'techbargains.com',
	'retailmenot.com'
];

// Build comprehensive search queries for thorough product discovery
export function buildSearchQueries(query: string, profile: {
	favorite_retailers?: string[];
	excluded_retailers?: string[];
	budget_max?: number;
}): string[] {
	const queries: string[] = [];
	const budgetStr = profile.budget_max ? ` under $${profile.budget_max / 100}` : '';
	const excludedSet = new Set(profile.excluded_retailers?.map(r => r.toLowerCase()) || []);

	// 1. Direct major retailer searches (most reliable for product pages)
	for (const retailer of MAJOR_RETAILERS) {
		if (!excludedSet.has(retailer)) {
			queries.push(`${query} site:${retailer}${budgetStr}`);
		}
	}

	// 2. User's favorite retailers (prioritized)
	if (profile.favorite_retailers?.length) {
		for (const retailer of profile.favorite_retailers) {
			const domain = retailer.toLowerCase().replace(/^www\./, '');
			if (!MAJOR_RETAILERS.includes(domain) && !excludedSet.has(domain)) {
				queries.push(`${query} site:${domain}${budgetStr}`);
			}
		}
	}

	// 3. Deal aggregator searches
	for (const dealSite of DEAL_SITES) {
		queries.push(`${query} site:${dealSite}`);
	}

	// 4. General shopping queries with price signals
	queries.push(`buy ${query}${budgetStr} price`);
	queries.push(`${query} deals discounts${budgetStr}`);
	queries.push(`${query} sale clearance${budgetStr}`);
	queries.push(`best ${query}${budgetStr} reviews`);

	// 5. Category-specific queries if we can detect product type
	const lowerQuery = query.toLowerCase();
	if (lowerQuery.includes('electronics') || lowerQuery.includes('laptop') || lowerQuery.includes('phone')) {
		queries.push(`${query} site:newegg.com`);
		queries.push(`${query} site:bhphotovideo.com`);
	}
	if (lowerQuery.includes('clothes') || lowerQuery.includes('shirt') || lowerQuery.includes('shoes') || lowerQuery.includes('dress')) {
		queries.push(`${query} site:asos.com`);
		queries.push(`${query} site:zappos.com`);
		queries.push(`${query} site:nike.com`);
	}
	if (lowerQuery.includes('furniture') || lowerQuery.includes('home') || lowerQuery.includes('decor')) {
		queries.push(`${query} site:ikea.com`);
		queries.push(`${query} site:overstock.com`);
	}

	return queries;
}

// Build product-specific URL for major retailers (fixes broken search page links)
export function buildProductUrl(retailer: string, productName: string, originalUrl: string): string {
	const domain = retailer.toLowerCase().replace(/^www\./, '');

	// If URL looks like a product page already, return it
	if (isProductPageUrl(originalUrl)) {
		return originalUrl;
	}

	// For Walmart, search pages don't work well - construct a better search URL
	if (domain.includes('walmart')) {
		const searchTerm = encodeURIComponent(productName.slice(0, 100));
		return `https://www.walmart.com/search?q=${searchTerm}`;
	}

	// For Amazon, ensure we have a product page or search
	if (domain.includes('amazon')) {
		if (!originalUrl.includes('/dp/') && !originalUrl.includes('/gp/product/')) {
			const searchTerm = encodeURIComponent(productName.slice(0, 100));
			return `https://www.amazon.com/s?k=${searchTerm}`;
		}
	}

	// For Target, construct search if not product page
	if (domain.includes('target')) {
		if (!originalUrl.includes('/p/') && !originalUrl.includes('/-/A-')) {
			const searchTerm = encodeURIComponent(productName.slice(0, 100));
			return `https://www.target.com/s?searchTerm=${searchTerm}`;
		}
	}

	return originalUrl;
}

// Check if URL looks like an actual product page vs search results
function isProductPageUrl(url: string): boolean {
	const productPatterns = [
		/amazon\.com\/.*\/dp\//,
		/amazon\.com\/gp\/product\//,
		/walmart\.com\/ip\//,
		/target\.com\/p\//,
		/target\.com\/.*\/-\/A-/,
		/bestbuy\.com\/site\/.*\/\d+\.p/,
		/ebay\.com\/itm\//,
		/etsy\.com\/listing\//,
		/newegg\.com\/.*\/p\//
	];

	return productPatterns.some(pattern => pattern.test(url));
}
