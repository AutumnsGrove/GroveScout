// Scout - Search Status/Results Page
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getSearchById, getSearchResultBySearchId } from '$lib/server/db';
import type { CuratedResults } from '$lib/types';

export const load: PageServerLoad = async ({ params, locals, platform }) => {
	if (!locals.user || !platform) {
		throw error(401, 'Unauthorized');
	}

	const { DB, R2 } = platform.env;
	const search = await getSearchById(DB, params.id);

	if (!search) {
		throw error(404, 'Search not found');
	}

	// Verify ownership
	if (search.user_id !== locals.user.id) {
		throw error(403, 'Not authorized to view this search');
	}

	let results: CuratedResults | null = null;
	let shareToken: string | null = null;

	if (search.status === 'completed') {
		// Pass R2 bucket to handle migrated results
		const searchResult = await getSearchResultBySearchId(DB, search.id, R2);
		if (searchResult) {
			try {
				results = JSON.parse(searchResult.results_curated);
				shareToken = searchResult.share_token;
			} catch {
				// Invalid JSON, leave results null
			}
		}
	}

	return {
		search: {
			id: search.id,
			query: search.query_freeform,
			status: search.status,
			error_message: search.error_message,
			credits_used: search.credits_used,
			created_at: search.created_at,
			completed_at: search.completed_at,
			// Token usage tracking
			tokens_input: search.tokens_input,
			tokens_output: search.tokens_output,
			api_calls_count: search.api_calls_count
		},
		results,
		shareToken
	};
};
