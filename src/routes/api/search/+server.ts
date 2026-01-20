// Scout - Search API
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { SearchInputSchema, type SearchJob, type ProfileContext } from '$lib/types';
import { createSearch, getProfileByUserId, getCreditBalance, createSearchResult, trackEvent } from '$lib/server/db';
import { findCachedSearch } from '$lib/server/cache';
import { processSearchJob } from '$lib/server/agents/worker';

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	if (!locals.user) {
		return json({ error: { message: 'Unauthorized' } }, { status: 401 });
	}

	if (!platform) {
		return json({ error: { message: 'Platform not available' } }, { status: 500 });
	}

	const { DB, KV, SEARCH_QUEUE } = platform.env;

	// Parse and validate input
	let body;
	try {
		body = await request.json();
	} catch {
		return json({ error: { message: 'Invalid JSON' } }, { status: 400 });
	}

	const parseResult = SearchInputSchema.safeParse(body);
	if (!parseResult.success) {
		return json(
			{ error: { message: 'Invalid input', details: parseResult.error.issues } },
			{ status: 400 }
		);
	}

	const { query, structured, searchProvider, season } = parseResult.data;

	// Check for cached results first
	const cachedResult = await findCachedSearch(KV, query, structured);
	if (cachedResult) {
		// Create a search record that's immediately completed with cached results
		const search = await createSearch(DB, {
			user_id: locals.user.id,
			query_freeform: query,
			query_structured: structured ? JSON.stringify(structured) : undefined
		});

		// Create search result from cache (no credit charge for cached results)
		await createSearchResult(DB, {
			search_id: search.id,
			results_raw: cachedResult.cached.results_raw,
			results_curated: cachedResult.cached.results_curated,
			cache_key: cachedResult.cacheKey
		});

		// Update search to completed status
		await DB.prepare(
			`UPDATE searches SET status = 'completed', completed_at = datetime('now'), credits_used = 0 WHERE id = ?`
		).bind(search.id).run();

		// Track cached search
		await trackEvent(DB, 'search_completed', locals.user.id, {
			search_id: search.id,
			cached: true
		});

		return json({
			success: true,
			data: {
				id: search.id,
				status: 'completed',
				cached: true
			}
		});
	}

	// Check credits (only if not cached)
	const credits = await getCreditBalance(DB, locals.user.id);
	if (credits < 1) {
		return json(
			{ error: { message: 'Insufficient credits', code: 'NO_CREDITS' } },
			{ status: 402 }
		);
	}

	// Get user profile for context
	const profile = await getProfileByUserId(DB, locals.user.id);

	// Create search record
	const search = await createSearch(DB, {
		user_id: locals.user.id,
		query_freeform: query,
		query_structured: structured ? JSON.stringify(structured) : undefined
	});

	// Build profile context for the job
	const profileContext: ProfileContext = {};
	if (profile) {
		if (profile.sizes) {
			try {
				profileContext.sizes = JSON.parse(profile.sizes);
			} catch {}
		}
		if (profile.color_preferences) {
			try {
				profileContext.color_preferences = JSON.parse(profile.color_preferences);
			} catch {}
		}
		if (profile.budget_min) profileContext.budget_min = profile.budget_min;
		if (profile.budget_max) profileContext.budget_max = profile.budget_max;
		if (profile.favorite_retailers) {
			try {
				profileContext.favorite_retailers = JSON.parse(profile.favorite_retailers);
			} catch {}
		}
		if (profile.excluded_retailers) {
			try {
				profileContext.excluded_retailers = JSON.parse(profile.excluded_retailers);
			} catch {}
		}
		if (profile.style_notes) profileContext.style_notes = profile.style_notes;
	}

	// Build job
	const job: SearchJob = {
		search_id: search.id,
		user_id: locals.user.id,
		query_freeform: query,
		query_structured: structured ?? null,
		profile: profileContext,
		searchProvider: searchProvider || 'brave',
		season: season ?? null
	};

	// Track search created
	await trackEvent(DB, 'search_created', locals.user.id, {
		search_id: search.id,
		has_structured: !!structured
	});

	// Check if queue is available (requires paid plan)
	if (SEARCH_QUEUE) {
		// Use queue for async processing
		await SEARCH_QUEUE.send(job);
		return json({
			success: true,
			data: {
				id: search.id,
				status: search.status
			}
		});
	}

	// No queue available - run search synchronously
	// This blocks the request but allows the app to work without paid queue feature
	const workerEnv = {
		DB,
		KV,
		ANTHROPIC_API_KEY: platform.env.ANTHROPIC_API_KEY,
		BRAVE_API_KEY: platform.env.BRAVE_API_KEY,
		TAVILY_API_KEY: platform.env.TAVILY_API_KEY || '',
		RESEND_API_KEY: platform.env.RESEND_API_KEY || '',
		SITE_URL: platform.env.SITE_URL || 'https://scout.grove.place'
	};

	// Process synchronously (this may take 30-60 seconds)
	await processSearchJob(job, workerEnv);

	return json({
		success: true,
		data: {
			id: search.id,
			status: 'running' // Will update to completed/failed during processing
		}
	});
};

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ error: { message: 'Unauthorized' } }, { status: 401 });
	}

	// This would be for listing searches, but we do it on dashboard
	return json({ error: { message: 'Use /dashboard for search list' } }, { status: 400 });
};
