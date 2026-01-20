<script lang="ts">
	import '../app.css';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import { Header, Footer } from '@autumnsgrove/groveengine/ui/chrome';
	import { themeStore } from '@autumnsgrove/groveengine/ui/stores';
	import { CreditBalance } from '$lib/components/scout';

	let { children, data } = $props();

	// Scout-specific nav items for authenticated users
	const authNavItems = [
		{ href: '/dashboard', label: 'Dashboard' },
		{ href: '/search/new', label: 'New Search', primary: true },
		{ href: '/pricing', label: 'Pricing' }
	];

	// Nav items for unauthenticated users
	const publicNavItems = [
		{ href: '/pricing', label: 'Pricing' },
		{ href: '/auth/login', label: 'Get Started', primary: true }
	];

	// User menu items for authenticated users
	const userMenuItems = [
		{ href: '/profile', label: 'Profile' },
		{ href: '/settings', label: 'Settings' },
		{ href: '/pricing', label: 'Pricing' },
		{ href: '/auth/logout', label: 'Sign Out', danger: true }
	];

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
	<Header
		navItems={data.user ? authNavItems : publicNavItems}
		userMenuItems={data.user ? userMenuItems : undefined}
		user={data.user ? { email: data.user.email, avatar: data.user.email[0].toUpperCase() } : undefined}
		brandTitle="Scout"
		brandHref="/"
		maxWidth="wide"
	>
		{#snippet brandIcon()}
			<div class="w-8 h-8 bg-grove-500 rounded-grove flex items-center justify-center">
				<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
				</svg>
			</div>
		{/snippet}
		{#snippet headerExtra()}
			{#if data.user && data.credits !== undefined}
				<CreditBalance credits={data.credits} variant="compact" size="sm" />
			{/if}
		{/snippet}
	</Header>

	<main class="flex-1">
		{@render children()}
	</main>

	<Footer
		maxWidth="wide"
		brandTitle="Scout"
		brandDescription="AI-powered deal hunting for overwhelmed shoppers. Tell us what you want, we'll find the best options."
		links={[
			{
				title: 'Product',
				items: [
					{ href: '/pricing', label: 'Pricing' },
					{ href: '/auth/login', label: 'Sign In' }
				]
			},
			{
				title: 'Company',
				items: [
					{ href: 'https://grove.place', label: 'Grove', external: true }
				]
			}
		]}
		copyright="© 2025 Scout. All rights reserved."
		poweredBy={{ text: 'Lattice from The Grove', href: 'https://grove.place' }}
	>
		{#snippet footerBrandIcon()}
			<div class="w-8 h-8 bg-grove-500 rounded-grove flex items-center justify-center">
				<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
				</svg>
			</div>
		{/snippet}
	</Footer>
</div>
