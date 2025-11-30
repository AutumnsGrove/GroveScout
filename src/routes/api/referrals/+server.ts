// Scout - Referrals API
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getReferralCode,
	createReferralCode,
	getReferrals,
	getReferralCodeByCode,
	applyReferral,
	hasBeenReferred
} from '$lib/server/db';

export const GET: RequestHandler = async ({ locals, platform }) => {
	if (!locals.user) {
		return json({ error: { message: 'Unauthorized' } }, { status: 401 });
	}

	if (!platform) {
		return json({ error: { message: 'Platform not available' } }, { status: 500 });
	}

	const { DB } = platform.env;

	// Get or create referral code
	let referralCode = await getReferralCode(DB, locals.user.id);
	if (!referralCode) {
		referralCode = await createReferralCode(DB, locals.user.id);
	}

	// Get referral history
	const referrals = await getReferrals(DB, locals.user.id);

	return json({
		success: true,
		data: {
			code: referralCode.code,
			uses_count: referralCode.uses_count,
			referrals: referrals.map((r) => ({
				credits_awarded: r.credits_awarded,
				created_at: r.created_at
			}))
		}
	});
};

// Apply a referral code
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

	const { code } = body as { code?: string };

	if (!code) {
		return json({ error: { message: 'code is required' } }, { status: 400 });
	}

	// Check if user has already been referred
	const alreadyReferred = await hasBeenReferred(DB, locals.user.id);
	if (alreadyReferred) {
		return json({ error: { message: 'You have already used a referral code' } }, { status: 400 });
	}

	// Find the referral code
	const referralCode = await getReferralCodeByCode(DB, code.toUpperCase());
	if (!referralCode) {
		return json({ error: { message: 'Invalid referral code' } }, { status: 404 });
	}

	// Can't use your own code
	if (referralCode.user_id === locals.user.id) {
		return json({ error: { message: 'You cannot use your own referral code' } }, { status: 400 });
	}

	// Apply referral - both users get 5 credits
	const creditsAwarded = 5;
	await applyReferral(DB, referralCode.user_id, locals.user.id, code.toUpperCase(), creditsAwarded);

	return json({
		success: true,
		data: {
			credits_awarded: creditsAwarded,
			message: `You received ${creditsAwarded} bonus credits!`
		}
	});
};
