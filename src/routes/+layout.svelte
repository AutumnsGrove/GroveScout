<script lang="ts">
	import '../app.css';
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { Icons, CreditBalance } from '$lib/components/scout';

	let { children, data } = $props();

	let mobileMenuOpen = $state(false);
	let userMenuOpen = $state(false);
	let isDark = $state(false);

	function toggleMobileMenu() {
		mobileMenuOpen = !mobileMenuOpen;
		if (mobileMenuOpen) userMenuOpen = false;
	}

	function toggleUserMenu() {
		userMenuOpen = !userMenuOpen;
	}

	function closeMenus() {
		mobileMenuOpen = false;
		userMenuOpen = false;
	}

	function toggleTheme() {
		isDark = !isDark;
		if (browser) {
			document.documentElement.classList.toggle('dark', isDark);
			localStorage.setItem('theme', isDark ? 'dark' : 'light');
		}
	}

	// Check active nav link
	const isActive = (path: string) => $page.url.pathname === path || $page.url.pathname.startsWith(path + '/');

	onMount(() => {
		// Initialize theme
		if (browser) {
			const savedTheme = localStorage.getItem('theme');
			const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
			isDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
			document.documentElement.classList.toggle('dark', isDark);
		}

		// Register service worker for PWA
		if (browser && 'serviceWorker' in navigator) {
			navigator.serviceWorker.register('/sw.js').catch((err) => {
				console.error('Service worker registration failed:', err);
			});
		}
	});
</script>

<svelte:head>
	<title>Scout - Your Personal Deal Hunter</title>
	<meta name="description" content="AI-powered shopping research that finds the best deals for you." />
	<link rel="icon" href="/favicon.svg" />
	<link rel="manifest" href="/manifest.json" />
	<meta name="theme-color" content="#16a34a" />
	<meta name="apple-mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-status-bar-style" content="default" />
	<meta name="apple-mobile-web-app-title" content="Scout" />
</svelte:head>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="app min-h-screen flex flex-col bg-cream dark:bg-bark-900" onclick={closeMenus}>
	<!-- Header -->
	<header class="sticky top-0 z-50 bg-cream/80 dark:bg-bark-900/80 backdrop-blur-grove border-b border-cream-400 dark:border-bark-700">
		<nav class="scout-container h-16 flex items-center justify-between">
			<!-- Logo -->
			<a href="/" class="flex items-center gap-2 text-grove-600 dark:text-grove-400 font-bold text-xl hover:text-grove-700 dark:hover:text-grove-300 transition-colors">
				<div class="w-8 h-8 bg-grove-500 rounded-grove flex items-center justify-center">
					<Icons name="search" size="sm" class="text-white" />
				</div>
				<span class="font-serif">Scout</span>
			</a>

			<!-- Desktop Navigation -->
			<div class="hidden md:flex items-center gap-6">
				{#if data.user}
					<a href="/dashboard" class="scout-nav-link {isActive('/dashboard') ? 'scout-nav-link-active' : ''}">
						Dashboard
					</a>
					<a href="/search/new" class="scout-btn-primary">
						<Icons name="sparkles" size="sm" />
						New Search
					</a>
					<CreditBalance credits={data.credits || 0} variant="compact" size="sm" />

					<!-- Theme Toggle -->
					<button onclick={toggleTheme} class="scout-btn-ghost p-2" aria-label="Toggle theme">
						<Icons name={isDark ? 'sun' : 'moon'} size="md" />
					</button>

					<!-- User Menu -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div class="relative" onclick={(e) => e.stopPropagation()}>
						<button onclick={toggleUserMenu} class="flex items-center gap-2 p-1 rounded-full hover:bg-cream-200 dark:hover:bg-bark-700 transition-colors">
							<div class="w-9 h-9 bg-grove-500 text-white rounded-full flex items-center justify-center font-semibold text-sm">
								{data.user.email[0].toUpperCase()}
							</div>
							<Icons name="chevron-down" size="sm" class="text-bark-400 dark:text-cream-500" />
						</button>

						{#if userMenuOpen}
							<div class="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-bark-800 rounded-grove-lg shadow-grove-lg border border-cream-300 dark:border-bark-600 py-2 animate-fade-in-down">
								<div class="px-4 py-2 border-b border-cream-200 dark:border-bark-600">
									<p class="text-sm font-medium text-bark dark:text-cream truncate">{data.user.email}</p>
								</div>
								<a href="/profile" onclick={closeMenus} class="flex items-center gap-3 px-4 py-2.5 text-sm text-bark-600 dark:text-cream-400 hover:bg-cream-100 dark:hover:bg-bark-700 transition-colors">
									<Icons name="user" size="sm" />
									Profile
								</a>
								<a href="/settings" onclick={closeMenus} class="flex items-center gap-3 px-4 py-2.5 text-sm text-bark-600 dark:text-cream-400 hover:bg-cream-100 dark:hover:bg-bark-700 transition-colors">
									<Icons name="settings" size="sm" />
									Settings
								</a>
								<a href="/pricing" onclick={closeMenus} class="flex items-center gap-3 px-4 py-2.5 text-sm text-bark-600 dark:text-cream-400 hover:bg-cream-100 dark:hover:bg-bark-700 transition-colors">
									<Icons name="credits" size="sm" />
									Pricing
								</a>
								<div class="border-t border-cream-200 dark:border-bark-600 mt-2 pt-2">
									<a href="/auth/logout" onclick={closeMenus} class="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
										<Icons name="logout" size="sm" />
										Sign Out
									</a>
								</div>
							</div>
						{/if}
					</div>
				{:else}
					<button onclick={toggleTheme} class="scout-btn-ghost p-2" aria-label="Toggle theme">
						<Icons name={isDark ? 'sun' : 'moon'} size="md" />
					</button>
					<a href="/pricing" class="scout-nav-link">Pricing</a>
					<a href="/auth/login" class="scout-btn-primary">
						Get Started
					</a>
				{/if}
			</div>

			<!-- Mobile Menu Button -->
			<button
				class="md:hidden scout-btn-ghost p-2"
				onclick={(e) => { e.stopPropagation(); toggleMobileMenu(); }}
				aria-label="Menu"
			>
				<Icons name={mobileMenuOpen ? 'close' : 'menu'} size="lg" />
			</button>
		</nav>

		<!-- Mobile Navigation -->
		{#if mobileMenuOpen}
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="md:hidden bg-white dark:bg-bark-800 border-t border-cream-300 dark:border-bark-600 animate-slide-in-down"
				onclick={(e) => e.stopPropagation()}
			>
				<div class="scout-container py-4 space-y-1">
					{#if data.user}
						<div class="flex items-center gap-3 p-3 mb-2 bg-cream-100 dark:bg-bark-700 rounded-grove">
							<div class="w-10 h-10 bg-grove-500 text-white rounded-full flex items-center justify-center font-semibold">
								{data.user.email[0].toUpperCase()}
							</div>
							<div class="flex-1 min-w-0">
								<p class="text-sm font-medium text-bark dark:text-cream truncate">{data.user.email}</p>
								<CreditBalance credits={data.credits || 0} variant="compact" size="sm" />
							</div>
						</div>
						<a href="/dashboard" onclick={closeMenus} class="flex items-center gap-3 p-3 text-bark-600 dark:text-cream-400 hover:bg-cream-100 dark:hover:bg-bark-700 rounded-grove transition-colors">
							<Icons name="shopping-bag" size="md" />
							Dashboard
						</a>
						<a href="/search/new" onclick={closeMenus} class="flex items-center gap-3 p-3 text-bark-600 dark:text-cream-400 hover:bg-cream-100 dark:hover:bg-bark-700 rounded-grove transition-colors">
							<Icons name="sparkles" size="md" />
							New Search
						</a>
						<a href="/profile" onclick={closeMenus} class="flex items-center gap-3 p-3 text-bark-600 dark:text-cream-400 hover:bg-cream-100 dark:hover:bg-bark-700 rounded-grove transition-colors">
							<Icons name="user" size="md" />
							Profile
						</a>
						<a href="/settings" onclick={closeMenus} class="flex items-center gap-3 p-3 text-bark-600 dark:text-cream-400 hover:bg-cream-100 dark:hover:bg-bark-700 rounded-grove transition-colors">
							<Icons name="settings" size="md" />
							Settings
						</a>
						<a href="/pricing" onclick={closeMenus} class="flex items-center gap-3 p-3 text-bark-600 dark:text-cream-400 hover:bg-cream-100 dark:hover:bg-bark-700 rounded-grove transition-colors">
							<Icons name="credits" size="md" />
							Pricing
						</a>
						<div class="border-t border-cream-200 dark:border-bark-600 my-2"></div>
						<button onclick={toggleTheme} class="flex items-center gap-3 p-3 w-full text-left text-bark-600 dark:text-cream-400 hover:bg-cream-100 dark:hover:bg-bark-700 rounded-grove transition-colors">
							<Icons name={isDark ? 'sun' : 'moon'} size="md" />
							{isDark ? 'Light Mode' : 'Dark Mode'}
						</button>
						<a href="/auth/logout" onclick={closeMenus} class="flex items-center gap-3 p-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-grove transition-colors">
							<Icons name="logout" size="md" />
							Sign Out
						</a>
					{:else}
						<a href="/pricing" onclick={closeMenus} class="flex items-center gap-3 p-3 text-bark-600 dark:text-cream-400 hover:bg-cream-100 dark:hover:bg-bark-700 rounded-grove transition-colors">
							<Icons name="credits" size="md" />
							Pricing
						</a>
						<button onclick={toggleTheme} class="flex items-center gap-3 p-3 w-full text-left text-bark-600 dark:text-cream-400 hover:bg-cream-100 dark:hover:bg-bark-700 rounded-grove transition-colors">
							<Icons name={isDark ? 'sun' : 'moon'} size="md" />
							{isDark ? 'Light Mode' : 'Dark Mode'}
						</button>
						<div class="border-t border-cream-200 dark:border-bark-600 my-2"></div>
						<a href="/auth/login" onclick={closeMenus} class="scout-btn-primary w-full justify-center">
							Get Started
						</a>
					{/if}
				</div>
			</div>
		{/if}
	</header>

	<!-- Main Content -->
	<main class="flex-1">
		{@render children()}
	</main>

	<!-- Footer -->
	<footer class="bg-cream-100 dark:bg-bark-800 border-t border-cream-300 dark:border-bark-700">
		<div class="scout-container py-12">
			<div class="grid grid-cols-1 md:grid-cols-4 gap-8">
				<!-- Brand -->
				<div class="md:col-span-2">
					<a href="/" class="flex items-center gap-2 text-grove-600 dark:text-grove-400 font-bold text-xl mb-4">
						<div class="w-8 h-8 bg-grove-500 rounded-grove flex items-center justify-center">
							<Icons name="search" size="sm" class="text-white" />
						</div>
						<span class="font-serif">Scout</span>
					</a>
					<p class="text-bark-500 dark:text-cream-500 max-w-sm">
						AI-powered deal hunting for overwhelmed shoppers. Tell us what you want, we'll find the best options.
					</p>
				</div>

				<!-- Links -->
				<div>
					<h4 class="font-semibold text-bark dark:text-cream mb-4">Product</h4>
					<ul class="space-y-2">
						<li><a href="/pricing" class="text-bark-500 dark:text-cream-500 hover:text-grove-600 dark:hover:text-grove-400 transition-colors">Pricing</a></li>
						<li><a href="/auth/login" class="text-bark-500 dark:text-cream-500 hover:text-grove-600 dark:hover:text-grove-400 transition-colors">Sign In</a></li>
					</ul>
				</div>

				<div>
					<h4 class="font-semibold text-bark dark:text-cream mb-4">Company</h4>
					<ul class="space-y-2">
						<li><a href="https://grove.place" class="text-bark-500 dark:text-cream-500 hover:text-grove-600 dark:hover:text-grove-400 transition-colors">Grove</a></li>
					</ul>
				</div>
			</div>

			<div class="border-t border-cream-300 dark:border-bark-600 mt-8 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
				<p class="text-sm text-bark-400 dark:text-cream-500">
					&copy; 2025 Scout by Grove. All rights reserved.
				</p>
				<p class="text-sm text-bark-400 dark:text-cream-500">
					Built with care for overwhelmed shoppers.
				</p>
			</div>
		</div>
	</footer>
</div>
