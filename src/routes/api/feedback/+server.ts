// Scout - User Feedback API
// Collects user feedback on product recommendations for model improvement

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';

const FeedbackSchema = z.object({
	search_id: z.string().min(1),
	product_id: z.string().optional(),
	feedback_type: z.enum(['up', 'down']),
	product_name: z.string().optional(),
	product_url: z.string().url().optional()
});

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	if (!locals.user) {
		return json({ error: { message: 'Unauthorized' } }, { status: 401 });
	}

	if (!platform) {
		return json({ error: { message: 'Platform not available' } }, { status: 500 });
	}

	const { DB } = platform.env;

	// Parse and validate input
	let body;
	try {
		body = await request.json();
	} catch {
		return json({ error: { message: 'Invalid JSON' } }, { status: 400 });
	}

	const parseResult = FeedbackSchema.safeParse(body);
	if (!parseResult.success) {
		return json(
			{ error: { message: 'Invalid input', details: parseResult.error.issues } },
			{ status: 400 }
		);
	}

	const { search_id, product_id, feedback_type, product_name, product_url } = parseResult.data;

	try {
		// Store feedback in database
		await DB.prepare(
			`INSERT INTO user_feedback (
				user_id, search_id, product_id, feedback_type,
				product_name, product_url, created_at
			) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
			ON CONFLICT (user_id, search_id, product_url)
			DO UPDATE SET feedback_type = excluded.feedback_type, created_at = datetime('now')`
		)
			.bind(
				locals.user.id,
				search_id,
				product_id || null,
				feedback_type,
				product_name || null,
				product_url || null
			)
			.run();

		return json({ success: true });
	} catch (err) {
		console.error('Failed to store feedback:', err);
		// Return failure with generic message - frontend can handle gracefully
		// Don't expose internal error details but let caller know it failed
		return json({ success: false, error: 'Failed to save feedback' }, { status: 500 });
	}
};

// Get feedback stats for a search (optional)
export const GET: RequestHandler = async ({ url, locals, platform }) => {
	if (!locals.user) {
		return json({ error: { message: 'Unauthorized' } }, { status: 401 });
	}

	if (!platform) {
		return json({ error: { message: 'Platform not available' } }, { status: 500 });
	}

	const { DB } = platform.env;
	const search_id = url.searchParams.get('search_id');

	if (!search_id) {
		return json({ error: { message: 'search_id required' } }, { status: 400 });
	}

	try {
		const result = await DB.prepare(
			`SELECT
				feedback_type,
				COUNT(*) as count
			FROM user_feedback
			WHERE user_id = ? AND search_id = ?
			GROUP BY feedback_type`
		)
			.bind(locals.user.id, search_id)
			.all();

		const stats = {
			up: 0,
			down: 0
		};

		for (const row of result.results || []) {
			const r = row as { feedback_type: string; count: number };
			if (r.feedback_type === 'up') stats.up = r.count;
			if (r.feedback_type === 'down') stats.down = r.count;
		}

		return json({ success: true, data: stats });
	} catch (err) {
		console.error('Failed to get feedback stats:', err);
		// Return failure with generic message - don't hide errors
		return json({ success: false, error: 'Failed to retrieve feedback stats' }, { status: 500 });
	}
};
