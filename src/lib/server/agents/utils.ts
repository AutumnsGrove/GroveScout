// Scout Agent Utilities
// Shared utility functions for the search agent system

import type { SearchContext } from './types';

/**
 * Profile subset for vision-only analysis (colors and style)
 */
export interface StyleProfile {
	color_favorites?: string[];
	color_avoid?: string[];
	style_notes?: string;
}

/**
 * Build profile context for Claude prompts
 *
 * @param profile - User profile with style preferences
 * @param options - Formatting options
 * @returns Formatted markdown string for inclusion in prompts
 */
export function buildProfileContext(
	profile: SearchContext['profile'] | StyleProfile,
	options: {
		/** Header text (default: "## User Profile") */
		header?: string;
		/** Use bold markdown formatting (default: true) */
		bold?: boolean;
		/** Return empty string if no preferences (default: false) */
		returnEmptyIfNone?: boolean;
	} = {}
): string {
	const {
		header = '## User Profile',
		bold = true,
		returnEmptyIfNone = false
	} = options;

	const parts: string[] = [header];
	const fmt = (label: string) => (bold ? `**${label}:**` : `${label}:`);

	// Sizes (only in full profile)
	if ('sizes' in profile && profile.sizes && Object.keys(profile.sizes).length > 0) {
		parts.push(`${fmt('Sizes')} ${JSON.stringify(profile.sizes)}`);
	}

	// Colors
	if (profile.color_favorites?.length) {
		parts.push(`${fmt('Favorite Colors')} ${profile.color_favorites.join(', ')}`);
	}

	if (profile.color_avoid?.length) {
		parts.push(`${fmt('Colors to Avoid')} ${profile.color_avoid.join(', ')}`);
	}

	// Budget (only in full profile)
	if ('budget_min' in profile || 'budget_max' in profile) {
		const fullProfile = profile as SearchContext['profile'];
		if (fullProfile.budget_min || fullProfile.budget_max) {
			const min = fullProfile.budget_min ? `$${fullProfile.budget_min / 100}` : '$0';
			const max = fullProfile.budget_max ? `$${fullProfile.budget_max / 100}` : 'any';
			parts.push(`${fmt('Budget')} ${min} - ${max}`);
		}
	}

	// Retailers (only in full profile)
	if ('favorite_retailers' in profile) {
		const fullProfile = profile as SearchContext['profile'];
		if (fullProfile.favorite_retailers?.length) {
			parts.push(`${fmt('Preferred Retailers')} ${fullProfile.favorite_retailers.join(', ')}`);
		}
	}

	if ('excluded_retailers' in profile) {
		const fullProfile = profile as SearchContext['profile'];
		if (fullProfile.excluded_retailers?.length) {
			parts.push(`${fmt('Excluded Retailers')} ${fullProfile.excluded_retailers.join(', ')}`);
		}
	}

	// Style notes
	if (profile.style_notes) {
		parts.push(`${fmt('Style Notes')} ${profile.style_notes}`);
	}

	// Return empty if no preferences were added (only header)
	if (returnEmptyIfNone && parts.length === 1) {
		return '';
	}

	return parts.join('\n');
}

/**
 * Build style-focused profile context for vision analysis
 */
export function buildStyleProfileContext(profile: StyleProfile): string {
	return buildProfileContext(profile, {
		header: '## User Style Preferences',
		bold: false,
		returnEmptyIfNone: true
	});
}
