// Scout - Search Worker
// Processes search jobs from the queue

import type { SearchJob, CuratedResults, ProductResult } from '$lib/types';
import { updateSearchStatus, createSearchResult, addCreditEntry, getUserById } from '../db';
import { createResendClient, sendSearchCompletedEmail, sendSearchFailedEmail } from '../email';
import { runSearchOrchestrator } from './orchestrator';
import type { SavedProduct } from './types';

export interface WorkerEnv {
	DB: D1Database;
	KV: KVNamespace;
	ANTHROPIC_API_KEY: string;
	BRAVE_API_KEY: string;
	RESEND_API_KEY: string;
	SITE_URL: string;
}

export async function processSearchJob(job: SearchJob, env: WorkerEnv): Promise<void> {
	const { search_id, query_freeform, query_structured, profile } = job;

	console.log(`[Scout] Processing search ${search_id}: "${query_freeform}"`);

	try {
		// Update status to running
		await updateSearchStatus(env.DB, search_id, 'running');

		// Build search context
		const searchContext = {
			query: query_freeform || 'general deals',
			profile: {
				sizes: profile.sizes,
				color_favorites: profile.color_preferences?.favorites,
				color_avoid: profile.color_preferences?.avoid,
				budget_min: profile.budget_min,
				budget_max: profile.budget_max,
				favorite_retailers: profile.favorite_retailers,
				excluded_retailers: profile.excluded_retailers,
				style_notes: profile.style_notes
			}
		};

		// Run the search agents
		const { raw, curated } = await runSearchOrchestrator(
			env.ANTHROPIC_API_KEY,
			env.BRAVE_API_KEY,
			searchContext
		);

		if (curated.length === 0) {
			// No results found
			await updateSearchStatus(env.DB, search_id, 'failed', {
				error_message: 'No matching products found. Try broadening your search criteria.'
			});
			return;
		}

		// Format results
		const curatedResults: CuratedResults = {
			items: curated.map((p, i) => formatProductResult(p, i + 1)),
			search_summary: `Found ${raw.length} products matching your criteria. Curated to ${curated.length} based on price, reviews, and fit with your preferences.`,
			generated_at: new Date().toISOString()
		};

		// Generate cache key
		const cacheKey = await generateCacheKey(query_freeform || '', query_structured);

		// Save results
		await createSearchResult(env.DB, {
			search_id,
			results_raw: JSON.stringify(raw),
			results_curated: JSON.stringify(curatedResults),
			cache_key: cacheKey
		});

		// Deduct credit
		await addCreditEntry(env.DB, {
			user_id: job.user_id,
			amount: -1,
			reason: 'search',
			search_id,
			note: `Search: "${(query_freeform || '').slice(0, 50)}..."`
		});

		// Update status to completed
		await updateSearchStatus(env.DB, search_id, 'completed', {
			credits_used: 1
		});

		console.log(`[Scout] Search ${search_id} completed with ${curated.length} results`);

		// Send email notification
		await sendCompletionEmail(env, job.user_id, {
			query: query_freeform || 'your search',
			resultCount: curated.length,
			searchId: search_id
		});
	} catch (error) {
		console.error(`[Scout] Search ${search_id} failed:`, error);

		const errorMessage = error instanceof Error ? error.message : 'Search failed unexpectedly';

		await updateSearchStatus(env.DB, search_id, 'failed', {
			error_message: errorMessage
		});

		// Send failure email notification
		await sendFailureEmail(env, job.user_id, {
			query: query_freeform || 'your search',
			reason: errorMessage
		});
	}
}

async function sendCompletionEmail(
	env: WorkerEnv,
	userId: string,
	data: { query: string; resultCount: number; searchId: string }
): Promise<void> {
	try {
		const user = await getUserById(env.DB, userId);
		if (!user) return;

		const resend = createResendClient(env.RESEND_API_KEY);
		await sendSearchCompletedEmail(resend, user.email, {
			searchQuery: data.query,
			resultCount: data.resultCount,
			resultsUrl: `${env.SITE_URL}/search/${data.searchId}`
		});
	} catch (error) {
		// Log but don't fail the job if email fails
		console.error('[Scout] Failed to send completion email:', error);
	}
}

async function sendFailureEmail(
	env: WorkerEnv,
	userId: string,
	data: { query: string; reason: string }
): Promise<void> {
	try {
		const user = await getUserById(env.DB, userId);
		if (!user) return;

		const resend = createResendClient(env.RESEND_API_KEY);
		await sendSearchFailedEmail(resend, user.email, {
			searchQuery: data.query,
			reason: data.reason
		});
	} catch (error) {
		// Log but don't fail the job if email fails
		console.error('[Scout] Failed to send failure email:', error);
	}
}

function formatProductResult(product: SavedProduct, rank: number): ProductResult {
	const result: ProductResult = {
		rank,
		name: product.name,
		price_current: product.price_current,
		retailer: product.retailer,
		url: product.url,
		match_score: product.confidence,
		match_reason: (product as unknown as { match_reason?: string }).match_reason ||
			`Good match for your criteria with ${product.confidence}% confidence.`
	};

	if (product.price_original) {
		result.price_original = product.price_original;
		result.discount_percent = Math.round(
			((product.price_original - product.price_current) / product.price_original) * 100
		);
	}

	if (product.image_url) {
		result.image_url = product.image_url;
	}

	return result;
}

async function generateCacheKey(
	query: string,
	structured: SearchJob['query_structured']
): Promise<string> {
	const normalized = query.toLowerCase().trim();
	const data = JSON.stringify({ query: normalized, structured });

	// Use Web Crypto API for SHA-256
	const encoder = new TextEncoder();
	const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

	return `cache:${hashHex}`;
}

// Queue handler export for Cloudflare Workers
export default {
	async queue(batch: MessageBatch<SearchJob>, env: WorkerEnv): Promise<void> {
		for (const message of batch.messages) {
			try {
				await processSearchJob(message.body, env);
				message.ack();
			} catch (error) {
				console.error('[Scout] Failed to process message:', error);
				message.retry();
			}
		}
	}
};
