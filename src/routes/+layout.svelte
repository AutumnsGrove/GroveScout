<script lang="ts">
	import '../app.css';
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { ThemeToggle, MobileMenu, themeStore } from '@autumnsgrove/groveengine/ui/chrome';
	import { Menu, Search, LayoutDashboard, CreditCard, User, Settings, LogOut, Home } from '@lucide/svelte';
	import type { NavItem, FooterLink } from '@autumnsgrove/groveengine/ui/chrome';
	import { CreditBalance } from '$lib/components/scout';

	let { children, data } = $props();

	// Mobile menu state
	let mobileMenuOpen = $state(false);

	// Toggle dark/light mode on logo click (matches engine pattern)
	function handleLogoClick() {
		themeStore.toggle();
	}

	// Check if current path matches
	function isActive(href: string): boolean {
		return page.url.pathname === href || page.url.pathname.startsWith(href + '/');
	}

	// Scout-specific nav items for authenticated users (desktop)
	const authNavItems: NavItem[] = [
		{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
		{ href: '/search/new', label: 'New Search', icon: Search, primary: true },
		{ href: '/pricing', label: 'Pricing', icon: CreditCard }
	];

	// Nav items for unauthenticated users (desktop)
	const publicNavItems: NavItem[] = [
		{ href: '/pricing', label: 'Pricing', icon: CreditCard },
		{ href: '/auth/login', label: 'Get Started', icon: User, primary: true }
	];

	// Mobile menu items for authenticated users
	const authMobileItems: NavItem[] = [
		{ href: '/', label: 'Home', icon: Home },
		{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
		{ href: '/search/new', label: 'New Search', icon: Search },
		{ href: '/profile', label: 'Profile', icon: User },
		{ href: '/settings', label: 'Settings', icon: Settings },
		{ href: '/pricing', label: 'Pricing', icon: CreditCard },
		{ href: '/auth/logout', label: 'Sign Out', icon: LogOut }
	];

	// Mobile menu items for unauthenticated users
	const publicMobileItems: NavItem[] = [
		{ href: '/', label: 'Home', icon: Home },
		{ href: '/pricing', label: 'Pricing', icon: CreditCard },
		{ href: '/auth/login', label: 'Get Started', icon: User }
	];

	// No resource/connect links for mobile menu
	const noLinks: FooterLink[] = [];

	// Get current nav items based on auth state
	let navItems = $derived(data.user ? authNavItems : publicNavItems);
	let mobileNavItems = $derived(data.user ? authMobileItems : publicMobileItems);

	onMount(() => {
		// Initialize theme from store (syncs with localStorage)
		if (browser) {
			themeStore.init();
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

<div class="app min-h-screen flex flex-col bg-cream dark:bg-bark-900">
	<!-- Header -->
	<header class="sticky top-0 z-40 py-4 px-6 border-b border-bark-200 dark:border-bark-700 bg-cream/95 dark:bg-bark-900/95 backdrop-blur-sm">
		<div class="max-w-6xl mx-auto flex items-center justify-between">
			<!-- Logo area -->
			<div class="flex items-center gap-3">
				<!-- Scout logo icon - clickable to toggle theme -->
				<button
					onclick={handleLogoClick}
					class="flex-shrink-0 transition-transform hover:scale-110 active:scale-95"
					aria-label="Toggle dark or light theme"
					title="Toggle dark/light mode"
				>
					<div class="w-8 h-8 bg-grove-500 rounded-grove flex items-center justify-center">
						<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
						</svg>
					</div>
				</button>

				<!-- Brand title -->
				<a
					href="/"
					class="text-lg font-serif text-bark-800 dark:text-cream-100 hover:text-grove-600 dark:hover:text-grove-400 transition-colors"
				>
					Scout
				</a>
			</div>

			<!-- Desktop navigation -->
			<div class="hidden md:flex items-center gap-6">
				<!-- Navigation links -->
				<nav class="flex items-center gap-4 text-sm font-sans">
					{#each navItems as item}
						{@const Icon = item.icon}
						<a
							href={item.href}
							class="flex items-center gap-1.5 px-3 py-1.5 rounded-grove transition-colors
								{item.primary
									? 'bg-grove-500 text-white hover:bg-grove-600'
									: isActive(item.href)
										? 'text-grove-600 dark:text-grove-400'
										: 'text-bark-600 dark:text-cream-400 hover:text-grove-600 dark:hover:text-grove-400'}"
						>
							{#if Icon}
								<Icon class="w-4 h-4" />
							{/if}
							<span>{item.label}</span>
						</a>
					{/each}
				</nav>

				<!-- Credit balance for authenticated users -->
				{#if data.user && data.credits !== undefined}
					<CreditBalance credits={data.credits} variant="compact" size="sm" />
				{/if}

				<!-- User info for authenticated users -->
				{#if data.user}
					<a
						href="/profile"
						class="flex items-center gap-2 px-3 py-1.5 rounded-grove text-bark-600 dark:text-cream-400 hover:bg-bark-100 dark:hover:bg-bark-800 transition-colors"
					>
						<div class="w-6 h-6 bg-grove-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
							{data.user.email[0].toUpperCase()}
						</div>
					</a>
				{/if}

				<ThemeToggle />
			</div>

			<!-- Mobile: Credit balance + Theme toggle + hamburger -->
			<div class="flex md:hidden items-center gap-2">
				{#if data.user && data.credits !== undefined}
					<CreditBalance credits={data.credits} variant="compact" size="sm" />
				{/if}

				<ThemeToggle />
				<button
					onclick={() => (mobileMenuOpen = true)}
					class="p-2 -mr-2 text-bark-600 dark:text-cream-400 hover:text-bark-800 dark:hover:text-cream-100 transition-colors rounded-lg hover:bg-bark-100 dark:hover:bg-bark-800"
					aria-label="Open menu"
				>
					<Menu class="w-5 h-5" />
				</button>
			</div>
		</div>
	</header>

	<!-- Mobile menu overlay -->
	<MobileMenu
		bind:open={mobileMenuOpen}
		onClose={() => (mobileMenuOpen = false)}
		navItems={mobileNavItems}
		resourceLinks={noLinks}
		connectLinks={noLinks}
	/>

	<main class="flex-1">
		{@render children()}
	</main>

	<!-- Footer -->
	<footer class="border-t border-bark-200 dark:border-bark-700 bg-cream/80 dark:bg-bark-900/80 backdrop-blur-sm">
		<div class="max-w-6xl mx-auto px-6 py-12">
			<div class="grid gap-8 md:grid-cols-4">
				<!-- Brand column -->
				<div class="md:col-span-2">
					<div class="flex items-center gap-3 mb-4">
						<div class="w-8 h-8 bg-grove-500 rounded-grove flex items-center justify-center">
							<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
							</svg>
						</div>
						<span class="text-lg font-serif text-bark-800 dark:text-cream-100">Scout</span>
					</div>
					<p class="text-sm text-bark-600 dark:text-cream-400 max-w-md">
						AI-powered deal hunting for overwhelmed shoppers. Tell us what you want, we'll find the best options.
					</p>
				</div>

				<!-- Product links -->
				<div>
					<h3 class="text-sm font-semibold text-bark-800 dark:text-cream-100 mb-4">Product</h3>
					<ul class="space-y-2 text-sm">
						<li>
							<a href="/pricing" class="text-bark-600 dark:text-cream-400 hover:text-grove-600 dark:hover:text-grove-400 transition-colors">
								Pricing
							</a>
						</li>
						<li>
							<a href="/auth/login" class="text-bark-600 dark:text-cream-400 hover:text-grove-600 dark:hover:text-grove-400 transition-colors">
								Sign In
							</a>
						</li>
					</ul>
				</div>

				<!-- Company links -->
				<div>
					<h3 class="text-sm font-semibold text-bark-800 dark:text-cream-100 mb-4">Company</h3>
					<ul class="space-y-2 text-sm">
						<li>
							<a
								href="https://grove.place"
								target="_blank"
								rel="noopener noreferrer"
								class="text-bark-600 dark:text-cream-400 hover:text-grove-600 dark:hover:text-grove-400 transition-colors"
							>
								Grove
							</a>
						</li>
					</ul>
				</div>
			</div>

			<!-- Bottom bar -->
			<div class="mt-8 pt-8 border-t border-bark-200 dark:border-bark-700 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-bark-500 dark:text-cream-500">
				<p>&copy; 2025 Scout. All rights reserved.</p>
				<p>
					Powered by
					<a
						href="https://grove.place"
						target="_blank"
						rel="noopener noreferrer"
						class="text-grove-600 dark:text-grove-400 hover:underline"
					>
						Lattice from The Grove
					</a>
				</p>
			</div>
		</div>
	</footer>
</div>
