// Tests for R2 storage utilities
import { describe, it, expect, beforeEach } from 'vitest';
import {
	resultsToMarkdown,
	markdownToResults,
	generateR2Key,
	storeResultsInR2,
	getResultsFromR2,
	type StoredResult
} from '../r2';
import { createMockR2 } from './mocks/cloudflare';

describe('R2 Storage Utilities', () => {
	describe('generateR2Key', () => {
		it('should generate date-based R2 key', () => {
			const key = generateR2Key('search-123', '2025-06-15T10:30:00.000Z');
			expect(key).toBe('results/2025/06/search-123.md');
		});

		it('should pad month with zero', () => {
			const key = generateR2Key('search-456', '2025-01-05T00:00:00.000Z');
			expect(key).toBe('results/2025/01/search-456.md');
		});

		it('should handle December correctly', () => {
			const key = generateR2Key('search-789', '2025-12-25T12:00:00.000Z');
			expect(key).toBe('results/2025/12/search-789.md');
		});
	});

	describe('resultsToMarkdown', () => {
		const sampleResult: StoredResult = {
			searchId: 'test-search-id',
			query: 'wireless earbuds under $100',
			resultsCurated: {
				items: [
					{
						rank: 1,
						name: 'Sony WF-1000XM4',
						price_current: 8999,
						price_original: 12999,
						discount_percent: 31,
						retailer: 'amazon.com',
						url: 'https://amazon.com/sony-wf1000xm4',
						image_url: 'https://example.com/image.jpg',
						match_score: 95,
						match_reason: 'Great noise cancellation within budget'
					}
				],
				search_summary: 'Found 10 earbuds matching your criteria',
				generated_at: '2025-06-15T10:30:00.000Z'
			},
			resultsRaw: [
				{ name: 'Sony WF-1000XM4', price: 8999, url: 'https://amazon.com/sony' }
			],
			shareToken: 'abc123xyz',
			cacheKey: 'cache-key-123',
			createdAt: '2025-06-15T10:30:00.000Z',
			expiresAt: '2025-07-15T10:30:00.000Z',
			migratedAt: '2025-06-22T10:30:00.000Z'
		};

		it('should generate valid markdown with frontmatter', () => {
			const markdown = resultsToMarkdown(sampleResult);

			// Check frontmatter exists
			expect(markdown).toMatch(/^---\n/);
			expect(markdown).toContain('search_id: test-search-id');
			expect(markdown).toContain('share_token: abc123xyz');
			expect(markdown).toContain('items_count: 1');
		});

		it('should include human-readable product listings', () => {
			const markdown = resultsToMarkdown(sampleResult);

			expect(markdown).toContain('# Search Results');
			expect(markdown).toContain('**Query:** wireless earbuds under $100');
			expect(markdown).toContain('### #1 Sony WF-1000XM4');
			expect(markdown).toContain('**Price:** $89.99');
			expect(markdown).toContain('**Original:** $129.99 (31% off)');
			expect(markdown).toContain('**Match Score:** 95/100');
		});

		it('should include JSON data blocks for parsing', () => {
			const markdown = resultsToMarkdown(sampleResult);

			expect(markdown).toContain('```json:curated');
			expect(markdown).toContain('```json:raw');
		});

		it('should handle null query', () => {
			const resultWithNullQuery: StoredResult = {
				...sampleResult,
				query: null
			};
			const markdown = resultsToMarkdown(resultWithNullQuery);

			expect(markdown).toContain('query: null');
		});

		it('should escape special characters in strings', () => {
			const resultWithSpecialChars: StoredResult = {
				...sampleResult,
				query: 'earbuds: the best "wireless" ones'
			};
			const markdown = resultsToMarkdown(resultWithSpecialChars);

			// Should be properly escaped
			expect(markdown).toMatch(/query: "earbuds: the best \\"wireless\\" ones"/);
		});
	});

	describe('markdownToResults', () => {
		const validMarkdown = `---
search_id: test-search-id
query: wireless earbuds
share_token: abc123
cache_key: null
created_at: 2025-06-15T10:30:00.000Z
expires_at: 2025-07-15T10:30:00.000Z
migrated_at: 2025-06-22T10:30:00.000Z
summary: Found products
items_count: 1
raw_count: 1
---

# Search Results

**Query:** wireless earbuds

## Summary

Found products

## Curated Results

### #1 Sony Earbuds

- **Price:** $89.99

## Raw Data

\`\`\`json:curated
{"items":[{"name":"Sony","price_current":8999,"retailer":"amazon.com","url":"https://amazon.com","match_score":90,"match_reason":"Good"}],"search_summary":"Found products","generated_at":"2025-06-15T10:30:00.000Z"}
\`\`\`

\`\`\`json:raw
[{"name":"Sony","price":8999}]
\`\`\``;

		it('should parse valid markdown back to StoredResult', () => {
			const result = markdownToResults(validMarkdown);

			expect(result).not.toBeNull();
			expect(result?.searchId).toBe('test-search-id');
			expect(result?.query).toBe('wireless earbuds');
			expect(result?.shareToken).toBe('abc123');
			expect(result?.cacheKey).toBeNull();
		});

		it('should parse curated results JSON', () => {
			const result = markdownToResults(validMarkdown);

			expect(result?.resultsCurated).toBeDefined();
			expect(result?.resultsCurated.items).toHaveLength(1);
			expect(result?.resultsCurated.items[0].name).toBe('Sony');
			expect(result?.resultsCurated.items[0].price_current).toBe(8999);
		});

		it('should parse raw results JSON', () => {
			const result = markdownToResults(validMarkdown);

			expect(result?.resultsRaw).toBeDefined();
			expect(Array.isArray(result?.resultsRaw)).toBe(true);
			expect(result?.resultsRaw).toHaveLength(1);
		});

		it('should return null for invalid markdown (no frontmatter)', () => {
			const result = markdownToResults('# Just a header\n\nNo frontmatter here');
			expect(result).toBeNull();
		});

		it('should return null for markdown missing JSON blocks', () => {
			const incompleteMarkdown = `---
search_id: test
---

# Search Results

No JSON blocks here.`;
			const result = markdownToResults(incompleteMarkdown);
			expect(result).toBeNull();
		});
	});

	describe('Round-trip serialization', () => {
		it('should preserve all data through markdown round-trip', () => {
			const original: StoredResult = {
				searchId: 'roundtrip-test',
				query: 'test query with special chars: "quotes" & ampersand',
				resultsCurated: {
					items: [
						{
							rank: 1,
							name: 'Test Product',
							price_current: 4999,
							price_original: 6999,
							discount_percent: 29,
							retailer: 'test.com',
							url: 'https://test.com/product',
							image_url: 'https://test.com/image.jpg',
							match_score: 85,
							match_reason: 'Great match for your needs'
						},
						{
							rank: 2,
							name: 'Another Product',
							price_current: 3499,
							retailer: 'shop.com',
							url: 'https://shop.com/item',
							match_score: 75,
							match_reason: 'Budget friendly option'
						}
					],
					search_summary: 'Found 2 products',
					generated_at: '2025-06-15T10:30:00.000Z'
				},
				resultsRaw: [
					{ name: 'Test', price: 4999 },
					{ name: 'Another', price: 3499 }
				],
				shareToken: 'share-token-123',
				cacheKey: 'cache-123',
				createdAt: '2025-06-15T10:30:00.000Z',
				expiresAt: '2025-07-15T10:30:00.000Z',
				migratedAt: '2025-06-22T10:30:00.000Z'
			};

			// Convert to markdown
			const markdown = resultsToMarkdown(original);

			// Parse back
			const parsed = markdownToResults(markdown);

			// Verify all fields preserved
			expect(parsed).not.toBeNull();
			expect(parsed?.searchId).toBe(original.searchId);
			expect(parsed?.shareToken).toBe(original.shareToken);
			expect(parsed?.cacheKey).toBe(original.cacheKey);
			expect(parsed?.createdAt).toBe(original.createdAt);
			expect(parsed?.expiresAt).toBe(original.expiresAt);
			expect(parsed?.migratedAt).toBe(original.migratedAt);

			// Verify curated results
			expect(parsed?.resultsCurated.items).toHaveLength(2);
			expect(parsed?.resultsCurated.items[0].name).toBe('Test Product');
			expect(parsed?.resultsCurated.items[0].price_current).toBe(4999);
			expect(parsed?.resultsCurated.items[1].name).toBe('Another Product');

			// Verify raw results
			expect(parsed?.resultsRaw).toHaveLength(2);
		});

		it('should handle empty items array', () => {
			const original: StoredResult = {
				searchId: 'empty-test',
				query: 'no results query',
				resultsCurated: {
					items: [],
					search_summary: 'No products found',
					generated_at: '2025-06-15T10:30:00.000Z'
				},
				resultsRaw: [],
				shareToken: null,
				cacheKey: null,
				createdAt: '2025-06-15T10:30:00.000Z',
				expiresAt: null,
				migratedAt: '2025-06-22T10:30:00.000Z'
			};

			const markdown = resultsToMarkdown(original);
			const parsed = markdownToResults(markdown);

			expect(parsed?.resultsCurated.items).toHaveLength(0);
			expect(parsed?.resultsRaw).toHaveLength(0);
			expect(parsed?.shareToken).toBeNull();
		});
	});

	describe('R2 storage operations', () => {
		let mockR2: R2Bucket;

		beforeEach(() => {
			mockR2 = createMockR2();
		});

		it('should store results in R2 and return key', async () => {
			const r2Key = await storeResultsInR2(
				mockR2,
				'search-123',
				'test query',
				JSON.stringify([{ name: 'Product', price: 1999 }]),
				JSON.stringify({ items: [], search_summary: 'Test', generated_at: '2025-06-15T10:30:00.000Z' }),
				'share-token',
				'cache-key',
				'2025-06-15T10:30:00.000Z',
				'2025-07-15T10:30:00.000Z'
			);

			expect(r2Key).toMatch(/^results\/2025\/06\/search-123\.md$/);
			expect(mockR2.put).toHaveBeenCalledOnce();
		});

		it('should retrieve stored results from R2', async () => {
			// Store first
			const r2Key = await storeResultsInR2(
				mockR2,
				'search-456',
				'retrieval test',
				JSON.stringify([{ name: 'Test' }]),
				JSON.stringify({ items: [{ name: 'Test', price_current: 999, retailer: 'test.com', url: 'https://test.com', match_score: 80, match_reason: 'Good' }], search_summary: 'Found 1', generated_at: '2025-06-15T10:30:00.000Z' }),
				null,
				null,
				'2025-06-15T10:30:00.000Z',
				null
			);

			// Retrieve
			const result = await getResultsFromR2(mockR2, r2Key);

			expect(result).not.toBeNull();
			expect(result?.searchId).toBe('search-456');
			expect(result?.query).toBe('retrieval test');
		});

		it('should return null for non-existent key', async () => {
			const result = await getResultsFromR2(mockR2, 'results/2025/01/nonexistent.md');
			expect(result).toBeNull();
		});
	});
});
