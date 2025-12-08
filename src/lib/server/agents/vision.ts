// Scout - Vision Analysis Integration
// Uses Claude's vision capabilities for product image analysis and style matching
// Inspired by VisionBridge MCP server architecture

import Anthropic from '@anthropic-ai/sdk';
import { AGENT_CONFIG } from './config';
import { buildStyleProfileContext } from './utils';

// Configuration - uses AGENT_CONFIG for consistency
const IMAGE_VALIDATION_TIMEOUT_MS = AGENT_CONFIG.vision?.validationTimeoutMs || 10000;
const MAX_IMAGE_SIZE_BYTES = AGENT_CONFIG.vision?.maxImageSizeBytes || 10 * 1024 * 1024;

/**
 * Validate an image URL for SSRF protection
 * Blocks internal networks, cloud metadata, and unsafe protocols
 */
export function validateImageUrlSafety(urlString: string): string | null {
	if (!urlString || typeof urlString !== 'string') {
		return null;
	}

	try {
		const url = new URL(urlString);

		// Only allow HTTPS URLs
		if (url.protocol !== 'https:') {
			console.warn(`[Vision] Rejected non-HTTPS URL: ${url.protocol}`);
			return null;
		}

		// Block URLs with credentials
		if (url.username || url.password) {
			console.warn('[Vision] Rejected URL with credentials');
			return null;
		}

		const hostname = url.hostname.toLowerCase();

		// Block localhost
		if (hostname === 'localhost' || hostname === 'localhost.localdomain') {
			console.warn('[Vision] Rejected localhost URL');
			return null;
		}

		// Block cloud metadata endpoints (AWS, GCP, Azure, etc.)
		if (
			hostname === '169.254.169.254' ||
			hostname === 'metadata.google.internal' ||
			hostname === 'metadata.goog' ||
			hostname.endsWith('.internal')
		) {
			console.warn('[Vision] Rejected cloud metadata URL');
			return null;
		}

		// Block private/internal IP ranges
		const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
		if (ipv4Match) {
			const [, a, b, c] = ipv4Match.map(Number);

			// 127.x.x.x (loopback)
			if (a === 127) {
				console.warn('[Vision] Rejected loopback IP');
				return null;
			}
			// 10.x.x.x (private)
			if (a === 10) {
				console.warn('[Vision] Rejected private IP (10.x.x.x)');
				return null;
			}
			// 192.168.x.x (private)
			if (a === 192 && b === 168) {
				console.warn('[Vision] Rejected private IP (192.168.x.x)');
				return null;
			}
			// 172.16.x.x - 172.31.x.x (private)
			if (a === 172 && b >= 16 && b <= 31) {
				console.warn('[Vision] Rejected private IP (172.16-31.x.x)');
				return null;
			}
			// 169.254.x.x (link-local, includes AWS metadata)
			if (a === 169 && b === 254) {
				console.warn('[Vision] Rejected link-local IP');
				return null;
			}
			// 0.x.x.x (invalid)
			if (a === 0) {
				console.warn('[Vision] Rejected invalid IP (0.x.x.x)');
				return null;
			}
		}

		// Block IPv6 localhost and private ranges
		if (
			hostname === '::1' ||
			hostname === '[::1]' ||
			hostname.startsWith('fe80:') ||
			hostname.startsWith('fc00:') ||
			hostname.startsWith('fd00:')
		) {
			console.warn('[Vision] Rejected IPv6 private/localhost');
			return null;
		}

		return urlString;
	} catch {
		console.warn('[Vision] Failed to parse URL');
		return null;
	}
}

export interface ImageAnalysisResult {
	description: string;
	colors: string[];
	style_tags: string[];
	quality_score: number; // 0-100
	matches_profile: boolean;
	match_reasons: string[];
}

export interface StyleComparisonResult {
	similarity_score: number; // 0-100
	differences: string[];
	recommendations: string[];
}

/**
 * Analyze a product image for style attributes
 */
export async function analyzeProductImage(
	anthropicApiKey: string,
	imageUrl: string,
	userProfile: {
		color_favorites?: string[];
		color_avoid?: string[];
		style_notes?: string;
	}
): Promise<ImageAnalysisResult> {
	// SSRF protection: validate URL before sending to vision API
	const validatedUrl = validateImageUrlSafety(imageUrl);
	if (!validatedUrl) {
		throw new Error('Invalid or unsafe image URL');
	}

	const anthropic = new Anthropic({ apiKey: anthropicApiKey });

	const profileContext = buildStyleProfileContext(userProfile);

	const response = await anthropic.messages.create({
		model: AGENT_CONFIG.model.vision,
		max_tokens: 1000,
		messages: [
			{
				role: 'user',
				content: [
					{
						type: 'image',
						source: {
							type: 'url',
							url: validatedUrl,
						},
					},
					{
						type: 'text',
						text: `Analyze this product image for a shopping assistant.

${profileContext}

Provide a JSON response with:
{
  "description": "Brief product description",
  "colors": ["primary color", "secondary color"],
  "style_tags": ["casual", "modern", etc.],
  "quality_score": 0-100 based on image quality and product presentation,
  "matches_profile": true/false based on user preferences,
  "match_reasons": ["reason 1", "reason 2"]
}

Only output valid JSON.`
					}
				]
			}
		]
	});

	const content = response.content[0];
	if (content.type !== 'text') {
		throw new Error('Unexpected response type from vision API');
	}

	try {
		// Parse JSON from response
		const jsonMatch = content.text.match(/\{[\s\S]*\}/);
		if (jsonMatch) {
			return JSON.parse(jsonMatch[0]);
		}
	} catch {
		// Return default if parsing fails
	}

	return {
		description: 'Unable to analyze image',
		colors: [],
		style_tags: [],
		quality_score: 50,
		matches_profile: true, // Default to true to not filter out products
		match_reasons: []
	};
}

/**
 * Compare a product image against a reference style
 */
export async function compareProductStyle(
	anthropicApiKey: string,
	productImageUrl: string,
	referenceImageUrl: string,
	context?: string
): Promise<StyleComparisonResult> {
	// SSRF protection: validate both URLs before sending to vision API
	const validatedProductUrl = validateImageUrlSafety(productImageUrl);
	const validatedReferenceUrl = validateImageUrlSafety(referenceImageUrl);

	if (!validatedProductUrl || !validatedReferenceUrl) {
		throw new Error('Invalid or unsafe image URL');
	}

	const anthropic = new Anthropic({ apiKey: anthropicApiKey });

	const response = await anthropic.messages.create({
		model: AGENT_CONFIG.model.vision,
		max_tokens: 1000,
		messages: [
			{
				role: 'user',
				content: [
					{
						type: 'text',
						text: 'REFERENCE IMAGE (style to match):'
					},
					{
						type: 'image',
						source: {
							type: 'url',
							url: validatedReferenceUrl,
						},
					},
					{
						type: 'text',
						text: 'PRODUCT IMAGE (to compare):'
					},
					{
						type: 'image',
						source: {
							type: 'url',
							url: validatedProductUrl,
						},
					},
					{
						type: 'text',
						text: `Compare these images for style similarity.
${context ? `Context: ${context}` : ''}

Provide a JSON response with:
{
  "similarity_score": 0-100,
  "differences": ["difference 1", "difference 2"],
  "recommendations": ["recommendation 1"]
}

Only output valid JSON.`
					}
				]
			}
		]
	});

	const content = response.content[0];
	if (content.type !== 'text') {
		throw new Error('Unexpected response type from vision API');
	}

	try {
		const jsonMatch = content.text.match(/\{[\s\S]*\}/);
		if (jsonMatch) {
			return JSON.parse(jsonMatch[0]);
		}
	} catch {
		// Return default if parsing fails
	}

	return {
		similarity_score: 50,
		differences: [],
		recommendations: []
	};
}

/**
 * Extract text/pricing from a product screenshot
 */
export async function extractProductInfo(
	anthropicApiKey: string,
	imageUrl: string
): Promise<{
	product_name?: string;
	price?: string;
	original_price?: string;
	retailer?: string;
	in_stock?: boolean;
}> {
	// SSRF protection: validate URL before sending to vision API
	const validatedUrl = validateImageUrlSafety(imageUrl);
	if (!validatedUrl) {
		throw new Error('Invalid or unsafe image URL');
	}

	const anthropic = new Anthropic({ apiKey: anthropicApiKey });

	const response = await anthropic.messages.create({
		model: AGENT_CONFIG.model.vision,
		max_tokens: 500,
		messages: [
			{
				role: 'user',
				content: [
					{
						type: 'image',
						source: {
							type: 'url',
							url: validatedUrl,
						},
					},
					{
						type: 'text',
						text: `Extract product information from this image/screenshot.

Provide a JSON response with:
{
  "product_name": "Full product name if visible",
  "price": "Current price if visible (e.g., '$49.99')",
  "original_price": "Original/crossed-out price if on sale",
  "retailer": "Store name if visible",
  "in_stock": true/false if stock status visible
}

Only include fields you can clearly see. Only output valid JSON.`
					}
				]
			}
		]
	});

	const content = response.content[0];
	if (content.type !== 'text') {
		return {};
	}

	try {
		const jsonMatch = content.text.match(/\{[\s\S]*\}/);
		if (jsonMatch) {
			return JSON.parse(jsonMatch[0]);
		}
	} catch {
		// Return empty if parsing fails
	}

	return {};
}

// buildStyleProfileContext is imported from ./utils

/**
 * Validate that an image URL is accessible and appropriate
 * Uses timeout to prevent hanging on slow servers
 * Note: Also performs SSRF validation before making the request
 */
export async function validateImageUrl(imageUrl: string): Promise<boolean> {
	// First validate for SSRF
	const safeUrl = validateImageUrlSafety(imageUrl);
	if (!safeUrl) {
		return false;
	}

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), IMAGE_VALIDATION_TIMEOUT_MS);

	try {
		const response = await fetch(safeUrl, {
			method: 'HEAD',
			signal: controller.signal
		});
		clearTimeout(timeout);

		if (!response.ok) return false;

		const contentType = response.headers.get('content-type');
		if (!contentType?.startsWith('image/')) return false;

		// Check content length isn't too large
		const contentLength = response.headers.get('content-length');
		if (contentLength && parseInt(contentLength) > MAX_IMAGE_SIZE_BYTES) return false;

		return true;
	} catch {
		clearTimeout(timeout);
		return false;
	}
}
