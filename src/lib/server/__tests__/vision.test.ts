// Tests for vision module - SSRF protection and URL validation
import { describe, it, expect } from 'vitest';

// Import the SSRF validation function
import { validateImageUrlSafety } from '$lib/server/agents/vision';
import { buildStyleProfileContext } from '$lib/server/agents/utils';

describe('Vision SSRF Protection', () => {
	describe('validateImageUrlSafety', () => {
		it('should accept valid HTTPS URLs', () => {
			expect(validateImageUrlSafety('https://example.com/image.jpg')).toBe('https://example.com/image.jpg');
			expect(validateImageUrlSafety('https://cdn.shopify.com/image.png')).toBe('https://cdn.shopify.com/image.png');
		});

		it('should reject HTTP URLs', () => {
			expect(validateImageUrlSafety('http://example.com/image.jpg')).toBeNull();
		});

		it('should reject URLs with credentials', () => {
			expect(validateImageUrlSafety('https://user:pass@example.com/image.jpg')).toBeNull();
		});

		it('should reject localhost', () => {
			expect(validateImageUrlSafety('https://localhost/image.jpg')).toBeNull();
			expect(validateImageUrlSafety('https://localhost.localdomain/image.jpg')).toBeNull();
		});

		it('should reject loopback addresses (127.x.x.x)', () => {
			expect(validateImageUrlSafety('https://127.0.0.1/image.jpg')).toBeNull();
			expect(validateImageUrlSafety('https://127.1.1.1/image.jpg')).toBeNull();
		});

		it('should reject private IP addresses (10.x.x.x)', () => {
			expect(validateImageUrlSafety('https://10.0.0.1/image.jpg')).toBeNull();
			expect(validateImageUrlSafety('https://10.255.255.255/image.jpg')).toBeNull();
		});

		it('should reject private IP addresses (192.168.x.x)', () => {
			expect(validateImageUrlSafety('https://192.168.0.1/image.jpg')).toBeNull();
			expect(validateImageUrlSafety('https://192.168.255.255/image.jpg')).toBeNull();
		});

		it('should reject private IP addresses (172.16-31.x.x)', () => {
			expect(validateImageUrlSafety('https://172.16.0.1/image.jpg')).toBeNull();
			expect(validateImageUrlSafety('https://172.31.255.255/image.jpg')).toBeNull();
			// Should allow 172.15.x.x and 172.32.x.x
			expect(validateImageUrlSafety('https://172.15.0.1/image.jpg')).toBe('https://172.15.0.1/image.jpg');
			expect(validateImageUrlSafety('https://172.32.0.1/image.jpg')).toBe('https://172.32.0.1/image.jpg');
		});

		it('should reject AWS metadata endpoint (169.254.169.254)', () => {
			expect(validateImageUrlSafety('https://169.254.169.254/latest/meta-data')).toBeNull();
		});

		it('should reject link-local addresses (169.254.x.x)', () => {
			expect(validateImageUrlSafety('https://169.254.0.1/image.jpg')).toBeNull();
		});

		it('should reject cloud metadata hostnames', () => {
			expect(validateImageUrlSafety('https://metadata.google.internal/computeMetadata')).toBeNull();
			expect(validateImageUrlSafety('https://metadata.goog/v1/instance')).toBeNull();
		});

		it('should reject internal hostnames', () => {
			expect(validateImageUrlSafety('https://internal-service.internal/data')).toBeNull();
			expect(validateImageUrlSafety('https://myapp.corp.internal/secret')).toBeNull();
		});

		it('should reject invalid IPs starting with 0', () => {
			expect(validateImageUrlSafety('https://0.0.0.0/image.jpg')).toBeNull();
		});

		it('should reject IPv6 localhost', () => {
			expect(validateImageUrlSafety('https://[::1]/image.jpg')).toBeNull();
		});

		it('should handle null/undefined input', () => {
			expect(validateImageUrlSafety(null as any)).toBeNull();
			expect(validateImageUrlSafety(undefined as any)).toBeNull();
			expect(validateImageUrlSafety('')).toBeNull();
		});

		it('should handle invalid URLs gracefully', () => {
			expect(validateImageUrlSafety('not-a-url')).toBeNull();
			expect(validateImageUrlSafety('ftp://example.com/file')).toBeNull();
		});

		it('should allow valid public IP addresses', () => {
			expect(validateImageUrlSafety('https://8.8.8.8/image.jpg')).toBe('https://8.8.8.8/image.jpg');
			expect(validateImageUrlSafety('https://1.1.1.1/image.jpg')).toBe('https://1.1.1.1/image.jpg');
		});

		it('should allow valid CDN domains', () => {
			expect(validateImageUrlSafety('https://d123456.cloudfront.net/image.jpg'))
				.toBe('https://d123456.cloudfront.net/image.jpg');
			expect(validateImageUrlSafety('https://images.unsplash.com/photo-123'))
				.toBe('https://images.unsplash.com/photo-123');
		});
	});
});

describe('Vision Profile Context', () => {
	it('should build context with color preferences', () => {
		const profile = {
			color_favorites: ['blue', 'green'],
			color_avoid: ['orange']
		};

		const result = buildStyleProfileContext(profile);
		expect(result).toContain('## User Style Preferences');
		expect(result).toContain('Favorite Colors: blue, green');
		expect(result).toContain('Colors to Avoid: orange');
	});

	it('should return empty string when no preferences', () => {
		const result = buildStyleProfileContext({});
		expect(result).toBe('');
	});

	it('should include style notes', () => {
		const profile = {
			style_notes: 'Prefer minimalist design'
		};

		const result = buildStyleProfileContext(profile);
		expect(result).toContain('Style Notes: Prefer minimalist design');
	});
});
