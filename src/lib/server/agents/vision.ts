// Scout - Vision Analysis Integration
// Uses Claude's vision capabilities for product image analysis and style matching
// Inspired by VisionBridge MCP server architecture

import Anthropic from '@anthropic-ai/sdk';
import { AGENT_CONFIG } from './config';

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
	const anthropic = new Anthropic({ apiKey: anthropicApiKey });

	const profileContext = buildProfileContext(userProfile);

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
							url: imageUrl,
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
							url: referenceImageUrl,
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
							url: productImageUrl,
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
							url: imageUrl,
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

/**
 * Build user profile context for vision analysis
 */
function buildProfileContext(profile: {
	color_favorites?: string[];
	color_avoid?: string[];
	style_notes?: string;
}): string {
	const parts: string[] = ['## User Style Preferences'];

	if (profile.color_favorites?.length) {
		parts.push(`Favorite colors: ${profile.color_favorites.join(', ')}`);
	}

	if (profile.color_avoid?.length) {
		parts.push(`Colors to avoid: ${profile.color_avoid.join(', ')}`);
	}

	if (profile.style_notes) {
		parts.push(`Style notes: ${profile.style_notes}`);
	}

	if (parts.length === 1) {
		return ''; // No preferences set
	}

	return parts.join('\n');
}

/**
 * Validate that an image URL is accessible and appropriate
 * Uses timeout to prevent hanging on slow servers
 */
export async function validateImageUrl(imageUrl: string): Promise<boolean> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 5000); // 5 second timeout

	try {
		const response = await fetch(imageUrl, {
			method: 'HEAD',
			signal: controller.signal
		});
		clearTimeout(timeout);

		if (!response.ok) return false;

		const contentType = response.headers.get('content-type');
		if (!contentType?.startsWith('image/')) return false;

		// Check content length isn't too large (10MB limit)
		const contentLength = response.headers.get('content-length');
		if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) return false;

		return true;
	} catch {
		clearTimeout(timeout);
		return false;
	}
}
