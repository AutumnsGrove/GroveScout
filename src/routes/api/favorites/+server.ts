// Scout - Favorites API
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { addFavorite, removeFavorite, getFavorites } from '$lib/server/db';

export const GET: RequestHandler = async ({ locals, platform }) => {
	if (!locals.user) {
		return json({ error: { message: 'Unauthorized' } }, { status: 401 });
	}

	if (!platform) {
		return json({ error: { message: 'Platform not available' } }, { status: 500 });
	}

	const { DB } = platform.env;
	const favorites = await getFavorites(DB, locals.user.id);

	return json({ success: true, data: favorites });
};

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	if (!locals.user) {
		return json({ error: { message: 'Unauthorized' } }, { status: 401 });
	}

	if (!platform) {
		return json({ error: { message: 'Platform not available' } }, { status: 500 });
	}

	const { DB } = platform.env;

	let body;
	try {
		body = await request.json();
	} catch {
		return json({ error: { message: 'Invalid JSON' } }, { status: 400 });
	}

	const { search_id, note } = body as { search_id?: string; note?: string };

	if (!search_id) {
		return json({ error: { message: 'search_id is required' } }, { status: 400 });
	}

	try {
		const favorite = await addFavorite(DB, locals.user.id, search_id, note);
		return json({ success: true, data: favorite });
	} catch (error) {
		// Likely duplicate
		return json({ error: { message: 'Already in favorites' } }, { status: 409 });
	}
};

export const DELETE: RequestHandler = async ({ request, locals, platform }) => {
	if (!locals.user) {
		return json({ error: { message: 'Unauthorized' } }, { status: 401 });
	}

	if (!platform) {
		return json({ error: { message: 'Platform not available' } }, { status: 500 });
	}

	const { DB } = platform.env;

	let body;
	try {
		body = await request.json();
	} catch {
		return json({ error: { message: 'Invalid JSON' } }, { status: 400 });
	}

	const { search_id } = body as { search_id?: string };

	if (!search_id) {
		return json({ error: { message: 'search_id is required' } }, { status: 400 });
	}

	await removeFavorite(DB, locals.user.id, search_id);
	return json({ success: true });
};
