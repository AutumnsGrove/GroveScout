<script lang="ts">
	import '../app.css';

	let { children, data } = $props();

	let mobileMenuOpen = $state(false);
	let userMenuOpen = $state(false);

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
</script>

<svelte:head>
	<title>Scout - Your Personal Deal Hunter</title>
	<meta name="description" content="AI-powered shopping research that finds the best deals for you." />
	<link rel="icon" href="/favicon.svg" />
</svelte:head>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="app" onclick={closeMenus}>
	<header>
		<nav>
			<a href="/" class="logo">
				<span class="logo-icon">🔍</span>
				<span class="logo-text">Scout</span>
			</a>

			<!-- Desktop Navigation -->
			<div class="nav-desktop">
				{#if data.user}
					<a href="/dashboard">Dashboard</a>
					<a href="/search/new" class="btn btn-primary">New Search</a>
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div class="user-menu" onclick={(e) => e.stopPropagation()}>
						<button class="user-trigger" onclick={toggleUserMenu}>
							<span class="user-avatar">{data.user.email[0].toUpperCase()}</span>
						</button>
						{#if userMenuOpen}
							<div class="user-dropdown">
								<div class="user-email">{data.user.email}</div>
								<hr />
								<a href="/profile" onclick={closeMenus}>Profile</a>
								<a href="/settings" onclick={closeMenus}>Settings</a>
								<a href="/pricing" onclick={closeMenus}>Pricing</a>
								<hr />
								<a href="/auth/logout" class="logout" onclick={closeMenus}>Sign Out</a>
							</div>
						{/if}
					</div>
				{:else}
					<a href="/pricing">Pricing</a>
					<a href="/auth/login" class="btn btn-primary">Get Started</a>
				{/if}
			</div>

			<!-- Mobile Menu Button -->
			<button class="mobile-menu-btn" onclick={(e) => { e.stopPropagation(); toggleMobileMenu(); }} aria-label="Menu">
				{#if mobileMenuOpen}
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M18 6L6 18M6 6l12 12" />
					</svg>
				{:else}
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M3 12h18M3 6h18M3 18h18" />
					</svg>
				{/if}
			</button>
		</nav>

		<!-- Mobile Navigation -->
		{#if mobileMenuOpen}
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="nav-mobile" onclick={(e) => e.stopPropagation()}>
				{#if data.user}
					<div class="mobile-user">
						<span class="user-avatar">{data.user.email[0].toUpperCase()}</span>
						<span class="user-email">{data.user.email}</span>
					</div>
					<hr />
					<a href="/dashboard" onclick={closeMenus}>Dashboard</a>
					<a href="/search/new" onclick={closeMenus}>New Search</a>
					<a href="/profile" onclick={closeMenus}>Profile</a>
					<a href="/settings" onclick={closeMenus}>Settings</a>
					<a href="/pricing" onclick={closeMenus}>Pricing</a>
					<hr />
					<a href="/auth/logout" class="logout" onclick={closeMenus}>Sign Out</a>
				{:else}
					<a href="/pricing" onclick={closeMenus}>Pricing</a>
					<a href="/auth/login" onclick={closeMenus}>Sign In</a>
				{/if}
			</div>
		{/if}
	</header>

	<main>
		{@render children()}
	</main>

	<footer>
		<div class="footer-content">
			<div class="footer-brand">
				<span class="logo-icon">🔍</span>
				<span>Scout</span>
			</div>
			<p>Built with love for overwhelmed shoppers.</p>
			<p class="footer-copy">&copy; 2025 Scout. All rights reserved.</p>
		</div>
	</footer>
</div>

<style>
	.app {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	header {
		position: sticky;
		top: 0;
		z-index: 100;
		background: var(--color-bg);
		border-bottom: 1px solid var(--color-border);
	}

	nav {
		max-width: 1200px;
		margin: 0 auto;
		padding: 1rem 1.5rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.logo {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--color-primary);
		text-decoration: none;
	}

	.logo-icon {
		font-size: 1.25rem;
	}

	/* Desktop Nav */
	.nav-desktop {
		display: flex;
		gap: 1.5rem;
		align-items: center;
	}

	.nav-desktop a {
		color: var(--color-text-secondary);
		text-decoration: none;
		font-weight: 500;
		transition: color var(--transition-fast);
	}

	.nav-desktop a:hover {
		color: var(--color-primary);
	}

	.nav-desktop .btn {
		color: white;
	}

	/* User Menu */
	.user-menu {
		position: relative;
	}

	.user-trigger {
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
	}

	.user-avatar {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		background: var(--color-primary);
		color: white;
		border-radius: 50%;
		font-weight: 600;
		font-size: 0.875rem;
	}

	.user-dropdown {
		position: absolute;
		top: calc(100% + 0.5rem);
		right: 0;
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-lg);
		min-width: 200px;
		padding: 0.5rem 0;
	}

	.user-dropdown .user-email {
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		color: var(--color-text-secondary);
	}

	.user-dropdown hr {
		margin: 0.5rem 0;
		border: none;
		border-top: 1px solid var(--color-border);
	}

	.user-dropdown a {
		display: block;
		padding: 0.5rem 1rem;
		color: var(--color-text);
		text-decoration: none;
		transition: background var(--transition-fast);
	}

	.user-dropdown a:hover {
		background: var(--color-bg-secondary);
	}

	.user-dropdown .logout {
		color: var(--color-error);
	}

	/* Mobile Menu Button */
	.mobile-menu-btn {
		display: none;
		background: none;
		border: none;
		padding: 0.5rem;
		color: var(--color-text);
	}

	/* Mobile Nav */
	.nav-mobile {
		display: none;
		padding: 1rem 1.5rem;
		border-top: 1px solid var(--color-border);
		background: var(--color-bg);
	}

	.nav-mobile a {
		display: block;
		padding: 0.75rem 0;
		color: var(--color-text);
		text-decoration: none;
		font-weight: 500;
	}

	.nav-mobile hr {
		margin: 0.5rem 0;
		border: none;
		border-top: 1px solid var(--color-border);
	}

	.mobile-user {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5rem 0;
	}

	.mobile-user .user-email {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
	}

	.nav-mobile .logout {
		color: var(--color-error);
	}

	/* Main Content */
	main {
		flex: 1;
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem 1.5rem;
		width: 100%;
	}

	/* Footer */
	footer {
		background: var(--color-bg-secondary);
		border-top: 1px solid var(--color-border);
		padding: 2rem 1.5rem;
	}

	.footer-content {
		max-width: 1200px;
		margin: 0 auto;
		text-align: center;
	}

	.footer-brand {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		font-weight: 600;
		color: var(--color-text);
		margin-bottom: 0.5rem;
	}

	.footer-content p {
		color: var(--color-text-secondary);
		font-size: 0.875rem;
	}

	.footer-copy {
		margin-top: 1rem;
		color: var(--color-text-muted);
	}

	/* Responsive */
	@media (max-width: 768px) {
		.nav-desktop {
			display: none;
		}

		.mobile-menu-btn {
			display: block;
		}

		.nav-mobile {
			display: block;
		}
	}
</style>
