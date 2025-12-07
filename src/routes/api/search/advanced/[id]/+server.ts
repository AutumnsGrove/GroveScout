// Scout - Advanced Search Job Management API
// Endpoints:
//   GET /api/search/advanced/[id] -> status
//   GET /api/search/advanced/[id]/results -> results
//   GET /api/search/advanced/[id]/stream -> SSE stream
//   GET /api/search/advanced/[id]/followup -> get follow-up quiz
//   POST /api/search/advanced/[id]/followup -> submit follow-up answers
//   POST /api/search/advanced/[id]/resume -> resume job
//   POST /api/search/advanced/[id]/cancel -> cancel job

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, platform, url }) => {
	const { id } = params;
	if (!platform?.env.SEARCH_JOB) {
		return json({ error: { message: 'Platform not available' } }, { status: 500 });
	}

	const SEARCH_JOB = platform.env.SEARCH_JOB;
	const doId = SEARCH_JOB.idFromName(id);
	const stub = SEARCH_JOB.get(doId);

	// Determine which subpath
	const path = url.pathname;
	if (path.endsWith('/results')) {
		return await stub.fetch('/results');
	}
	if (path.endsWith('/stream')) {
		return await stub.fetch('/stream');
	}
	if (path.endsWith('/followup')) {
		return await stub.fetch('/followup');
	}
	// Default: status
	return await stub.fetch('/status');
};

export const POST: RequestHandler = async ({ params, request, platform, url }) => {
	const { id } = params;
	if (!platform?.env.SEARCH_JOB) {
		return json({ error: { message: 'Platform not available' } }, { status: 500 });
	}

	const SEARCH_JOB = platform.env.SEARCH_JOB;
	const doId = SEARCH_JOB.idFromName(id);
	const stub = SEARCH_JOB.get(doId);

	const path = url.pathname;
	if (path.endsWith('/followup')) {
		return await stub.fetch('/followup', {
			method: 'POST',
			headers: request.headers,
			body: await request.text(),
		});
	}
	if (path.endsWith('/resume')) {
		return await stub.fetch('/resume', {
			method: 'POST',
		});
	}
	if (path.endsWith('/cancel')) {
		return await stub.fetch('/cancel', {
			method: 'POST',
		});
	}

	return json({ error: { message: 'Invalid endpoint' } }, { status: 404 });
};