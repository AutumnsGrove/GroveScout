// Scout - Brave Search Integration
import type { BraveSearchResponse, BraveSearchResult } from './types';

const BRAVE_API_URL = 'https://api.search.brave.com/res/v1/web/search';

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

	const response = await fetch(`${BRAVE_API_URL}?${params}`, {
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
			age: r.age
		})) ?? []
	);
}

// Build search queries based on the user's intent
export function buildSearchQueries(query: string, profile: {
	favorite_retailers?: string[];
	budget_max?: number;
}): string[] {
	const queries: string[] = [];
	const budgetStr = profile.budget_max ? ` under $${profile.budget_max / 100}` : '';

	// Main deal search
	queries.push(`${query} deals 2024`);
	queries.push(`${query} sale${budgetStr}`);
	queries.push(`best ${query} deals`);

	// Deal aggregator searches
	queries.push(`site:slickdeals.net ${query}`);
	queries.push(`${query} coupon discount`);

	// Retailer-specific searches
	if (profile.favorite_retailers?.length) {
		for (const retailer of profile.favorite_retailers.slice(0, 2)) {
			queries.push(`${query} site:${retailer}`);
		}
	}

	return queries;
}
