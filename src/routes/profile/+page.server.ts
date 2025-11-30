// Scout - Profile Page
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getProfileByUserId } from '$lib/server/db';
import type { ProfileSizes, ColorPreferences } from '$lib/types';

export const load: PageServerLoad = async ({ locals, platform }) => {
	if (!locals.user || !platform) {
		throw error(401, 'Unauthorized');
	}

	const { DB } = platform.env;
	const profile = await getProfileByUserId(DB, locals.user.id);

	if (!profile) {
		throw error(404, 'Profile not found');
	}

	// Parse JSON fields
	let sizes: ProfileSizes = {};
	let colorPreferences: ColorPreferences = { favorites: [], avoid: [] };
	let favoriteRetailers: string[] = [];
	let excludedRetailers: string[] = [];

	try {
		if (profile.sizes) sizes = JSON.parse(profile.sizes);
	} catch {}
	try {
		if (profile.color_preferences) colorPreferences = JSON.parse(profile.color_preferences);
	} catch {}
	try {
		if (profile.favorite_retailers) favoriteRetailers = JSON.parse(profile.favorite_retailers);
	} catch {}
	try {
		if (profile.excluded_retailers) excludedRetailers = JSON.parse(profile.excluded_retailers);
	} catch {}

	return {
		profile: {
			display_name: profile.display_name ?? '',
			sizes,
			color_preferences: colorPreferences,
			budget_min: profile.budget_min ? profile.budget_min / 100 : null, // Convert cents to dollars
			budget_max: profile.budget_max ? profile.budget_max / 100 : null,
			favorite_retailers: favoriteRetailers,
			excluded_retailers: excludedRetailers,
			style_notes: profile.style_notes ?? ''
		}
	};
};
