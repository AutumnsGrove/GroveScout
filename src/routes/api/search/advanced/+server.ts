// Scout - Advanced Search API (Durable Object workflow)
// Endpoint: POST /api/search/advanced

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { SearchInputSchema } from '$lib/types';
import { getProfileByUserId, getCreditBalance, trackEvent } from '$lib/server/db';
import { findCachedSearch } from '$lib/server/cache';

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	if (!locals.user) {
		return json({ error: { message: 'Unauthorized' } }, { status: 401 });
	}

	if (!platform) {
		return json({ error: { message: 'Platform not available' } }, { status: 500 });
	}

	const { DB, KV, SEARCH_JOB } = platform.env;

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

	const { query, structured } = parseResult.data;

	// Check for cached results first (same as regular search)
	const cachedResult = await findCachedSearch(KV, query, structured);
	if (cachedResult) {
		// For advanced search, we could still return cached results but we'll treat as a new job?
		// For now, we'll return cached results immediately (same as regular search)
		// However, we want to demonstrate Durable Object workflow, so we can skip cache for advanced.
		// Let's decide to skip cache for advanced searches.
		// console.log('Cache hit for advanced search, but proceeding with DO workflow');
	}

	// Check credits (advanced search may cost more? we'll use 1 credit for now)
	const credits = await getCreditBalance(DB, locals.user.id);
	if (credits < 1) {
		return json(
			{ error: { message: 'Insufficient credits', code: 'NO_CREDITS' } },
			{ status: 402 }
		);
	}

	// Get user profile for context
	const profile = await getProfileByUserId(DB, locals.user.id);
	const profileContext = profile ? {
		sizes: profile.sizes ? JSON.parse(profile.sizes) : undefined,
		color_preferences: profile.color_preferences ? JSON.parse(profile.color_preferences) : undefined,
		budget_min: profile.budget_min,
		budget_max: profile.budget_max,
		favorite_retailers: profile.favorite_retailers ? JSON.parse(profile.favorite_retailers) : undefined,
		excluded_retailers: profile.excluded_retailers ? JSON.parse(profile.excluded_retailers) : undefined,
		style_notes: profile.style_notes,
	} : {};

	// Generate a unique job ID
	const jobId = crypto.randomUUID();
	// Create Durable Object stub
	const doId = SEARCH_JOB.idFromName(jobId);
	const stub = SEARCH_JOB.get(doId);

	// Build job payload
	const jobPayload = {
		user_id: locals.user.id,
		query_freeform: query,
		query_structured: structured ?? null,
		profile: profileContext,
	};

	// Forward request to DO's /start endpoint
	const doResponse = await stub.fetch('/start', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(jobPayload),
	});

	if (!doResponse.ok) {
		const error = await doResponse.text();
		return json({ error: { message: 'Failed to start job', details: error } }, { status: 500 });
	}

	const jobData = await doResponse.json();

	// Track event
	await trackEvent(DB, 'advanced_search_created', locals.user.id, {
		job_id: jobId,
		query,
	});

	return json({
		success: true,
		data: {
			id: jobId,
			status: 'running',
			do_id: doId.toString(),
			...jobData,
		},
	});
};

// GET endpoint to list advanced searches? Not needed for now.
export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ error: { message: 'Unauthorized' } }, { status: 401 });
	}
	return json({ error: { message: 'Use POST to start an advanced search' } }, { status: 400 });
};