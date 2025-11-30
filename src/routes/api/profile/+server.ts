// Scout - Profile API
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ProfileUpdateSchema } from '$lib/types';
import { getProfileByUserId, updateProfile } from '$lib/server/db';

export const GET: RequestHandler = async ({ locals, platform }) => {
	if (!locals.user) {
		return json({ error: { message: 'Unauthorized' } }, { status: 401 });
	}

	if (!platform) {
		return json({ error: { message: 'Platform not available' } }, { status: 500 });
	}

	const { DB } = platform.env;
	const profile = await getProfileByUserId(DB, locals.user.id);

	if (!profile) {
		return json({ error: { message: 'Profile not found' } }, { status: 404 });
	}

	return json({ success: true, data: profile });
};

export const PUT: RequestHandler = async ({ request, locals, platform }) => {
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

	const parseResult = ProfileUpdateSchema.safeParse(body);
	if (!parseResult.success) {
		return json(
			{ error: { message: 'Invalid input', details: parseResult.error.issues } },
			{ status: 400 }
		);
	}

	const data = parseResult.data;

	// Build update object (convert to JSON strings where needed)
	const updateData: Record<string, unknown> = {};

	if (data.display_name !== undefined) {
		updateData.display_name = data.display_name;
	}
	if (data.sizes !== undefined) {
		updateData.sizes = JSON.stringify(data.sizes);
	}
	if (data.color_preferences !== undefined) {
		updateData.color_preferences = JSON.stringify(data.color_preferences);
	}
	if (data.budget_min !== undefined) {
		updateData.budget_min = data.budget_min;
	}
	if (data.budget_max !== undefined) {
		updateData.budget_max = data.budget_max;
	}
	if (data.favorite_retailers !== undefined) {
		updateData.favorite_retailers = JSON.stringify(data.favorite_retailers);
	}
	if (data.excluded_retailers !== undefined) {
		updateData.excluded_retailers = JSON.stringify(data.excluded_retailers);
	}
	if (data.style_notes !== undefined) {
		updateData.style_notes = data.style_notes;
	}

	await updateProfile(DB, locals.user.id, updateData);

	return json({ success: true });
};
