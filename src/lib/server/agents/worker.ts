// Scout - Search Worker
// Processes search jobs from the queue

import type { SearchJob, CuratedResults, ProductResult } from '$lib/types';
import { updateSearchStatus, createSearchResult, addCreditEntry, getUserById, trackEvent } from '../db';
import { createResendClient, sendSearchCompletedEmail, sendSearchFailedEmail } from '../email';
import { cacheSearchResult, generateSearchCacheKey } from '../cache';
import { runSearchOrchestrator } from './orchestrator';
import type { SavedProduct } from './types';

export interface WorkerEnv {
	DB: D1Database;
	KV: KVNamespace;
	ANTHROPIC_API_KEY: string;
	BRAVE_API_KEY: string;
	TAVILY_API_KEY?: string;
	RESEND_API_KEY: string;
	SITE_URL: string;
}

export async function processSearchJob(job: SearchJob, env: WorkerEnv): Promise<void> {
	const { search_id, query_freeform, query_structured, profile, searchProvider, season } = job;

	console.log(`[Scout] Processing search ${search_id}: "${query_freeform}" (provider: ${searchProvider || 'brave'})`);

	try {
		// Update status to running
		await updateSearchStatus(env.DB, search_id, 'running');

		// Build search context
		const searchContext = {
			query: query_freeform || 'general deals',
			season: season ?? null,
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

		// Run the search agents with selected provider
		const { raw, curated, usage } = await runSearchOrchestrator(
			env.ANTHROPIC_API_KEY,
			env.BRAVE_API_KEY,
			searchContext,
			{
				searchProvider: searchProvider || 'brave',
				tavilyApiKey: env.TAVILY_API_KEY
			}
		);

		if (curated.length === 0) {
			// No results found - still track token usage
			await updateSearchStatus(env.DB, search_id, 'failed', {
				error_message: 'No matching products found. Try broadening your search criteria.',
				tokens_input: usage.input_tokens,
				tokens_output: usage.output_tokens,
				api_calls_count: usage.api_calls
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
		const cacheKey = await generateSearchCacheKey(query_freeform || '', query_structured);

		const resultsRaw = JSON.stringify(raw);
		const resultsCurated = JSON.stringify(curatedResults);

		// Save results
		await createSearchResult(env.DB, {
			search_id,
			results_raw: resultsRaw,
			results_curated: resultsCurated,
			cache_key: cacheKey
		});

		// Cache results in KV for future searches
		await cacheSearchResult(env.KV, cacheKey, {
			results_raw: resultsRaw,
			results_curated: resultsCurated,
			query_freeform: query_freeform || ''
		});

		// Deduct credit
		await addCreditEntry(env.DB, {
			user_id: job.user_id,
			amount: -1,
			reason: 'search',
			search_id,
			note: `Search: "${(query_freeform || '').slice(0, 50)}..."`
		});

		// Update status to completed with token usage
		await updateSearchStatus(env.DB, search_id, 'completed', {
			credits_used: 1,
			tokens_input: usage.input_tokens,
			tokens_output: usage.output_tokens,
			api_calls_count: usage.api_calls
		});

		// Track search completed with token usage
		await trackEvent(env.DB, 'search_completed', job.user_id, {
			search_id,
			result_count: curated.length,
			raw_count: raw.length,
			tokens_input: usage.input_tokens,
			tokens_output: usage.output_tokens,
			api_calls: usage.api_calls
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

		// Track search failed
		await trackEvent(env.DB, 'search_failed', job.user_id, {
			search_id,
			error: errorMessage
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
