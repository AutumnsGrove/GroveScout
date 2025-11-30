// See https://svelte.dev/docs/kit/types#app.d.ts
// Scout - Research Goblin

declare global {
	namespace App {
		interface Error {
			message: string;
			code?: string;
		}

		interface Locals {
			user: import('$lib/types').User | null;
			session: import('$lib/types').Session | null;
		}

		interface Platform {
			env: {
				DB: D1Database;
				KV: KVNamespace;
				SEARCH_QUEUE: Queue<import('$lib/types').SearchJob>;
				ANTHROPIC_API_KEY: string;
				BRAVE_API_KEY: string;
				STRIPE_SECRET_KEY: string;
				STRIPE_WEBHOOK_SECRET: string;
				RESEND_API_KEY: string;
				GOOGLE_CLIENT_ID: string;
				GOOGLE_CLIENT_SECRET: string;
				APPLE_CLIENT_ID?: string;
				APPLE_TEAM_ID?: string;
				APPLE_KEY_ID?: string;
				APPLE_PRIVATE_KEY?: string;
				ENVIRONMENT: string;
				SITE_URL: string;
			};
			context: ExecutionContext;
			caches: CacheStorage & { default: Cache };
		}
	}
}

export {};
