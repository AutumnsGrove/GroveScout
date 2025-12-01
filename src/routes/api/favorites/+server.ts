// Scout - Favorites API
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { addFavorite, removeFavorite, getFavorites, getSearchById } from '$lib/server/db';

// Input validation schemas
const AddFavoriteSchema = z.object({
	search_id: z.string().uuid(),
	note: z.string().max(500).optional()
});

const RemoveFavoriteSchema = z.object({
	search_id: z.string().uuid()
});

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

	// Validate input with Zod
	const parseResult = AddFavoriteSchema.safeParse(body);
	if (!parseResult.success) {
		return json({ error: { message: 'Invalid input' } }, { status: 400 });
	}

	const { search_id, note } = parseResult.data;

	// SECURITY: Verify the search belongs to the current user (IDOR prevention)
	const search = await getSearchById(DB, search_id);
	if (!search) {
		return json({ error: { message: 'Search not found' } }, { status: 404 });
	}

	if (search.user_id !== locals.user.id) {
		// Don't reveal whether the search exists for other users
		return json({ error: { message: 'Search not found' } }, { status: 404 });
	}

	try {
		const favorite = await addFavorite(DB, locals.user.id, search_id, note);
		return json({ success: true, data: favorite });
	} catch {
		// Likely duplicate - use generic error
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

	// Validate input with Zod
	const parseResult = RemoveFavoriteSchema.safeParse(body);
	if (!parseResult.success) {
		return json({ error: { message: 'Invalid search_id format' } }, { status: 400 });
	}

	const { search_id } = parseResult.data;

	// removeFavorite already filters by user_id, so this is safe
	await removeFavorite(DB, locals.user.id, search_id);
	return json({ success: true });
};
