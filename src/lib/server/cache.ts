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
 * Uses conservative normalization to avoid collisions while still enabling cache hits
 */
export async function generateSearchCacheKey(
	queryFreeform: string,
	queryStructured?: object | null
): Promise<string> {
	// Conservative normalization - preserve special characters that affect meaning
	// Only normalize whitespace and case for cache hit improvement
	const normalizedQuery = queryFreeform
		.toLowerCase()
		.trim()
		.replace(/\s+/g, ' '); // Only normalize whitespace, keep special chars

	// Include original query hash as well for collision detection
	const dataToHash = JSON.stringify({
		// Primary: normalized for cache hits
		query_normalized: normalizedQuery,
		// Secondary: include original trimmed query to prevent collisions
		query_original_hash: await hashString(queryFreeform.trim()),
		// Structured query if provided
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
 * Helper to hash a string
 */
async function hashString(str: string): Promise<string> {
	const encoder = new TextEncoder();
	const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(str));
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
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
