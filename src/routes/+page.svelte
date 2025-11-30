<script lang="ts">
	let { data } = $props();
</script>

<div class="landing">
	<section class="hero">
		<h1>Stop drowning in shopping tabs.</h1>
		<p class="tagline">
			Tell Scout what you want. Walk away. Come back to 5 perfect products with links to buy.
		</p>
		<div class="cta">
			{#if data.user}
				<a href="/search/new" class="btn-primary">Start a Search</a>
			{:else}
				<a href="/auth/login" class="btn-primary">Get Started Free</a>
			{/if}
		</div>
	</section>

	<section class="how-it-works">
		<h2>How Scout Works</h2>
		<div class="steps">
			<div class="step">
				<div class="step-number">1</div>
				<h3>Tell us what you want</h3>
				<p>"Cozy sweater, earth tones, under $60"</p>
			</div>
			<div class="step">
				<div class="step-number">2</div>
				<h3>Walk away</h3>
				<p>Our AI agents search the web while you do literally anything else.</p>
			</div>
			<div class="step">
				<div class="step-number">3</div>
				<h3>Get curated results</h3>
				<p>5 perfect matches. Direct links. No infinite scrolling.</p>
			</div>
		</div>
	</section>

	<section class="for-who">
		<h2>Built for overwhelmed shoppers</h2>
		<ul>
			<li><strong>ADHD brains</strong> who get lost in Amazon's infinite scroll</li>
			<li><strong>Busy people</strong> who want deals without the hunt</li>
			<li><strong>Decision fatigue</strong> sufferers who need someone to narrow it down</li>
			<li><strong>Vibe shoppers</strong> who know the feel but not the product</li>
		</ul>
	</section>

	<section class="pricing-preview">
		<h2>Simple pricing</h2>
		<p>Starting at $10/month for 50 searches. <a href="/pricing">See all plans</a></p>
	</section>
</div>

<style>
	.landing {
		max-width: 800px;
		margin: 0 auto;
	}

	.hero {
		text-align: center;
		padding: 4rem 0;
	}

	h1 {
		font-size: 2.5rem;
		margin-bottom: 1rem;
		color: #1a1a2e;
	}

	.tagline {
		font-size: 1.25rem;
		color: #666;
		margin-bottom: 2rem;
	}

	.btn-primary {
		display: inline-block;
		background: #6366f1;
		color: white;
		padding: 1rem 2rem;
		border-radius: 0.5rem;
		text-decoration: none;
		font-weight: 600;
		font-size: 1.1rem;
	}

	.btn-primary:hover {
		background: #5558e3;
	}

	.how-it-works {
		padding: 3rem 0;
	}

	h2 {
		text-align: center;
		margin-bottom: 2rem;
		color: #1a1a2e;
	}

	.steps {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 2rem;
	}

	.step {
		text-align: center;
		padding: 1.5rem;
	}

	.step-number {
		width: 3rem;
		height: 3rem;
		background: #6366f1;
		color: white;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: bold;
		font-size: 1.25rem;
		margin: 0 auto 1rem;
	}

	.step h3 {
		margin-bottom: 0.5rem;
		color: #1a1a2e;
	}

	.step p {
		color: #666;
	}

	.for-who {
		padding: 3rem 0;
		background: #f8f9fa;
		margin: 2rem -2rem;
		padding-left: 2rem;
		padding-right: 2rem;
	}

	.for-who ul {
		max-width: 500px;
		margin: 0 auto;
		padding: 0;
		list-style: none;
	}

	.for-who li {
		padding: 0.75rem 0;
		border-bottom: 1px solid #e0e0e0;
		color: #333;
	}

	.for-who li:last-child {
		border-bottom: none;
	}

	.pricing-preview {
		text-align: center;
		padding: 3rem 0;
	}

	.pricing-preview p {
		color: #666;
	}

	.pricing-preview a {
		color: #6366f1;
	}
</style>
