// Scout - AI Provider Abstraction
// Supports multiple AI providers (Claude, DeepSeek, Kimi, Cloudflare AI) with a common interface.

import Anthropic from '@anthropic-ai/sdk';
import type { Message } from '@anthropic-ai/sdk/resources/messages.mjs';

export type ProviderName = 'claude' | 'deepseek' | 'kimi' | 'cloudflare-ai';

export interface GenerateOptions {
	model: string;
	system?: string;
	messages: Array<{ role: 'user' | 'assistant'; content: string }>;
	max_tokens: number;
	temperature?: number;
}

export interface ProviderResponse {
	content: string;
	usage: {
		input_tokens: number;
		output_tokens: number;
	};
}

export interface AIProvider {
	supportsTools: boolean;
	generate(options: GenerateOptions): Promise<ProviderResponse>;
	generateWithTools?(options: GenerateOptions & { tools: any }): Promise<ProviderResponse>;
}

// Anthropic (Claude) Provider
export class AnthropicProvider implements AIProvider {
	supportsTools = true;
	private client: Anthropic;

	constructor(apiKey: string) {
		this.client = new Anthropic({ apiKey });
	}

	async generate(options: GenerateOptions): Promise<ProviderResponse> {
		const response = await this.client.messages.create({
			model: options.model,
			system: options.system,
			messages: options.messages as any,
			max_tokens: options.max_tokens,
			temperature: options.temperature,
		});

		const content = response.content[0];
		if (content.type !== 'text') {
			throw new Error('Non-text response from Anthropic');
		}

		return {
			content: content.text,
			usage: {
				input_tokens: response.usage.input_tokens,
				output_tokens: response.usage.output_tokens,
			},
		};
	}

	// Anthropic supports tool use, but we'll keep it simple for now
	async generateWithTools(options: GenerateOptions & { tools: any }): Promise<ProviderResponse> {
		// Implement tool calling if needed
		throw new Error('Tool calling not yet implemented for Anthropic');
	}
}

// DeepSeek Provider (placeholder)
export class DeepSeekProvider implements AIProvider {
	supportsTools = false;
	private apiKey: string;

	constructor(apiKey: string) {
		this.apiKey = apiKey;
	}

	async generate(options: GenerateOptions): Promise<ProviderResponse> {
		// TODO: Implement DeepSeek API call
		throw new Error('DeepSeek provider not yet implemented');
	}
}

// Kimi Provider (placeholder)
export class KimiProvider implements AIProvider {
	supportsTools = false;
	private apiKey: string;

	constructor(apiKey: string) {
		this.apiKey = apiKey;
	}

	async generate(options: GenerateOptions): Promise<ProviderResponse> {
		throw new Error('Kimi provider not yet implemented');
	}
}

// Cloudflare AI Provider (placeholder)
export class CloudflareAIProvider implements AIProvider {
	supportsTools = false;
	private accountId: string;
	private apiToken: string;

	constructor(accountId: string, apiToken: string) {
		this.accountId = accountId;
		this.apiToken = apiToken;
	}

	async generate(options: GenerateOptions): Promise<ProviderResponse> {
		throw new Error('Cloudflare AI provider not yet implemented');
	}
}

// Provider factory
export function getProvider(name: ProviderName, env: any): AIProvider {
	switch (name) {
		case 'claude':
			return new AnthropicProvider(env.ANTHROPIC_API_KEY);
		case 'deepseek':
			return new DeepSeekProvider(env.DEEPSEEK_API_KEY || '');
		case 'kimi':
			return new KimiProvider(env.KIMI_API_KEY || '');
		case 'cloudflare-ai':
			return new CloudflareAIProvider(env.CLOUDFLARE_ACCOUNT_ID || '', env.CLOUDFLARE_API_TOKEN || '');
		default:
			throw new Error(`Unknown provider: ${name}`);
	}
}