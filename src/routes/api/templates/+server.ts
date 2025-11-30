// Scout - Search Templates API
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSearchTemplates, getSearchTemplate, incrementTemplateUsage } from '$lib/server/db';

export const GET: RequestHandler = async ({ url, platform }) => {
	if (!platform) {
		return json({ error: { message: 'Platform not available' } }, { status: 500 });
	}

	const { DB } = platform.env;
	const category = url.searchParams.get('category') ?? undefined;

	const templates = await getSearchTemplates(DB, category);

	return json({ success: true, data: templates });
};

// Track template usage
export const POST: RequestHandler = async ({ request, platform }) => {
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

	const { template_id } = body as { template_id?: string };

	if (!template_id) {
		return json({ error: { message: 'template_id is required' } }, { status: 400 });
	}

	const template = await getSearchTemplate(DB, template_id);
	if (!template) {
		return json({ error: { message: 'Template not found' } }, { status: 404 });
	}

	await incrementTemplateUsage(DB, template_id);

	return json({ success: true, data: template });
};
