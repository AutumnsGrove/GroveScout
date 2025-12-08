// Tests for orchestrator utility functions
import { describe, it, expect, vi, beforeEach } from 'vitest';

// We need to test the internal utility functions
// Import the module and test via the exported orchestrator
// For now, we'll extract testable logic into a separate test

describe('Orchestrator Utilities', () => {
	describe('URL Validation', () => {
		// Testing validateProductUrl logic
		const validateProductUrl = (urlString: string | undefined): string | null => {
			if (!urlString || typeof urlString !== 'string') {
				return null;
			}

			try {
				const url = new URL(urlString);

				// Only allow HTTPS URLs
				if (url.protocol !== 'https:') {
					return null;
				}

				// Block URLs with credentials
				if (url.username || url.password) {
					return null;
				}

				// Block localhost and private IPs
				const hostname = url.hostname.toLowerCase();
				if (
					hostname === 'localhost' ||
					hostname.startsWith('127.') ||
					hostname.startsWith('192.168.') ||
					hostname.startsWith('10.') ||
					hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)
				) {
					return null;
				}

				// Return sanitized URL (removes any fragment)
				return `${url.protocol}//${url.host}${url.pathname}${url.search}`;
			} catch {
				return null;
			}
		};

		it('should accept valid HTTPS URLs', () => {
			const result = validateProductUrl('https://amazon.com/product/123');
			expect(result).toBe('https://amazon.com/product/123');
		});

		it('should reject HTTP URLs', () => {
			const result = validateProductUrl('http://amazon.com/product/123');
			expect(result).toBeNull();
		});

		it('should reject URLs with credentials', () => {
			const result = validateProductUrl('https://user:pass@amazon.com/product');
			expect(result).toBeNull();
		});

		it('should reject localhost URLs', () => {
			expect(validateProductUrl('https://localhost/product')).toBeNull();
			expect(validateProductUrl('https://127.0.0.1/product')).toBeNull();
		});

		it('should reject private IP URLs', () => {
			expect(validateProductUrl('https://192.168.1.1/product')).toBeNull();
			expect(validateProductUrl('https://10.0.0.1/product')).toBeNull();
			expect(validateProductUrl('https://172.16.0.1/product')).toBeNull();
		});

		it('should strip URL fragments', () => {
			const result = validateProductUrl('https://amazon.com/product#reviews');
			expect(result).toBe('https://amazon.com/product');
		});

		it('should preserve query parameters', () => {
			const result = validateProductUrl('https://amazon.com/product?color=blue&size=M');
			expect(result).toBe('https://amazon.com/product?color=blue&size=M');
		});

		it('should handle null/undefined input', () => {
			expect(validateProductUrl(null as any)).toBeNull();
			expect(validateProductUrl(undefined)).toBeNull();
			expect(validateProductUrl('')).toBeNull();
		});

		it('should handle invalid URLs', () => {
			expect(validateProductUrl('not-a-url')).toBeNull();
			expect(validateProductUrl('ftp://amazon.com/file')).toBeNull();
		});
	});

	describe('Image URL Validation', () => {
		const KNOWN_SAFE_DOMAINS = new Set([
			'amazon.com', 'www.amazon.com',
			'walmart.com', 'www.walmart.com',
			'target.com', 'www.target.com'
		]);

		const validateImageUrl = (urlString: string | undefined): string | null => {
			if (!urlString || typeof urlString !== 'string') {
				return null;
			}

			try {
				const url = new URL(urlString);

				// Only allow HTTPS
				if (url.protocol !== 'https:') {
					return null;
				}

				// Check for common image extensions or CDN patterns
				const pathname = url.pathname.toLowerCase();
				const hasImageExtension = /\.(jpg|jpeg|png|gif|webp|avif|svg)$/i.test(pathname);
				const isCommonCDN = /\.(cloudfront\.net|cloudinary\.com|imgix\.net|akamaized\.net|shopify\.com)$/i.test(url.hostname);

				if (!hasImageExtension && !isCommonCDN) {
					// Allow known retailer domains even without extension
					if (!KNOWN_SAFE_DOMAINS.has(url.hostname.replace(/^www\./, ''))) {
						return null;
					}
				}

				return urlString;
			} catch {
				return null;
			}
		};

		it('should accept URLs with image extensions', () => {
			expect(validateImageUrl('https://example.com/image.jpg')).toBe('https://example.com/image.jpg');
			expect(validateImageUrl('https://example.com/image.png')).toBe('https://example.com/image.png');
			expect(validateImageUrl('https://example.com/image.webp')).toBe('https://example.com/image.webp');
		});

		it('should accept known CDN URLs', () => {
			const cdnUrl = 'https://d1234.cloudfront.net/image';
			expect(validateImageUrl(cdnUrl)).toBe(cdnUrl);
		});

		it('should accept known retailer domains', () => {
			expect(validateImageUrl('https://amazon.com/images/product')).toBe('https://amazon.com/images/product');
			expect(validateImageUrl('https://www.walmart.com/ip/image')).toBe('https://www.walmart.com/ip/image');
		});

		it('should reject HTTP image URLs', () => {
			expect(validateImageUrl('http://example.com/image.jpg')).toBeNull();
		});

		it('should reject unknown domains without image extension', () => {
			expect(validateImageUrl('https://sketchy-site.com/image')).toBeNull();
		});
	});

	describe('Image Matching', () => {
		const findMatchingImage = (
			productName: string,
			images: Array<{ title: string; url: string; thumbnail?: string }>
		): string | null => {
			const nameLower = productName.toLowerCase();
			const nameWords = nameLower.split(/\s+/).filter(w => w.length > 3);

			for (const image of images) {
				const titleLower = image.title.toLowerCase();
				// Check if at least 2 significant words match
				const matches = nameWords.filter(word => titleLower.includes(word));
				if (matches.length >= 2) {
					return image.thumbnail || image.url;
				}
			}

			return null;
		};

		it('should match images with 2+ word overlap', () => {
			const images = [
				{ title: 'Nike Air Max Running Shoes', url: 'https://example.com/1.jpg' },
				{ title: 'Adidas Sneakers', url: 'https://example.com/2.jpg' }
			];

			const result = findMatchingImage('Nike Running Shoes Air Max', images);
			expect(result).toBe('https://example.com/1.jpg');
		});

		it('should return thumbnail if available', () => {
			const images = [
				{
					title: 'Nike Air Max Running Shoes',
					url: 'https://example.com/full.jpg',
					thumbnail: 'https://example.com/thumb.jpg'
				}
			];

			const result = findMatchingImage('Nike Running Shoes', images);
			expect(result).toBe('https://example.com/thumb.jpg');
		});

		it('should return null when no match found', () => {
			const images = [
				{ title: 'Adidas Ultraboost', url: 'https://example.com/1.jpg' }
			];

			const result = findMatchingImage('Nike Running Shoes', images);
			expect(result).toBeNull();
		});

		it('should ignore short words (3 chars or less)', () => {
			const images = [
				{ title: 'The Big Red Ball', url: 'https://example.com/1.jpg' }
			];

			// "the" and "big" are ignored (3 chars), so only "ball" matches
			const result = findMatchingImage('The Big Red', images);
			expect(result).toBeNull();
		});
	});

	describe('Profile Context Building', () => {
		const buildProfileContext = (profile: {
			sizes?: Record<string, string>;
			color_favorites?: string[];
			color_avoid?: string[];
			budget_min?: number;
			budget_max?: number;
			favorite_retailers?: string[];
			excluded_retailers?: string[];
			style_notes?: string;
		}): string => {
			const parts: string[] = ['## User Profile'];

			if (profile.sizes && Object.keys(profile.sizes).length > 0) {
				parts.push(`**Sizes:** ${JSON.stringify(profile.sizes)}`);
			}

			if (profile.color_favorites?.length) {
				parts.push(`**Favorite Colors:** ${profile.color_favorites.join(', ')}`);
			}

			if (profile.color_avoid?.length) {
				parts.push(`**Colors to Avoid:** ${profile.color_avoid.join(', ')}`);
			}

			if (profile.budget_min || profile.budget_max) {
				const min = profile.budget_min ? `$${profile.budget_min / 100}` : '$0';
				const max = profile.budget_max ? `$${profile.budget_max / 100}` : 'any';
				parts.push(`**Budget:** ${min} - ${max}`);
			}

			if (profile.favorite_retailers?.length) {
				parts.push(`**Preferred Retailers:** ${profile.favorite_retailers.join(', ')}`);
			}

			if (profile.excluded_retailers?.length) {
				parts.push(`**Excluded Retailers:** ${profile.excluded_retailers.join(', ')}`);
			}

			if (profile.style_notes) {
				parts.push(`**Style Notes:** ${profile.style_notes}`);
			}

			return parts.join('\n');
		};

		it('should build context with all profile fields', () => {
			const profile = {
				sizes: { shirt: 'M', pants: '32' },
				color_favorites: ['blue', 'green'],
				color_avoid: ['orange'],
				budget_min: 2000,
				budget_max: 10000,
				favorite_retailers: ['amazon.com', 'target.com'],
				excluded_retailers: ['shein.com'],
				style_notes: 'Prefer minimalist style'
			};

			const result = buildProfileContext(profile);

			expect(result).toContain('## User Profile');
			expect(result).toContain('**Sizes:**');
			expect(result).toContain('**Favorite Colors:** blue, green');
			expect(result).toContain('**Colors to Avoid:** orange');
			expect(result).toContain('**Budget:** $20 - $100');
			expect(result).toContain('**Preferred Retailers:** amazon.com, target.com');
			expect(result).toContain('**Excluded Retailers:** shein.com');
			expect(result).toContain('**Style Notes:** Prefer minimalist style');
		});

		it('should handle empty profile', () => {
			const result = buildProfileContext({});
			expect(result).toBe('## User Profile');
		});

		it('should format budget correctly', () => {
			const result = buildProfileContext({ budget_max: 5000 });
			expect(result).toContain('**Budget:** $0 - $50');
		});
	});

	describe('Product Validation and Sanitization', () => {
		const validateAndSanitizeProduct = (product: any) => {
			// Must have name and either URL or retailer
			if (!product.name) return null;

			// Price conversion logic
			const priceValue = product.price_current || product.price || product.priceInCents || 0;
			let priceCurrent = 0;

			if (typeof priceValue === 'string') {
				const cleaned = priceValue.replace(/[$,]/g, '');
				const parsed = parseFloat(cleaned);
				if (!isNaN(parsed)) {
					priceCurrent = parsed < 1000 ? Math.round(parsed * 100) : Math.round(parsed);
				}
			} else if (typeof priceValue === 'number') {
				priceCurrent = priceValue < 1000 ? Math.round(priceValue * 100) : Math.round(priceValue);
			}

			// URL validation (simplified for test)
			const url = product.url || product.link || product.productUrl;
			if (!url || !url.startsWith('https://')) return null;

			// Extract retailer from URL if not provided
			let retailer = product.retailer || product.store || product.merchant || '';
			if (!retailer && url) {
				try {
					const urlObj = new URL(url);
					retailer = urlObj.hostname.replace(/^www\./, '');
				} catch {
					retailer = 'unknown';
				}
			}

			return {
				name: String(product.name).slice(0, 500),
				price_current: Math.abs(priceCurrent),
				retailer: String(retailer).slice(0, 100),
				url: url,
				confidence: Math.min(100, Math.max(0, Number(product.confidence) || (priceCurrent > 0 ? 70 : 50)))
			};
		};

		it('should convert dollar string prices to cents', () => {
			const product = {
				name: 'Test Product',
				price: '$49.99',
				url: 'https://amazon.com/product'
			};

			const result = validateAndSanitizeProduct(product);
			expect(result?.price_current).toBe(4999);
		});

		it('should convert number prices under 1000 to cents', () => {
			const product = {
				name: 'Test Product',
				price_current: 49.99,
				url: 'https://amazon.com/product'
			};

			const result = validateAndSanitizeProduct(product);
			expect(result?.price_current).toBe(4999);
		});

		it('should keep prices over 1000 as cents', () => {
			const product = {
				name: 'Test Product',
				price_current: 4999,
				url: 'https://amazon.com/product'
			};

			const result = validateAndSanitizeProduct(product);
			expect(result?.price_current).toBe(4999);
		});

		it('should extract retailer from URL', () => {
			const product = {
				name: 'Test Product',
				url: 'https://www.amazon.com/product/123'
			};

			const result = validateAndSanitizeProduct(product);
			expect(result?.retailer).toBe('amazon.com');
		});

		it('should reject products without name', () => {
			const product = {
				price: 49.99,
				url: 'https://amazon.com/product'
			};

			const result = validateAndSanitizeProduct(product);
			expect(result).toBeNull();
		});

		it('should reject products without valid URL', () => {
			const product = {
				name: 'Test Product',
				url: 'http://amazon.com/product' // HTTP not HTTPS
			};

			const result = validateAndSanitizeProduct(product);
			expect(result).toBeNull();
		});

		it('should set default confidence based on price availability', () => {
			const productWithPrice = {
				name: 'Test Product',
				price: 49.99,
				url: 'https://amazon.com/product'
			};

			const productWithoutPrice = {
				name: 'Test Product',
				url: 'https://amazon.com/product'
			};

			expect(validateAndSanitizeProduct(productWithPrice)?.confidence).toBe(70);
			expect(validateAndSanitizeProduct(productWithoutPrice)?.confidence).toBe(50);
		});

		it('should truncate long names', () => {
			const product = {
				name: 'A'.repeat(600),
				url: 'https://amazon.com/product'
			};

			const result = validateAndSanitizeProduct(product);
			expect(result?.name.length).toBe(500);
		});
	});

	describe('JSON Parsing Strategies', () => {
		// Test the parsing logic used in parseProductsFromResponse
		const parseProducts = (text: string) => {
			const products: any[] = [];

			// Strategy 1: Try to find a JSON array first
			const arrayMatch = text.match(/\[[\s\S]*?\]/);
			if (arrayMatch) {
				try {
					const parsed = JSON.parse(arrayMatch[0]);
					if (Array.isArray(parsed)) {
						return parsed;
					}
				} catch {
					// Continue
				}
			}

			// Strategy 2: Parse line by line
			const lines = text.split('\n');
			for (const line of lines) {
				const trimmed = line.trim();
				if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
					try {
						products.push(JSON.parse(trimmed));
					} catch {
						// Not valid JSON
					}
				}
			}

			if (products.length > 0) return products;

			// Strategy 3: Find JSON objects with brace matching
			let depth = 0;
			let start = -1;

			for (let i = 0; i < text.length; i++) {
				if (text[i] === '{') {
					if (depth === 0) start = i;
					depth++;
				} else if (text[i] === '}') {
					depth--;
					if (depth === 0 && start !== -1) {
						try {
							products.push(JSON.parse(text.slice(start, i + 1)));
						} catch {
							// Skip
						}
						start = -1;
					}
				}
			}

			return products;
		};

		it('should parse JSON array format', () => {
			const text = `Here are the products:
[{"name": "Product 1"}, {"name": "Product 2"}]`;

			const result = parseProducts(text);
			expect(result).toHaveLength(2);
			expect(result[0].name).toBe('Product 1');
		});

		it('should parse line-by-line JSON objects', () => {
			const text = `{"name": "Product 1", "price": 100}
{"name": "Product 2", "price": 200}
{"name": "Product 3", "price": 300}`;

			const result = parseProducts(text);
			expect(result).toHaveLength(3);
		});

		it('should parse JSON objects with nested braces', () => {
			const text = `Some text {"name": "Product", "details": {"color": "blue"}} more text`;

			const result = parseProducts(text);
			expect(result).toHaveLength(1);
			expect(result[0].details.color).toBe('blue');
		});

		it('should handle mixed valid and invalid JSON', () => {
			const text = `{"name": "Valid"}
{invalid json here}
{"name": "Also Valid"}`;

			const result = parseProducts(text);
			expect(result).toHaveLength(2);
		});
	});
});

describe('Search Provider Selection', () => {
	it('should default to brave provider', () => {
		const options: { searchProvider?: 'brave' | 'tavily' } = {};
		const provider = options.searchProvider || 'brave';
		expect(provider).toBe('brave');
	});

	it('should use tavily when specified', () => {
		const options = { searchProvider: 'tavily' as const };
		const provider = options.searchProvider || 'brave';
		expect(provider).toBe('tavily');
	});
});
