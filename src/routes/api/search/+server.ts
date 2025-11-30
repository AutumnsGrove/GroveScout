// Scout - Search API
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { SearchInputSchema, type SearchJob, type ProfileContext } from '$lib/types';
import { createSearch, getProfileByUserId, getCreditBalance } from '$lib/server/db';

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	if (!locals.user) {
		return json({ error: { message: 'Unauthorized' } }, { status: 401 });
	}

	if (!platform) {
		return json({ error: { message: 'Platform not available' } }, { status: 500 });
	}

	const { DB, SEARCH_QUEUE } = platform.env;

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

	// Check credits
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

	// Enqueue job
	const job: SearchJob = {
		search_id: search.id,
		user_id: locals.user.id,
		query_freeform: query,
		query_structured: structured ?? null,
		profile: profileContext
	};

	await SEARCH_QUEUE.send(job);

	return json({
		success: true,
		data: {
			id: search.id,
			status: search.status
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
