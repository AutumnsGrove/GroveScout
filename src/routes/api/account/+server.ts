// Scout - Account Management API
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { trackEvent } from '$lib/server/db';

export const DELETE: RequestHandler = async ({ locals, platform }) => {
	if (!locals.user) {
		return json({ error: { message: 'Unauthorized' } }, { status: 401 });
	}

	if (!platform) {
		return json({ error: { message: 'Platform not available' } }, { status: 500 });
	}

	const { DB, KV } = platform.env;
	const userId = locals.user.id;

	try {
		// Delete all user data in order (respecting foreign keys)
		// 1. Delete push subscriptions
		await DB.prepare('DELETE FROM push_subscriptions WHERE user_id = ?').bind(userId).run();

		// 2. Delete webhooks
		await DB.prepare('DELETE FROM webhooks WHERE user_id = ?').bind(userId).run();

		// 3. Delete API keys
		await DB.prepare('DELETE FROM api_keys WHERE user_id = ?').bind(userId).run();

		// 4. Delete favorites
		await DB.prepare('DELETE FROM favorites WHERE user_id = ?').bind(userId).run();

		// 5. Delete email preferences
		await DB.prepare('DELETE FROM email_preferences WHERE user_id = ?').bind(userId).run();

		// 6. Delete referrals (both as referrer and referred)
		await DB.prepare('DELETE FROM referrals WHERE referrer_id = ? OR referred_id = ?')
			.bind(userId, userId)
			.run();

		// 7. Delete referral codes
		await DB.prepare('DELETE FROM referral_codes WHERE user_id = ?').bind(userId).run();

		// 8. Delete search results (via searches)
		await DB.prepare(
			`DELETE FROM search_results WHERE search_id IN (SELECT id FROM searches WHERE user_id = ?)`
		)
			.bind(userId)
			.run();

		// 9. Delete searches
		await DB.prepare('DELETE FROM searches WHERE user_id = ?').bind(userId).run();

		// 10. Delete credit ledger
		await DB.prepare('DELETE FROM credit_ledger WHERE user_id = ?').bind(userId).run();

		// 11. Delete subscriptions
		await DB.prepare('DELETE FROM subscriptions WHERE user_id = ?').bind(userId).run();

		// 12. Delete profile
		await DB.prepare('DELETE FROM profiles WHERE user_id = ?').bind(userId).run();

		// 13. Delete analytics events for this user
		await DB.prepare('DELETE FROM analytics_events WHERE user_id = ?').bind(userId).run();

		// 14. Finally, delete the user
		await DB.prepare('DELETE FROM users WHERE id = ?').bind(userId).run();

		// Delete session from KV
		if (locals.session) {
			await KV.delete(`session:${locals.session.id}`);
		}

		return json({ success: true, message: 'Account deleted successfully' });
	} catch (error) {
		console.error('[Account] Delete error:', error);
		return json({ error: { message: 'Failed to delete account' } }, { status: 500 });
	}
};

// Export account data
export const GET: RequestHandler = async ({ locals, platform }) => {
	if (!locals.user) {
		return json({ error: { message: 'Unauthorized' } }, { status: 401 });
	}

	if (!platform) {
		return json({ error: { message: 'Platform not available' } }, { status: 500 });
	}

	const { DB } = platform.env;
	const userId = locals.user.id;

	try {
		// Gather all user data
		const [user, profile, searches, credits, subscription] = await Promise.all([
			DB.prepare('SELECT id, email, auth_provider, created_at FROM users WHERE id = ?')
				.bind(userId)
				.first(),
			DB.prepare('SELECT * FROM profiles WHERE user_id = ?').bind(userId).first(),
			DB.prepare(
				`SELECT s.*, sr.results_curated
				 FROM searches s
				 LEFT JOIN search_results sr ON s.id = sr.search_id
				 WHERE s.user_id = ?
				 ORDER BY s.created_at DESC`
			)
				.bind(userId)
				.all(),
			DB.prepare('SELECT * FROM credit_ledger WHERE user_id = ? ORDER BY created_at DESC')
				.bind(userId)
				.all(),
			DB.prepare('SELECT * FROM subscriptions WHERE user_id = ?').bind(userId).first()
		]);

		const exportData = {
			exported_at: new Date().toISOString(),
			user,
			profile,
			searches: searches.results,
			credit_history: credits.results,
			subscription
		};

		// Track export
		await trackEvent(DB, 'profile_updated', userId, { action: 'data_export' });

		return new Response(JSON.stringify(exportData, null, 2), {
			headers: {
				'Content-Type': 'application/json',
				'Content-Disposition': `attachment; filename="scout-data-${userId}.json"`
			}
		});
	} catch (error) {
		console.error('[Account] Export error:', error);
		return json({ error: { message: 'Failed to export data' } }, { status: 500 });
	}
};
