<script lang="ts">
	let { data } = $props();

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
	}
</script>

<div class="admin-page">
	<header class="admin-header">
		<h1>Admin Dashboard</h1>
		<p class="subtitle">Scout system overview and management</p>
	</header>

	<!-- Stats Grid -->
	<section class="stats-grid">
		<div class="stat-card">
			<div class="stat-value">{data.stats.totalUsers}</div>
			<div class="stat-label">Total Users</div>
			<div class="stat-delta">+{data.stats.recentUsers} today</div>
		</div>
		<div class="stat-card">
			<div class="stat-value">{data.stats.totalSearches}</div>
			<div class="stat-label">Total Searches</div>
			<div class="stat-delta">+{data.stats.recentSearches} today</div>
		</div>
		<div class="stat-card">
			<div class="stat-value">{data.stats.totalCreditsUsed}</div>
			<div class="stat-label">Credits Used</div>
		</div>
		<div class="stat-card">
			<div class="stat-value">{data.stats.activeSubscriptions}</div>
			<div class="stat-label">Active Subscriptions</div>
		</div>
	</section>

	<!-- Daily Stats -->
	{#if data.dailyStats.length > 0}
		<section class="analytics-section">
			<h2>Last 7 Days</h2>
			<div class="daily-stats-grid">
				{#each data.dailyStats as day}
					<div class="day-card">
						<div class="day-date">{day.date}</div>
						<div class="day-stats">
							<span class="day-stat"><strong>{day.signups}</strong> signups</span>
							<span class="day-stat"><strong>{day.searches}</strong> searches</span>
							<span class="day-stat"><strong>{day.logins}</strong> logins</span>
							{#if day.revenue_cents > 0}
								<span class="day-stat revenue">${(day.revenue_cents / 100).toFixed(2)} revenue</span>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</section>
	{/if}

	<!-- Recent Activity -->
	<div class="tables-grid">
		<!-- Recent Users -->
		<section class="table-section">
			<div class="section-header">
				<h2>Recent Users</h2>
				<span class="badge">{data.totalUsers} total</span>
			</div>
			<div class="table-wrapper">
				<table>
					<thead>
						<tr>
							<th>Email</th>
							<th>Provider</th>
							<th>Joined</th>
							<th>Admin</th>
						</tr>
					</thead>
					<tbody>
						{#each data.recentUsers as user}
							<tr>
								<td class="email">{user.email}</td>
								<td>
									<span class="provider-badge {user.auth_provider}">{user.auth_provider}</span>
								</td>
								<td class="date">{formatDate(user.created_at)}</td>
								<td>
									{#if user.is_admin}
										<span class="admin-badge">Admin</span>
									{:else}
										<span class="user-badge">User</span>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>

		<!-- Recent Searches -->
		<section class="table-section">
			<div class="section-header">
				<h2>Recent Searches</h2>
				<span class="badge">{data.totalSearches} total</span>
			</div>
			<div class="table-wrapper">
				<table>
					<thead>
						<tr>
							<th>Query</th>
							<th>User</th>
							<th>Status</th>
							<th>Created</th>
						</tr>
					</thead>
					<tbody>
						{#each data.recentSearches as search}
							<tr>
								<td class="query">{search.query_freeform?.slice(0, 40) || 'N/A'}{(search.query_freeform?.length ?? 0) > 40 ? '...' : ''}</td>
								<td class="email">{search.user_email}</td>
								<td>
									<span class="status-badge status-{search.status}">{search.status}</span>
								</td>
								<td class="date">{formatDate(search.created_at)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>
	</div>

	<!-- Recent Events -->
	{#if data.recentEvents.length > 0}
		<section class="table-section events-section">
			<div class="section-header">
				<h2>Recent Events</h2>
				<span class="badge">Analytics</span>
			</div>
			<div class="table-wrapper">
				<table>
					<thead>
						<tr>
							<th>Event</th>
							<th>User ID</th>
							<th>Time</th>
						</tr>
					</thead>
					<tbody>
						{#each data.recentEvents as event}
							<tr>
								<td>
									<span class="event-badge event-{event.event_type}">{event.event_type.replace(/_/g, ' ')}</span>
								</td>
								<td class="email">{event.user_id?.slice(0, 8) || 'N/A'}...</td>
								<td class="date">{formatDate(event.created_at)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>
	{/if}
</div>

<style>
	.admin-page {
		max-width: 1400px;
		margin: 0 auto;
	}

	.admin-header {
		margin-bottom: 2rem;
	}

	.admin-header h1 {
		margin-bottom: 0.25rem;
	}

	.subtitle {
		color: var(--color-text-secondary);
	}

	/* Stats Grid */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
		margin-bottom: 2rem;
	}

	.stat-card {
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-xl);
		padding: 1.5rem;
	}

	.stat-value {
		font-size: 2.5rem;
		font-weight: 700;
		color: var(--color-primary);
		line-height: 1;
	}

	.stat-label {
		color: var(--color-text-secondary);
		font-size: 0.875rem;
		margin-top: 0.5rem;
	}

	.stat-delta {
		color: var(--color-success);
		font-size: 0.75rem;
		margin-top: 0.25rem;
	}

	/* Tables */
	.tables-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
		gap: 1.5rem;
	}

	.table-section {
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-xl);
		overflow: hidden;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 1.5rem;
		border-bottom: 1px solid var(--color-border);
	}

	.section-header h2 {
		font-size: 1rem;
		font-weight: 600;
	}

	.badge {
		background: var(--color-bg-tertiary);
		color: var(--color-text-secondary);
		padding: 0.25rem 0.5rem;
		border-radius: var(--radius-sm);
		font-size: 0.75rem;
	}

	.table-wrapper {
		overflow-x: auto;
	}

	table {
		width: 100%;
		border-collapse: collapse;
	}

	th, td {
		padding: 0.75rem 1rem;
		text-align: left;
		border-bottom: 1px solid var(--color-border);
	}

	th {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		background: var(--color-bg-secondary);
	}

	tbody tr:last-child td {
		border-bottom: none;
	}

	tbody tr:hover {
		background: var(--color-bg-secondary);
	}

	.email {
		font-family: var(--font-mono);
		font-size: 0.875rem;
	}

	.query {
		max-width: 200px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.date {
		color: var(--color-text-secondary);
		font-size: 0.875rem;
		white-space: nowrap;
	}

	/* Badges */
	.provider-badge {
		display: inline-block;
		padding: 0.125rem 0.5rem;
		border-radius: var(--radius-sm);
		font-size: 0.75rem;
		font-weight: 500;
		text-transform: capitalize;
	}

	.provider-badge.google {
		background: #fee2e2;
		color: #991b1b;
	}

	.provider-badge.apple {
		background: #f3f4f6;
		color: #1f2937;
	}

	.admin-badge {
		background: var(--color-primary-light);
		color: var(--color-primary);
		padding: 0.125rem 0.5rem;
		border-radius: var(--radius-sm);
		font-size: 0.75rem;
		font-weight: 500;
	}

	.user-badge {
		background: var(--color-bg-tertiary);
		color: var(--color-text-muted);
		padding: 0.125rem 0.5rem;
		border-radius: var(--radius-sm);
		font-size: 0.75rem;
	}

	.status-badge {
		display: inline-block;
		padding: 0.125rem 0.5rem;
		border-radius: var(--radius-sm);
		font-size: 0.75rem;
		font-weight: 500;
		text-transform: capitalize;
	}

	.status-completed {
		background: var(--color-success-light);
		color: #065f46;
	}

	.status-pending, .status-running {
		background: var(--color-warning-light);
		color: #92400e;
	}

	.status-failed {
		background: var(--color-error-light);
		color: #991b1b;
	}

	/* Analytics Section */
	.analytics-section {
		margin-bottom: 2rem;
	}

	.analytics-section h2 {
		font-size: 1rem;
		font-weight: 600;
		margin-bottom: 1rem;
	}

	.daily-stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 0.75rem;
	}

	.day-card {
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: 0.75rem;
	}

	.day-date {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-text-secondary);
		margin-bottom: 0.5rem;
	}

	.day-stats {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.day-stat {
		font-size: 0.75rem;
		color: var(--color-text-muted);
	}

	.day-stat strong {
		color: var(--color-text);
	}

	.day-stat.revenue {
		color: var(--color-success);
	}

	/* Events Section */
	.events-section {
		margin-top: 1.5rem;
	}

	.event-badge {
		display: inline-block;
		padding: 0.125rem 0.5rem;
		border-radius: var(--radius-sm);
		font-size: 0.75rem;
		font-weight: 500;
		text-transform: capitalize;
		background: var(--color-bg-tertiary);
		color: var(--color-text-secondary);
	}

	.event-user_signup {
		background: var(--color-success-light);
		color: #065f46;
	}

	.event-user_login {
		background: var(--color-primary-light);
		color: var(--color-primary);
	}

	.event-search_created,
	.event-search_completed {
		background: #dbeafe;
		color: #1e40af;
	}

	.event-search_failed {
		background: var(--color-error-light);
		color: #991b1b;
	}

	.event-credits_purchased,
	.event-subscription_created {
		background: #fef3c7;
		color: #92400e;
	}

	.event-subscription_cancelled {
		background: #fee2e2;
		color: #991b1b;
	}

	@media (max-width: 768px) {
		.tables-grid {
			grid-template-columns: 1fr;
		}

		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
		}

		.daily-stats-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}
</style>
