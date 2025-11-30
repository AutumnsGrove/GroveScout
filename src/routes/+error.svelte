<script lang="ts">
	import { page } from '$app/stores';
</script>

<div class="error-page">
	<div class="error-content">
		<div class="error-icon">
			{#if $page.status === 404}
				<svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
					<circle cx="11" cy="11" r="8" />
					<path d="M21 21l-4.35-4.35" />
					<path d="M8 8l6 6M14 8l-6 6" stroke-linecap="round" />
				</svg>
			{:else}
				<svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
					<path d="M12 9v4m0 4h.01" stroke-linecap="round" />
					<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
				</svg>
			{/if}
		</div>

		<h1 class="error-code">{$page.status}</h1>

		<h2 class="error-title">
			{#if $page.status === 404}
				Page not found
			{:else if $page.status === 401}
				Unauthorized
			{:else if $page.status === 403}
				Access denied
			{:else if $page.status >= 500}
				Something went wrong
			{:else}
				Error
			{/if}
		</h2>

		<p class="error-message">
			{#if $page.error?.message}
				{$page.error.message}
			{:else if $page.status === 404}
				The page you're looking for doesn't exist or has been moved.
			{:else if $page.status === 401}
				You need to sign in to access this page.
			{:else if $page.status === 403}
				You don't have permission to access this page.
			{:else}
				We're having trouble loading this page. Please try again.
			{/if}
		</p>

		<div class="error-actions">
			{#if $page.status === 401}
				<a href="/auth/login" class="btn btn-primary">Sign In</a>
				<a href="/" class="btn btn-secondary">Go Home</a>
			{:else}
				<a href="/" class="btn btn-primary">Go Home</a>
				<button class="btn btn-secondary" onclick={() => history.back()}>Go Back</button>
			{/if}
		</div>
	</div>
</div>

<style>
	.error-page {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 60vh;
		padding: 2rem;
	}

	.error-content {
		text-align: center;
		max-width: 400px;
	}

	.error-icon {
		color: var(--color-text-muted);
		margin-bottom: 1.5rem;
	}

	.error-code {
		font-size: 4rem;
		font-weight: 800;
		color: var(--color-primary);
		line-height: 1;
		margin-bottom: 0.5rem;
	}

	.error-title {
		font-size: 1.5rem;
		color: var(--color-text);
		margin-bottom: 0.75rem;
	}

	.error-message {
		color: var(--color-text-secondary);
		margin-bottom: 2rem;
		line-height: 1.6;
	}

	.error-actions {
		display: flex;
		gap: 1rem;
		justify-content: center;
		flex-wrap: wrap;
	}

	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.75rem 1.5rem;
		font-weight: 500;
		border-radius: var(--radius-lg);
		border: none;
		text-decoration: none;
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.btn-primary {
		background: var(--color-primary);
		color: white;
	}

	.btn-primary:hover {
		background: var(--color-primary-hover);
	}

	.btn-secondary {
		background: var(--color-bg);
		color: var(--color-text);
		border: 1px solid var(--color-border);
	}

	.btn-secondary:hover {
		background: var(--color-bg-secondary);
	}
</style>
