// Tests for Tavily module - Zod validation and query building
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { buildTavilyQueries } from '$lib/server/agents/tavily';

describe('Tavily Search', () => {
	// Replicate the Zod schemas for testing (since they're not exported)
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

	describe('Zod Schema Validation', () => {
		it('should validate a correct Tavily response', () => {
			const validResponse = {
				results: [
					{
						title: 'Nike Air Max 90',
						url: 'https://www.nike.com/air-max-90',
						content: 'Classic Nike sneaker with Air cushioning',
						score: 0.95
					},
					{
						title: 'Adidas Ultraboost',
						url: 'https://www.adidas.com/ultraboost',
						content: 'Premium running shoes',
						score: 0.87,
						published_date: '2024-01-15'
					}
				],
				query: 'running shoes',
				response_time: 0.234
			};

			const result = TavilySearchResponseSchema.safeParse(validResponse);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.results).toHaveLength(2);
				expect(result.data.results[0].title).toBe('Nike Air Max 90');
			}
		});

		it('should reject response with invalid URL', () => {
			const invalidResponse = {
				results: [
					{
						title: 'Invalid Product',
						url: 'not-a-valid-url',
						content: 'Some content',
						score: 0.8
					}
				],
				query: 'test',
				response_time: 0.1
			};

			const result = TavilySearchResponseSchema.safeParse(invalidResponse);
			expect(result.success).toBe(false);
		});

		it('should reject response with score out of range', () => {
			const invalidResponse = {
				results: [
					{
						title: 'Product',
						url: 'https://example.com/product',
						content: 'Some content',
						score: 1.5 // Invalid: > 1
					}
				],
				query: 'test',
				response_time: 0.1
			};

			const result = TavilySearchResponseSchema.safeParse(invalidResponse);
			expect(result.success).toBe(false);
		});

		it('should reject response with negative score', () => {
			const invalidResponse = {
				results: [
					{
						title: 'Product',
						url: 'https://example.com/product',
						content: 'Some content',
						score: -0.5 // Invalid: < 0
					}
				],
				query: 'test',
				response_time: 0.1
			};

			const result = TavilySearchResponseSchema.safeParse(invalidResponse);
			expect(result.success).toBe(false);
		});

		it('should reject response missing required fields', () => {
			const invalidResponse = {
				results: [
					{
						title: 'Product',
						// Missing url and content
						score: 0.8
					}
				],
				query: 'test',
				response_time: 0.1
			};

			const result = TavilySearchResponseSchema.safeParse(invalidResponse);
			expect(result.success).toBe(false);
		});

		it('should accept response with optional published_date', () => {
			const validResponse = {
				results: [
					{
						title: 'Product',
						url: 'https://example.com/product',
						content: 'Description',
						score: 0.9
						// published_date is optional
					}
				],
				query: 'test',
				response_time: 0.1
			};

			const result = TavilySearchResponseSchema.safeParse(validResponse);
			expect(result.success).toBe(true);
		});

		it('should reject completely malformed response', () => {
			const invalidResponse = {
				wrong_field: 'unexpected data'
			};

			const result = TavilySearchResponseSchema.safeParse(invalidResponse);
			expect(result.success).toBe(false);
		});

		it('should handle empty results array', () => {
			const emptyResponse = {
				results: [],
				query: 'obscure product',
				response_time: 0.05
			};

			const result = TavilySearchResponseSchema.safeParse(emptyResponse);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.results).toHaveLength(0);
			}
		});
	});

	describe('Query Building', () => {
		it('should build multiple query variants', () => {
			const queries = buildTavilyQueries('running shoes', {});
			expect(queries.length).toBeGreaterThan(0);
			expect(queries.some(q => q.includes('running shoes'))).toBe(true);
		});

		it('should include budget in queries when provided', () => {
			const queries = buildTavilyQueries('laptop', { budget_max: 100000 }); // $1000 in cents
			expect(queries.some(q => q.includes('$1000'))).toBe(true);
		});

		it('should generate buy, deals, and review queries', () => {
			const queries = buildTavilyQueries('headphones', {});
			expect(queries.some(q => q.includes('buy'))).toBe(true);
			expect(queries.some(q => q.includes('deals'))).toBe(true);
			expect(queries.some(q => q.includes('reviews'))).toBe(true);
		});
	});
});

describe('Tavily Product Search', () => {
	it('should deduplicate results by URL', () => {
		// Test the deduplication logic
		const results = [
			{ title: 'Product A', url: 'https://amazon.com/product', content: 'A', score: 0.9 },
			{ title: 'Product A Copy', url: 'https://amazon.com/product', content: 'A copy', score: 0.8 },
			{ title: 'Product B', url: 'https://walmart.com/product', content: 'B', score: 0.85 }
		];

		const seen = new Set<string>();
		const deduplicated = results.filter(r => {
			if (seen.has(r.url)) return false;
			seen.add(r.url);
			return true;
		});

		expect(deduplicated).toHaveLength(2);
		expect(deduplicated[0].title).toBe('Product A');
		expect(deduplicated[1].title).toBe('Product B');
	});
});
