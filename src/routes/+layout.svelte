<script lang="ts">
	let { children, data } = $props();
</script>

<svelte:head>
	<title>Scout - Your Personal Deal Hunter</title>
	<meta name="description" content="AI-powered shopping research that finds the best deals for you." />
	<link rel="icon" href="/favicon.svg" />
</svelte:head>

<div class="app">
	<header>
		<nav>
			<a href="/" class="logo">Scout</a>
			<div class="nav-links">
				{#if data.user}
					<a href="/dashboard">Dashboard</a>
					<a href="/search/new">New Search</a>
					<a href="/auth/logout">Logout</a>
				{:else}
					<a href="/pricing">Pricing</a>
					<a href="/auth/login" class="btn-primary">Get Started</a>
				{/if}
			</div>
		</nav>
	</header>

	<main>
		{@render children()}
	</main>

	<footer>
		<p>&copy; 2025 Scout. Built with love for overwhelmed shoppers.</p>
	</footer>
</div>

<style>
	.app {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	header {
		padding: 1rem 2rem;
		border-bottom: 1px solid #eee;
	}

	nav {
		max-width: 1200px;
		margin: 0 auto;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.logo {
		font-size: 1.5rem;
		font-weight: bold;
		text-decoration: none;
		color: #6366f1;
	}

	.nav-links {
		display: flex;
		gap: 1.5rem;
		align-items: center;
	}

	.nav-links a {
		text-decoration: none;
		color: #333;
	}

	.nav-links a:hover {
		color: #6366f1;
	}

	.btn-primary {
		background: #6366f1;
		color: white !important;
		padding: 0.5rem 1rem;
		border-radius: 0.5rem;
	}

	main {
		flex: 1;
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
		width: 100%;
	}

	footer {
		padding: 2rem;
		text-align: center;
		border-top: 1px solid #eee;
		color: #666;
	}
</style>
