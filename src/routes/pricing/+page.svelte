<script lang="ts">
	import { page } from '$app/stores';

	let { data } = $props();

	let isLoading = $state<string | null>(null);
	let error = $state<string | null>(null);

	const cancelled = $page.url.searchParams.get('checkout') === 'cancelled';

	interface ApiResponse {
		success?: boolean;
		data?: { url: string };
		error?: { message: string };
	}

	async function handleCheckout(priceId: string, mode: 'subscription' | 'payment') {
		isLoading = priceId;
		error = null;

		try {
			const response = await fetch('/api/checkout', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ priceId, mode })
			});

			const result: ApiResponse = await response.json();

			if (!response.ok) {
				throw new Error(result.error?.message || 'Checkout failed');
			}

			if (result.data?.url) {
				window.location.href = result.data.url;
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Something went wrong';
		} finally {
			isLoading = null;
		}
	}

	// These would come from your Stripe dashboard
	// For now, placeholder IDs - replace with actual price IDs
	const PRICE_IDS = {
		basic: 'price_basic_monthly', // Replace with real ID
		pro: 'price_pro_monthly', // Replace with real ID
		credits: 'price_credit_pack' // Replace with real ID
	};
</script>

<div class="pricing-page">
	<header>
		<h1>Simple, transparent pricing</h1>
		<p class="subtitle">Start finding deals without the cognitive overload.</p>
	</header>

	{#if cancelled}
		<div class="alert info">
			Checkout was cancelled. Feel free to try again when you're ready.
		</div>
	{/if}

	{#if error}
		<div class="alert error">{error}</div>
	{/if}

	<div class="plans">
		<div class="plan">
			<div class="plan-header">
				<h2>Basic</h2>
				<div class="price">
					<span class="amount">$10</span>
					<span class="period">/month</span>
				</div>
			</div>
			<ul class="features">
				<li>50 searches per month</li>
				<li>5 curated results per search</li>
				<li>Shareable result links</li>
				<li>Profile preferences</li>
				<li>Email notifications</li>
			</ul>
			{#if data.user}
				<button
					class="btn-plan"
					onclick={() => handleCheckout(PRICE_IDS.basic, 'subscription')}
					disabled={isLoading !== null}
				>
					{isLoading === PRICE_IDS.basic ? 'Loading...' : 'Get Basic'}
				</button>
			{:else}
				<a href="/auth/login?redirect=/pricing" class="btn-plan">Sign up</a>
			{/if}
		</div>

		<div class="plan featured">
			<div class="badge">Most Popular</div>
			<div class="plan-header">
				<h2>Pro</h2>
				<div class="price">
					<span class="amount">$25</span>
					<span class="period">/month</span>
				</div>
			</div>
			<ul class="features">
				<li><strong>200 searches</strong> per month</li>
				<li>5 curated results per search</li>
				<li>Shareable result links</li>
				<li>Profile preferences</li>
				<li>Email notifications</li>
				<li>Priority processing</li>
			</ul>
			{#if data.user}
				<button
					class="btn-plan primary"
					onclick={() => handleCheckout(PRICE_IDS.pro, 'subscription')}
					disabled={isLoading !== null}
				>
					{isLoading === PRICE_IDS.pro ? 'Loading...' : 'Get Pro'}
				</button>
			{:else}
				<a href="/auth/login?redirect=/pricing" class="btn-plan primary">Sign up</a>
			{/if}
		</div>

		<div class="plan">
			<div class="plan-header">
				<h2>Credit Pack</h2>
				<div class="price">
					<span class="amount">$10</span>
					<span class="period">one-time</span>
				</div>
			</div>
			<ul class="features">
				<li>50 additional searches</li>
				<li>Never expires</li>
				<li>Stack with subscription</li>
				<li>Use anytime</li>
			</ul>
			{#if data.user}
				<button
					class="btn-plan"
					onclick={() => handleCheckout(PRICE_IDS.credits, 'payment')}
					disabled={isLoading !== null}
				>
					{isLoading === PRICE_IDS.credits ? 'Loading...' : 'Buy Credits'}
				</button>
			{:else}
				<a href="/auth/login?redirect=/pricing" class="btn-plan">Sign up first</a>
			{/if}
		</div>
	</div>

	<section class="faq">
		<h2>Questions?</h2>
		<div class="faq-grid">
			<div class="faq-item">
				<h3>What counts as a search?</h3>
				<p>Each search request uses 1 credit. If we can't find results, you don't get charged.</p>
			</div>
			<div class="faq-item">
				<h3>Do credits roll over?</h3>
				<p>Subscription credits reset monthly. Credit pack purchases never expire.</p>
			</div>
			<div class="faq-item">
				<h3>Can I cancel anytime?</h3>
				<p>Yes! Cancel anytime from your settings. You'll keep access until your billing period ends.</p>
			</div>
			<div class="faq-item">
				<h3>What payment methods?</h3>
				<p>We accept all major credit cards through Stripe.</p>
			</div>
		</div>
	</section>
</div>

<style>
	.pricing-page {
		max-width: 1000px;
		margin: 0 auto;
	}

	header {
		text-align: center;
		margin-bottom: 3rem;
	}

	h1 {
		margin-bottom: 0.5rem;
	}

	.subtitle {
		color: #666;
		font-size: 1.125rem;
	}

	.alert {
		padding: 1rem;
		border-radius: 0.5rem;
		margin-bottom: 2rem;
		text-align: center;
	}

	.alert.info {
		background: #eff6ff;
		color: #1e40af;
	}

	.alert.error {
		background: #fef2f2;
		color: #991b1b;
	}

	.plans {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 1.5rem;
		margin-bottom: 4rem;
	}

	.plan {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 1rem;
		padding: 2rem;
		position: relative;
	}

	.plan.featured {
		border-color: #6366f1;
		box-shadow: 0 4px 20px rgba(99, 102, 241, 0.15);
	}

	.badge {
		position: absolute;
		top: -0.75rem;
		left: 50%;
		transform: translateX(-50%);
		background: #6366f1;
		color: white;
		padding: 0.25rem 1rem;
		border-radius: 1rem;
		font-size: 0.75rem;
		font-weight: 600;
	}

	.plan-header {
		text-align: center;
		margin-bottom: 1.5rem;
	}

	.plan-header h2 {
		margin-bottom: 0.5rem;
	}

	.price {
		display: flex;
		align-items: baseline;
		justify-content: center;
		gap: 0.25rem;
	}

	.amount {
		font-size: 2.5rem;
		font-weight: 700;
		color: #1a1a2e;
	}

	.period {
		color: #666;
	}

	.features {
		list-style: none;
		padding: 0;
		margin: 0 0 2rem;
	}

	.features li {
		padding: 0.5rem 0;
		border-bottom: 1px solid #f3f4f6;
		color: #374151;
	}

	.features li:last-child {
		border-bottom: none;
	}

	.btn-plan {
		display: block;
		width: 100%;
		padding: 0.875rem;
		border: 1px solid #e5e7eb;
		border-radius: 0.5rem;
		background: white;
		color: #374151;
		font-size: 1rem;
		font-weight: 500;
		text-align: center;
		text-decoration: none;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn-plan:hover:not(:disabled) {
		border-color: #6366f1;
		color: #6366f1;
	}

	.btn-plan.primary {
		background: #6366f1;
		border-color: #6366f1;
		color: white;
	}

	.btn-plan.primary:hover:not(:disabled) {
		background: #5558e3;
	}

	.btn-plan:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.faq {
		background: #f9fafb;
		margin: 0 -2rem;
		padding: 3rem 2rem;
	}

	.faq h2 {
		text-align: center;
		margin-bottom: 2rem;
	}

	.faq-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 2rem;
	}

	.faq-item h3 {
		font-size: 1rem;
		margin-bottom: 0.5rem;
		color: #1a1a2e;
	}

	.faq-item p {
		color: #666;
		font-size: 0.875rem;
		line-height: 1.5;
	}
</style>
