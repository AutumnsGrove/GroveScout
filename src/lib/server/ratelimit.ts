// Scout - Rate Limiting
// Uses KV to track request counts with sliding window

const RATE_LIMIT_PREFIX = 'ratelimit:';

export interface RateLimitConfig {
	/** Maximum requests allowed in the window */
	maxRequests: number;
	/** Window size in seconds */
	windowSeconds: number;
}

export interface RateLimitResult {
	allowed: boolean;
	remaining: number;
	resetAt: number; // Unix timestamp
	retryAfter?: number; // Seconds until reset
}

// Default rate limit configs for different endpoints
export const RATE_LIMITS = {
	// Auth endpoints - prevent brute force
	auth: { maxRequests: 10, windowSeconds: 60 }, // 10 per minute

	// Search endpoints - prevent abuse
	search: { maxRequests: 20, windowSeconds: 60 }, // 20 per minute
	searchCreate: { maxRequests: 5, windowSeconds: 60 }, // 5 new searches per minute

	// API endpoints - general
	api: { maxRequests: 100, windowSeconds: 60 }, // 100 per minute

	// Webhook endpoints - higher limit for Stripe
	webhook: { maxRequests: 200, windowSeconds: 60 }, // 200 per minute

	// Admin endpoints
	admin: { maxRequests: 50, windowSeconds: 60 } // 50 per minute
} as const;

/**
 * Check and update rate limit for an identifier
 * @param kv - KV namespace
 * @param identifier - Unique identifier (e.g., IP, user ID)
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export async function checkRateLimit(
	kv: KVNamespace,
	identifier: string,
	config: RateLimitConfig
): Promise<RateLimitResult> {
	const now = Math.floor(Date.now() / 1000);
	const windowStart = now - config.windowSeconds;
	const key = `${RATE_LIMIT_PREFIX}${identifier}`;

	// Get current rate limit data
	const data = await kv.get(key);
	let requests: number[] = [];

	if (data) {
		try {
			requests = JSON.parse(data);
			// Filter out requests outside the current window
			requests = requests.filter((timestamp) => timestamp > windowStart);
		} catch {
			requests = [];
		}
	}

	// Check if limit exceeded
	if (requests.length >= config.maxRequests) {
		const oldestRequest = Math.min(...requests);
		const resetAt = oldestRequest + config.windowSeconds;
		const retryAfter = resetAt - now;

		return {
			allowed: false,
			remaining: 0,
			resetAt,
			retryAfter: Math.max(1, retryAfter)
		};
	}

	// Add current request
	requests.push(now);

	// Store updated data with TTL
	await kv.put(key, JSON.stringify(requests), {
		expirationTtl: config.windowSeconds + 10 // Small buffer
	});

	return {
		allowed: true,
		remaining: config.maxRequests - requests.length,
		resetAt: now + config.windowSeconds
	};
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(result: RateLimitResult, config: RateLimitConfig): Record<string, string> {
	const headers: Record<string, string> = {
		'X-RateLimit-Limit': config.maxRequests.toString(),
		'X-RateLimit-Remaining': result.remaining.toString(),
		'X-RateLimit-Reset': result.resetAt.toString()
	};

	if (!result.allowed && result.retryAfter) {
		headers['Retry-After'] = result.retryAfter.toString();
	}

	return headers;
}

/**
 * Create rate limited response
 */
export function rateLimitedResponse(result: RateLimitResult, config: RateLimitConfig): Response {
	return new Response(
		JSON.stringify({
			error: {
				message: 'Too many requests. Please try again later.',
				code: 'RATE_LIMITED',
				retryAfter: result.retryAfter
			}
		}),
		{
			status: 429,
			headers: {
				'Content-Type': 'application/json',
				...getRateLimitHeaders(result, config)
			}
		}
	);
}

/**
 * Get client identifier for rate limiting
 * Uses IP address or user ID if authenticated
 */
export function getClientIdentifier(
	request: Request,
	userId?: string | null,
	prefix: string = ''
): string {
	// If user is authenticated, rate limit by user ID
	if (userId) {
		return `${prefix}user:${userId}`;
	}

	// Otherwise, rate limit by IP
	const ip =
		request.headers.get('cf-connecting-ip') ||
		request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
		request.headers.get('x-real-ip') ||
		'unknown';

	return `${prefix}ip:${ip}`;
}
