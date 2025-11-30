<script lang="ts">
	let { data } = $props();
</script>

<div class="dashboard">
	<header class="dashboard-header">
		<div>
			<h1>Welcome back{data.profile?.display_name ? `, ${data.profile.display_name}` : ''}!</h1>
			<p class="credits">
				<span class="credit-count">{data.credits}</span> credits remaining
			</p>
		</div>
		<a href="/search/new" class="btn-primary">New Search</a>
	</header>

	{#if !data.profile?.style_notes}
		<div class="setup-prompt">
			<h3>Complete your profile</h3>
			<p>Add your sizes, color preferences, and style notes to get better personalized results.</p>
			<a href="/profile" class="btn-secondary">Set up profile</a>
		</div>
	{/if}

	<section class="recent-searches">
		<h2>Recent Searches</h2>

		{#if data.searches.length === 0}
			<div class="empty-state">
				<p>No searches yet. Start your first search to find amazing deals!</p>
				<a href="/search/new" class="btn-primary">Start Searching</a>
			</div>
		{:else}
			<div class="search-list">
				{#each data.searches as search}
					<a href="/search/{search.id}" class="search-card">
						<div class="search-query">
							{search.query_freeform || 'Structured search'}
						</div>
						<div class="search-meta">
							<span class="status status-{search.status}">{search.status}</span>
							<span class="date">
								{new Date(search.created_at).toLocaleDateString()}
							</span>
						</div>
					</a>
				{/each}
			</div>
		{/if}
	</section>
</div>

<style>
	.dashboard {
		max-width: 800px;
		margin: 0 auto;
	}

	.dashboard-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 2rem;
		padding-bottom: 2rem;
		border-bottom: 1px solid #eee;
	}

	h1 {
		margin-bottom: 0.25rem;
	}

	.credits {
		color: #666;
	}

	.credit-count {
		font-weight: 600;
		color: #6366f1;
	}

	.btn-primary {
		display: inline-block;
		background: #6366f1;
		color: white;
		padding: 0.75rem 1.5rem;
		border-radius: 0.5rem;
		text-decoration: none;
		font-weight: 500;
	}

	.btn-secondary {
		display: inline-block;
		background: #f3f4f6;
		color: #333;
		padding: 0.5rem 1rem;
		border-radius: 0.5rem;
		text-decoration: none;
		font-weight: 500;
	}

	.setup-prompt {
		background: #fef3c7;
		border: 1px solid #fcd34d;
		border-radius: 0.5rem;
		padding: 1.5rem;
		margin-bottom: 2rem;
	}

	.setup-prompt h3 {
		margin: 0 0 0.5rem;
		color: #92400e;
	}

	.setup-prompt p {
		margin: 0 0 1rem;
		color: #92400e;
	}

	.recent-searches h2 {
		margin-bottom: 1rem;
	}

	.empty-state {
		text-align: center;
		padding: 3rem;
		background: #f9fafb;
		border-radius: 0.5rem;
	}

	.empty-state p {
		margin-bottom: 1rem;
		color: #666;
	}

	.search-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.search-card {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 1.25rem;
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 0.5rem;
		text-decoration: none;
		color: inherit;
		transition: border-color 0.2s, box-shadow 0.2s;
	}

	.search-card:hover {
		border-color: #6366f1;
		box-shadow: 0 2px 8px rgba(99, 102, 241, 0.1);
	}

	.search-query {
		font-weight: 500;
		color: #1a1a2e;
	}

	.search-meta {
		display: flex;
		gap: 1rem;
		align-items: center;
	}

	.status {
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
		font-size: 0.75rem;
		font-weight: 500;
		text-transform: uppercase;
	}

	.status-pending {
		background: #fef3c7;
		color: #92400e;
	}

	.status-running {
		background: #dbeafe;
		color: #1e40af;
	}

	.status-completed {
		background: #d1fae5;
		color: #065f46;
	}

	.status-failed {
		background: #fee2e2;
		color: #991b1b;
	}

	.date {
		color: #9ca3af;
		font-size: 0.875rem;
	}
</style>
