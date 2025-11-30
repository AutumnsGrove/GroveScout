// Scout - Search Result Caching
// Cache search results in KV for 24 hours

const CACHE_PREFIX = 'searchcache:';
const CACHE_TTL = 60 * 60 * 24; // 24 hours in seconds

export interface CachedSearchResult {
	results_raw: string;
	results_curated: string;
	cached_at: string;
	query_freeform: string;
}

/**
 * Generate a cache key from a search query
 * Normalizes the query to increase cache hits
 */
export async function generateSearchCacheKey(
	queryFreeform: string,
	queryStructured?: object | null
): Promise<string> {
	// Normalize the query
	const normalizedQuery = queryFreeform
		.toLowerCase()
		.trim()
		.replace(/\s+/g, ' ') // Normalize whitespace
		.replace(/[^\w\s]/g, ''); // Remove special characters

	const dataToHash = JSON.stringify({
		query: normalizedQuery,
		structured: queryStructured || null
	});

	// Use SHA-256 for consistent hashing
	const encoder = new TextEncoder();
	const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(dataToHash));
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

	return `${CACHE_PREFIX}${hashHex}`;
}

/**
 * Get cached search results
 */
export async function getCachedSearchResult(
	kv: KVNamespace,
	cacheKey: string
): Promise<CachedSearchResult | null> {
	const data = await kv.get(cacheKey);
	if (!data) return null;

	try {
		const cached: CachedSearchResult = JSON.parse(data);

		// Verify the cache is still valid (extra check)
		const cachedAt = new Date(cached.cached_at);
		const now = new Date();
		const ageMs = now.getTime() - cachedAt.getTime();

		if (ageMs > CACHE_TTL * 1000) {
			// Cache expired, delete it
			await kv.delete(cacheKey);
			return null;
		}

		return cached;
	} catch {
		// Invalid cache data
		await kv.delete(cacheKey);
		return null;
	}
}

/**
 * Store search results in cache
 */
export async function cacheSearchResult(
	kv: KVNamespace,
	cacheKey: string,
	data: {
		results_raw: string;
		results_curated: string;
		query_freeform: string;
	}
): Promise<void> {
	const cached: CachedSearchResult = {
		...data,
		cached_at: new Date().toISOString()
	};

	await kv.put(cacheKey, JSON.stringify(cached), {
		expirationTtl: CACHE_TTL
	});
}

/**
 * Delete cached search result
 */
export async function deleteCachedSearchResult(
	kv: KVNamespace,
	cacheKey: string
): Promise<void> {
	await kv.delete(cacheKey);
}

/**
 * Check if a search query might have cached results
 * Returns the cache key if found, null otherwise
 */
export async function findCachedSearch(
	kv: KVNamespace,
	queryFreeform: string,
	queryStructured?: object | null
): Promise<{ cacheKey: string; cached: CachedSearchResult } | null> {
	const cacheKey = await generateSearchCacheKey(queryFreeform, queryStructured);
	const cached = await getCachedSearchResult(kv, cacheKey);

	if (cached) {
		return { cacheKey, cached };
	}

	return null;
}
