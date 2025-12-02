import grovePreset from './src/lib/tailwind.preset.js';

/** @type {import('tailwindcss').Config} */
export default {
	presets: [grovePreset],
	content: [
		'./src/**/*.{html,js,svelte,ts}'
	],
	darkMode: 'class',
	theme: {
		extend: {
			// Scout-specific color overrides
			colors: {
				// Scout brand accent - a vibrant teal for deals/savings
				scout: {
					50: '#f0fdfa',
					100: '#ccfbf1',
					200: '#99f6e4',
					300: '#5eead4',
					400: '#2dd4bf',
					500: '#14b8a6',
					600: '#0d9488',
					700: '#0f766e',
					800: '#115e59',
					900: '#134e4a',
					950: '#042f2e',
				},
			},
			// Extend animations for Scout-specific effects
			animation: {
				'search-pulse': 'search-pulse 2s ease-in-out infinite',
				'deal-pop': 'deal-pop 0.4s ease-out',
				'score-fill': 'score-fill 0.8s ease-out',
			},
			keyframes: {
				'search-pulse': {
					'0%, 100%': { boxShadow: '0 0 0 0 rgba(20, 184, 166, 0.4)' },
					'50%': { boxShadow: '0 0 0 12px rgba(20, 184, 166, 0)' },
				},
				'deal-pop': {
					'0%': { transform: 'scale(0.9)', opacity: '0' },
					'50%': { transform: 'scale(1.02)' },
					'100%': { transform: 'scale(1)', opacity: '1' },
				},
				'score-fill': {
					'0%': { width: '0%' },
					'100%': { width: 'var(--score-width)' },
				},
			},
		},
	},
	plugins: [],
};
