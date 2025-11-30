// Scout - Theme Store
// Manages dark/light mode with persistence

import { browser } from '$app/environment';

export type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'scout-theme';

function getInitialTheme(): Theme {
	if (!browser) return 'system';

	const stored = localStorage.getItem(STORAGE_KEY);
	if (stored === 'light' || stored === 'dark' || stored === 'system') {
		return stored;
	}
	return 'system';
}

function getSystemTheme(): 'light' | 'dark' {
	if (!browser) return 'light';
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

class ThemeStore {
	theme = $state<Theme>(getInitialTheme());
	resolvedTheme = $derived(this.theme === 'system' ? getSystemTheme() : this.theme);

	constructor() {
		if (browser) {
			// Apply theme on init
			this.applyTheme();

			// Listen for system theme changes
			window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
				if (this.theme === 'system') {
					this.applyTheme();
				}
			});
		}
	}

	setTheme(newTheme: Theme) {
		this.theme = newTheme;
		if (browser) {
			localStorage.setItem(STORAGE_KEY, newTheme);
			this.applyTheme();
		}
	}

	private applyTheme() {
		if (!browser) return;

		const resolved = this.theme === 'system' ? getSystemTheme() : this.theme;
		document.documentElement.setAttribute('data-theme', resolved);
	}

	toggle() {
		const resolved = this.theme === 'system' ? getSystemTheme() : this.theme;
		this.setTheme(resolved === 'dark' ? 'light' : 'dark');
	}
}

export const themeStore = new ThemeStore();
