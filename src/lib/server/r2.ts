// Scout - R2 Storage Utilities
// Handles storage and retrieval of search results in R2 as markdown files

import { z } from 'zod';
import type { CuratedResults, ProductResult } from '$lib/types';

// Zod schemas for runtime validation of stored data
const ProductResultSchema = z.object({
	rank: z.number().optional(),
	name: z.string(),
	price_current: z.number(),
	price_original: z.number().optional(),
	discount_percent: z.number().optional(),
	retailer: z.string(),
	url: z.string(),
	image_url: z.string().optional(),
	description: z.string().optional(),
	match_score: z.number().min(0).max(100),
	match_reason: z.string()
});

const CuratedResultsSchema = z.object({
	items: z.array(ProductResultSchema),
	search_summary: z.string(),
	generated_at: z.string()
});

// Raw results are more permissive (can be any product format)
const RawResultsSchema = z.array(z.unknown());

/**
 * R2 key format: results/{year}/{month}/{search_id}.md
 * This creates a date-based hierarchy for easy browsing and cleanup
 */
export function generateR2Key(searchId: string, createdAt: string): string {
	const date = new Date(createdAt);
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	return `results/${year}/${month}/${searchId}.md`;
}

/**
 * Stored result structure with all data needed to reconstruct the search result
 */
export interface StoredResult {
	searchId: string;
	query: string | null;
	resultsRaw: unknown[];
	resultsCurated: CuratedResults;
	shareToken: string | null;
	cacheKey: string | null;
	createdAt: string;
	expiresAt: string | null;
	migratedAt: string;
}

/**
 * Convert search results to markdown format for R2 storage
 * Uses YAML frontmatter for metadata and markdown body for human-readable results
 */
export function resultsToMarkdown(data: StoredResult): string {
	const frontmatter = {
		search_id: data.searchId,
		query: data.query,
		share_token: data.shareToken,
		cache_key: data.cacheKey,
		created_at: data.createdAt,
		expires_at: data.expiresAt,
		migrated_at: data.migratedAt,
		summary: data.resultsCurated.search_summary,
		items_count: data.resultsCurated.items.length,
		raw_count: data.resultsRaw.length
	};

	const lines: string[] = [];

	// YAML frontmatter
	lines.push('---');
	for (const [key, value] of Object.entries(frontmatter)) {
		if (value === null || value === undefined) {
			lines.push(`${key}: null`);
		} else if (typeof value === 'string') {
			// Escape strings that might contain special characters
			if (value.includes(':') || value.includes('#') || value.includes('\n')) {
				lines.push(`${key}: "${value.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`);
			} else {
				lines.push(`${key}: ${value}`);
			}
		} else {
			lines.push(`${key}: ${value}`);
		}
	}
	lines.push('---');
	lines.push('');

	// Human-readable summary
	lines.push('# Search Results');
	lines.push('');
	if (data.query) {
		lines.push(`**Query:** ${data.query}`);
		lines.push('');
	}
	lines.push(`**Generated:** ${data.resultsCurated.generated_at}`);
	lines.push('');
	lines.push('## Summary');
	lines.push('');
	lines.push(data.resultsCurated.search_summary);
	lines.push('');

	// Curated items
	lines.push('## Curated Results');
	lines.push('');
	for (const item of data.resultsCurated.items) {
		lines.push(`### ${item.rank ? `#${item.rank} ` : ''}${item.name}`);
		lines.push('');
		lines.push(`- **Price:** $${(item.price_current / 100).toFixed(2)}`);
		if (item.price_original && item.price_original > item.price_current) {
			lines.push(
				`- **Original:** $${(item.price_original / 100).toFixed(2)} (${item.discount_percent}% off)`
			);
		}
		lines.push(`- **Retailer:** ${item.retailer}`);
		lines.push(`- **Match Score:** ${item.match_score}/100`);
		lines.push(`- **Why:** ${item.match_reason}`);
		lines.push(`- **URL:** ${item.url}`);
		if (item.image_url) {
			lines.push(`- **Image:** ${item.image_url}`);
		}
		lines.push('');
	}

	// Raw JSON data block (for parsing back)
	lines.push('## Raw Data');
	lines.push('');
	lines.push('```json:curated');
	lines.push(JSON.stringify(data.resultsCurated, null, 2));
	lines.push('```');
	lines.push('');
	lines.push('```json:raw');
	lines.push(JSON.stringify(data.resultsRaw, null, 2));
	lines.push('```');

	return lines.join('\n');
}

/**
 * Parse markdown back to structured result data
 */
export function markdownToResults(markdown: string): StoredResult | null {
	try {
		// Extract frontmatter
		const frontmatterMatch = markdown.match(/^---\n([\s\S]*?)\n---/);
		if (!frontmatterMatch) {
			console.error('[R2] No frontmatter found in markdown');
			return null;
		}

		const frontmatter = parseFrontmatter(frontmatterMatch[1]);

		// Extract JSON blocks
		const curatedMatch = markdown.match(/```json:curated\n([\s\S]*?)\n```/);
		const rawMatch = markdown.match(/```json:raw\n([\s\S]*?)\n```/);

		if (!curatedMatch || !rawMatch) {
			console.error('[R2] Missing JSON data blocks in markdown');
			return null;
		}

		const resultsCurated = JSON.parse(curatedMatch[1]) as CuratedResults;
		const resultsRaw = JSON.parse(rawMatch[1]) as unknown[];

		return {
			searchId: frontmatter.search_id as string,
			query: frontmatter.query as string | null,
			resultsCurated,
			resultsRaw,
			shareToken: frontmatter.share_token as string | null,
			cacheKey: frontmatter.cache_key as string | null,
			createdAt: frontmatter.created_at as string,
			expiresAt: frontmatter.expires_at as string | null,
			migratedAt: frontmatter.migrated_at as string
		};
	} catch (err) {
		console.error('[R2] Failed to parse markdown:', err);
		return null;
	}
}

/**
 * Simple YAML frontmatter parser (handles our limited use case)
 */
function parseFrontmatter(yaml: string): Record<string, unknown> {
	const result: Record<string, unknown> = {};

	for (const line of yaml.split('\n')) {
		const colonIndex = line.indexOf(':');
		if (colonIndex === -1) continue;

		const key = line.substring(0, colonIndex).trim();
		let value: unknown = line.substring(colonIndex + 1).trim();

		// Parse value
		if (value === 'null') {
			value = null;
		} else if (value === 'true') {
			value = true;
		} else if (value === 'false') {
			value = false;
		} else if (typeof value === 'string' && /^\d+$/.test(value)) {
			value = parseInt(value, 10);
		} else if (typeof value === 'string' && value.startsWith('"') && value.endsWith('"')) {
			// Quoted string - unescape
			value = value.slice(1, -1).replace(/\\"/g, '"').replace(/\\n/g, '\n');
		}

		result[key] = value;
	}

	return result;
}

/**
 * Store search results in R2
 */
export async function storeResultsInR2(
	r2: R2Bucket,
	searchId: string,
	query: string | null,
	resultsRaw: string,
	resultsCurated: string,
	shareToken: string | null,
	cacheKey: string | null,
	createdAt: string,
	expiresAt: string | null
): Promise<string> {
	const now = new Date().toISOString();
	const r2Key = generateR2Key(searchId, createdAt);

	// Parse and validate the JSON data
	const rawParsed = JSON.parse(resultsRaw);
	const curatedParsed = JSON.parse(resultsCurated);

	// Validate with Zod schemas
	const rawValidation = RawResultsSchema.safeParse(rawParsed);
	if (!rawValidation.success) {
		console.warn(`[R2] Raw results validation failed for ${searchId}:`, rawValidation.error.format());
		// Continue with the data as-is (raw results are permissive)
	}

	const curatedValidation = CuratedResultsSchema.safeParse(curatedParsed);
	if (!curatedValidation.success) {
		console.error(`[R2] Curated results validation failed for ${searchId}:`, curatedValidation.error.format());
		throw new Error(`Invalid curated results format: ${curatedValidation.error.message}`);
	}

	const storedData: StoredResult = {
		searchId,
		query,
		resultsRaw: rawParsed,
		resultsCurated: curatedValidation.data,
		shareToken,
		cacheKey,
		createdAt,
		expiresAt,
		migratedAt: now
	};

	const markdown = resultsToMarkdown(storedData);

	await r2.put(r2Key, markdown, {
		httpMetadata: {
			contentType: 'text/markdown'
		},
		customMetadata: {
			searchId,
			createdAt,
			migratedAt: now
		}
	});

	return r2Key;
}

/**
 * Retrieve search results from R2
 */
export async function getResultsFromR2(
	r2: R2Bucket,
	r2Key: string
): Promise<StoredResult | null> {
	const object = await r2.get(r2Key);
	if (!object) {
		console.error('[R2] Object not found:', r2Key);
		return null;
	}

	const markdown = await object.text();
	return markdownToResults(markdown);
}

/**
 * Delete results from R2 (for cleanup or expiration)
 */
export async function deleteResultsFromR2(r2: R2Bucket, r2Key: string): Promise<void> {
	await r2.delete(r2Key);
}

/**
 * Check if R2 bucket is available and accessible
 */
export async function isR2Available(r2: R2Bucket | undefined): Promise<boolean> {
	if (!r2) return false;
	try {
		// Try listing with empty prefix - if it works, R2 is available
		await r2.list({ limit: 1 });
		return true;
	} catch {
		return false;
	}
}
