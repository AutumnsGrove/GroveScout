# CDN Admin Upload System - Agent Implementation Prompt

> **Target Project**: GroveEngine
> **Domain**: cdn.grove.place
> **Purpose**: Admin panel for uploading and managing CDN assets stored in Cloudflare R2

---

## Overview

Implement a complete CDN management system with:
1. **R2 Storage** - Cloudflare R2 bucket for file storage
2. **Admin Upload UI** - Drag & drop interface for file uploads
3. **File Management** - List, delete, copy URL functionality
4. **Public CDN Route** - Serve files at cdn.grove.place
5. **GitHub Actions** - Auto-deploy on commit

---

## Implementation Steps

### 1. Configure Cloudflare R2 Bucket

**File: `wrangler.toml`**

Add R2 bucket binding:

```toml
# R2 Bucket for CDN file storage (cdn.grove.place)
[[r2_buckets]]
binding = "CDN_BUCKET"
bucket_name = "grove-cdn"
# Run: npx wrangler r2 bucket create grove-cdn
```

Add CDN_URL environment variable:

```toml
[vars]
# ... existing vars ...
CDN_URL = "http://localhost:5173/cdn"  # Development

[env.production.vars]
# ... existing vars ...
CDN_URL = "https://cdn.grove.place"  # Production
```

---

### 2. Update TypeScript Declarations

**File: `src/app.d.ts`**

Add to the Platform.env interface:

```typescript
interface Platform {
  env: {
    // ... existing bindings ...
    CDN_BUCKET: R2Bucket;  // Add this
    CDN_URL: string;       // Add this
  };
  // ...
}
```

---

### 3. Create Database Migration

**File: `migrations/XXXX_cdn.sql`** (use next migration number)

```sql
-- CDN Files Table
-- Tracks uploaded files to the CDN (R2 bucket)

CREATE TABLE IF NOT EXISTS cdn_files (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    key TEXT NOT NULL UNIQUE,  -- R2 object key (path in bucket)
    content_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    folder TEXT DEFAULT '/',   -- Virtual folder for organization
    alt_text TEXT,             -- Accessibility alt text
    uploaded_by TEXT NOT NULL, -- User ID who uploaded
    created_at TEXT NOT NULL,
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- Index for listing files by folder
CREATE INDEX IF NOT EXISTS idx_cdn_files_folder ON cdn_files(folder, created_at DESC);

-- Index for finding files by key
CREATE INDEX IF NOT EXISTS idx_cdn_files_key ON cdn_files(key);

-- Index for finding files by uploader
CREATE INDEX IF NOT EXISTS idx_cdn_files_uploaded_by ON cdn_files(uploaded_by);
```

---

### 4. Add Database Operations

**File: `src/lib/server/db.ts`**

Add CDN file CRUD operations:

```typescript
// ============================================================================
// CDN Files Operations
// ============================================================================

export interface CdnFile {
	id: string;
	filename: string;
	original_filename: string;
	key: string;
	content_type: string;
	size_bytes: number;
	folder: string;
	alt_text: string | null;
	uploaded_by: string;
	created_at: string;
}

export async function createCdnFile(
	db: D1Database,
	data: {
		filename: string;
		original_filename: string;
		key: string;
		content_type: string;
		size_bytes: number;
		folder?: string;
		alt_text?: string;
		uploaded_by: string;
	}
): Promise<CdnFile> {
	const id = generateId();
	const timestamp = now();

	await db
		.prepare(
			`INSERT INTO cdn_files (id, filename, original_filename, key, content_type, size_bytes, folder, alt_text, uploaded_by, created_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
		)
		.bind(
			id,
			data.filename,
			data.original_filename,
			data.key,
			data.content_type,
			data.size_bytes,
			data.folder ?? '/',
			data.alt_text ?? null,
			data.uploaded_by,
			timestamp
		)
		.run();

	return {
		id,
		filename: data.filename,
		original_filename: data.original_filename,
		key: data.key,
		content_type: data.content_type,
		size_bytes: data.size_bytes,
		folder: data.folder ?? '/',
		alt_text: data.alt_text ?? null,
		uploaded_by: data.uploaded_by,
		created_at: timestamp
	};
}

export async function getCdnFile(db: D1Database, id: string): Promise<CdnFile | null> {
	const result = await db
		.prepare('SELECT * FROM cdn_files WHERE id = ?')
		.bind(id)
		.first<CdnFile>();
	return result ?? null;
}

export async function getCdnFileByKey(db: D1Database, key: string): Promise<CdnFile | null> {
	const result = await db
		.prepare('SELECT * FROM cdn_files WHERE key = ?')
		.bind(key)
		.first<CdnFile>();
	return result ?? null;
}

export async function listCdnFiles(
	db: D1Database,
	options?: { folder?: string; limit?: number; offset?: number }
): Promise<{ files: CdnFile[]; total: number }> {
	const folder = options?.folder ?? '/';
	const limit = options?.limit ?? 50;
	const offset = options?.offset ?? 0;

	const [filesResult, countResult] = await Promise.all([
		db
			.prepare(
				`SELECT * FROM cdn_files
				 WHERE folder = ?
				 ORDER BY created_at DESC
				 LIMIT ? OFFSET ?`
			)
			.bind(folder, limit, offset)
			.all<CdnFile>(),
		db.prepare('SELECT COUNT(*) as count FROM cdn_files WHERE folder = ?').bind(folder).first<{ count: number }>()
	]);

	return {
		files: filesResult.results ?? [],
		total: countResult?.count ?? 0
	};
}

export async function listAllCdnFiles(
	db: D1Database,
	options?: { limit?: number; offset?: number }
): Promise<{ files: CdnFile[]; total: number }> {
	const limit = options?.limit ?? 50;
	const offset = options?.offset ?? 0;

	const [filesResult, countResult] = await Promise.all([
		db
			.prepare(
				`SELECT * FROM cdn_files
				 ORDER BY created_at DESC
				 LIMIT ? OFFSET ?`
			)
			.bind(limit, offset)
			.all<CdnFile>(),
		db.prepare('SELECT COUNT(*) as count FROM cdn_files').first<{ count: number }>()
	]);

	return {
		files: filesResult.results ?? [],
		total: countResult?.count ?? 0
	};
}

export async function deleteCdnFile(db: D1Database, id: string): Promise<string | null> {
	const file = await getCdnFile(db, id);
	if (!file) return null;

	await db.prepare('DELETE FROM cdn_files WHERE id = ?').bind(id).run();
	return file.key;
}

export async function updateCdnFileAltText(db: D1Database, id: string, altText: string): Promise<void> {
	await db.prepare('UPDATE cdn_files SET alt_text = ? WHERE id = ?').bind(altText, id).run();
}

export async function getCdnFolders(db: D1Database): Promise<string[]> {
	const result = await db
		.prepare('SELECT DISTINCT folder FROM cdn_files ORDER BY folder')
		.all<{ folder: string }>();
	return (result.results ?? []).map((r) => r.folder);
}
```

---

### 5. Create API Endpoints

#### 5.1 Upload Endpoint

**File: `src/routes/api/admin/cdn/upload/+server.ts`**

```typescript
// CDN File Upload Endpoint
// POST /api/admin/cdn/upload

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createCdnFile } from '$lib/server/db';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const ALLOWED_TYPES = new Set([
	'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/avif',
	'application/pdf',
	'video/mp4', 'video/webm',
	'audio/mpeg', 'audio/wav', 'audio/webm',
	'font/woff', 'font/woff2', 'font/ttf', 'font/otf',
	'application/json', 'text/css', 'text/javascript', 'application/javascript'
]);

function sanitizeFilename(filename: string): string {
	return filename
		.replace(/[/\\:*?"<>|]/g, '-')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-')
		.toLowerCase();
}

function generateUniqueFilename(originalFilename: string): string {
	const ext = originalFilename.split('.').pop() || '';
	const nameWithoutExt = originalFilename.slice(0, originalFilename.lastIndexOf('.')) || originalFilename;
	const sanitized = sanitizeFilename(nameWithoutExt);
	const timestamp = Date.now();
	const random = Math.random().toString(36).substring(2, 8);
	return ext ? `${sanitized}-${timestamp}-${random}.${ext}` : `${sanitized}-${timestamp}-${random}`;
}

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	if (!locals.user) throw error(401, 'Unauthorized');
	if (!locals.user.is_admin) throw error(403, 'Admin access required');
	if (!platform) throw error(500, 'Platform not available');

	const { DB, CDN_BUCKET, CDN_URL } = platform.env;

	try {
		const formData = await request.formData();
		const file = formData.get('file') as File | null;
		const folder = (formData.get('folder') as string) || '/';
		const altText = (formData.get('alt_text') as string) || '';

		if (!file) throw error(400, 'No file provided');
		if (file.size > MAX_FILE_SIZE) throw error(400, `File too large. Max ${MAX_FILE_SIZE / 1024 / 1024}MB`);
		if (!ALLOWED_TYPES.has(file.type)) throw error(400, `File type not allowed: ${file.type}`);

		const filename = generateUniqueFilename(file.name);
		const cleanFolder = folder.startsWith('/') ? folder : `/${folder}`;
		const key = cleanFolder === '/' ? filename : `${cleanFolder.slice(1)}/${filename}`;

		const arrayBuffer = await file.arrayBuffer();
		await CDN_BUCKET.put(key, arrayBuffer, {
			httpMetadata: {
				contentType: file.type,
				cacheControl: 'public, max-age=31536000'
			}
		});

		const cdnFile = await createCdnFile(DB, {
			filename,
			original_filename: file.name,
			key,
			content_type: file.type,
			size_bytes: file.size,
			folder: cleanFolder,
			alt_text: altText || undefined,
			uploaded_by: locals.user.id
		});

		return json({
			success: true,
			file: { ...cdnFile, url: `${CDN_URL}/${key}` }
		});
	} catch (err) {
		console.error('[CDN Upload Error]', err);
		if (err instanceof Error && 'status' in err) throw err;
		throw error(500, 'Failed to upload file');
	}
};
```

#### 5.2 List Files Endpoint

**File: `src/routes/api/admin/cdn/files/+server.ts`**

```typescript
// GET /api/admin/cdn/files

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { listAllCdnFiles, getCdnFolders } from '$lib/server/db';

export const GET: RequestHandler = async ({ url, locals, platform }) => {
	if (!locals.user) throw error(401, 'Unauthorized');
	if (!locals.user.is_admin) throw error(403, 'Admin access required');
	if (!platform) throw error(500, 'Platform not available');

	const { DB, CDN_URL } = platform.env;
	const limit = parseInt(url.searchParams.get('limit') || '50', 10);
	const offset = parseInt(url.searchParams.get('offset') || '0', 10);

	const [filesData, folders] = await Promise.all([
		listAllCdnFiles(DB, { limit, offset }),
		getCdnFolders(DB)
	]);

	const filesWithUrls = filesData.files.map((file) => ({
		...file,
		url: `${CDN_URL}/${file.key}`
	}));

	return json({
		success: true,
		files: filesWithUrls,
		total: filesData.total,
		folders,
		limit,
		offset
	});
};
```

#### 5.3 Delete File Endpoint

**File: `src/routes/api/admin/cdn/files/[id]/+server.ts`**

```typescript
// DELETE /api/admin/cdn/files/[id]
// PATCH /api/admin/cdn/files/[id] (update alt_text)

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { deleteCdnFile, getCdnFile, updateCdnFileAltText } from '$lib/server/db';

export const DELETE: RequestHandler = async ({ params, locals, platform }) => {
	if (!locals.user) throw error(401, 'Unauthorized');
	if (!locals.user.is_admin) throw error(403, 'Admin access required');
	if (!platform) throw error(500, 'Platform not available');

	const { DB, CDN_BUCKET } = platform.env;
	const key = await deleteCdnFile(DB, params.id);

	if (!key) throw error(404, 'File not found');

	await CDN_BUCKET.delete(key);

	return json({ success: true, message: 'File deleted successfully' });
};

export const PATCH: RequestHandler = async ({ params, request, locals, platform }) => {
	if (!locals.user) throw error(401, 'Unauthorized');
	if (!locals.user.is_admin) throw error(403, 'Admin access required');
	if (!platform) throw error(500, 'Platform not available');

	const { DB, CDN_URL } = platform.env;
	const body = await request.json();
	const { alt_text } = body;

	if (typeof alt_text !== 'string') throw error(400, 'alt_text must be a string');

	const file = await getCdnFile(DB, params.id);
	if (!file) throw error(404, 'File not found');

	await updateCdnFileAltText(DB, params.id, alt_text);

	return json({
		success: true,
		file: { ...file, alt_text, url: `${CDN_URL}/${file.key}` }
	});
};
```

---

### 6. Create Public CDN Route

**File: `src/routes/cdn/[...path]/+server.ts`**

```typescript
// Public CDN File Server - GET /cdn/[...path]

import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const CACHE_CONTROL: Record<string, string> = {
	'image/jpeg': 'public, max-age=31536000, immutable',
	'image/png': 'public, max-age=31536000, immutable',
	'image/gif': 'public, max-age=31536000, immutable',
	'image/webp': 'public, max-age=31536000, immutable',
	'image/svg+xml': 'public, max-age=31536000, immutable',
	'image/avif': 'public, max-age=31536000, immutable',
	'font/woff': 'public, max-age=31536000, immutable',
	'font/woff2': 'public, max-age=31536000, immutable',
	'video/mp4': 'public, max-age=31536000, immutable',
	'video/webm': 'public, max-age=31536000, immutable',
	'audio/mpeg': 'public, max-age=31536000, immutable',
	'application/pdf': 'public, max-age=86400',
	'application/json': 'public, max-age=3600',
	'text/css': 'public, max-age=86400',
};

export const GET: RequestHandler = async ({ params, platform, request }) => {
	if (!platform) throw error(500, 'Platform not available');

	const { CDN_BUCKET } = platform.env;
	const key = params.path;
	if (!key) throw error(400, 'File path required');

	const object = await CDN_BUCKET.get(key);
	if (!object) throw error(404, 'File not found');

	const contentType = object.httpMetadata?.contentType || 'application/octet-stream';
	const headers = new Headers();
	headers.set('Content-Type', contentType);
	headers.set('Cache-Control', CACHE_CONTROL[contentType] || 'public, max-age=86400');
	headers.set('ETag', object.httpEtag);

	const ifNoneMatch = request.headers.get('If-None-Match');
	if (ifNoneMatch && ifNoneMatch === object.httpEtag) {
		return new Response(null, { status: 304, headers });
	}

	if (contentType.startsWith('font/')) {
		headers.set('Access-Control-Allow-Origin', '*');
	}

	return new Response(object.body, { headers });
};

export const OPTIONS: RequestHandler = async () => {
	return new Response(null, {
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type',
			'Access-Control-Max-Age': '86400'
		}
	});
};
```

---

### 7. Create CDN Landing Page

**File: `src/routes/cdn/+page.svelte`**

Create a landing page for cdn.grove.place root that:
- Shows Grove CDN branding
- Links back to the main project
- Lists capabilities (images, fonts, documents, etc.)
- Uses the project's design system styling

---

### 8. Create Admin CDN Manager Page

**File: `src/routes/admin/cdn/+page.server.ts`**

```typescript
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { listAllCdnFiles, getCdnFolders } from '$lib/server/db';

export const load: PageServerLoad = async ({ locals, platform }) => {
	if (!locals.user) throw error(401, 'Unauthorized');
	if (!locals.user.is_admin) throw error(403, 'Admin access required');
	if (!platform) throw error(500, 'Platform not available');

	const { DB, CDN_URL } = platform.env;

	const [filesData, folders] = await Promise.all([
		listAllCdnFiles(DB, { limit: 50, offset: 0 }),
		getCdnFolders(DB)
	]);

	const files = filesData.files.map((file) => ({
		...file,
		url: `${CDN_URL}/${file.key}`
	}));

	return { files, total: filesData.total, folders, cdnUrl: CDN_URL };
};
```

**File: `src/routes/admin/cdn/+page.svelte`**

Create a comprehensive admin page with:

1. **Header** - Title, stats (file count, folder count), link back to admin dashboard

2. **Upload Zone** - Drag & drop area with:
   - Visual feedback when dragging
   - Progress indicators during upload
   - Multiple file support
   - Folder selection dropdown
   - "New Folder" option

3. **Files Grid** - Card-based layout showing:
   - Image preview (or icon for non-images)
   - Filename
   - File size
   - Upload date
   - Folder path
   - Action buttons: Copy URL, Open in new tab, Delete

4. **Features**:
   - `$state` for reactive state management (Svelte 5)
   - File type icons based on MIME type
   - Copy URL to clipboard with visual feedback
   - Confirm before delete
   - Error message display
   - Empty state when no files

---

### 9. Add Link to Main Admin Dashboard

Update the existing admin dashboard page to include a prominent link to the CDN Manager:

```svelte
<a href="/admin/cdn" class="cdn-link">
    📤 CDN Manager
</a>
```

---

### 10. Create GitHub Actions Workflow

**File: `.github/workflows/deploy.yml`**

```yaml
name: Deploy to Cloudflare

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    name: Deploy

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install Dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Run Database Migrations
        run: npx wrangler d1 migrations apply DATABASE_NAME --remote
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}

      - name: Deploy to Cloudflare Workers
        run: npx wrangler deploy --env production
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

---

### 11. Required GitHub Secrets

Set these in the repository settings:

- `CLOUDFLARE_API_TOKEN` - API token with Workers/R2/D1 permissions
- `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare account ID

---

### 12. Cloudflare Setup (Manual)

After deployment, configure in Cloudflare dashboard:

1. **Create R2 Bucket**: `npx wrangler r2 bucket create grove-cdn`
2. **Custom Domain**: Add `cdn.grove.place` as a custom domain for the worker
3. **DNS**: Point `cdn.grove.place` to the worker

---

## File Structure Summary

```
src/
├── routes/
│   ├── admin/
│   │   ├── cdn/
│   │   │   ├── +page.server.ts    # Admin CDN page data loader
│   │   │   └── +page.svelte       # Admin CDN UI
│   │   └── +page.svelte           # Update: add CDN link
│   ├── api/
│   │   └── admin/
│   │       └── cdn/
│   │           ├── upload/
│   │           │   └── +server.ts # POST upload
│   │           └── files/
│   │               ├── +server.ts # GET list files
│   │               └── [id]/
│   │                   └── +server.ts # DELETE/PATCH file
│   └── cdn/
│       ├── +page.svelte           # CDN landing page
│       └── [...path]/
│           └── +server.ts         # Public file server
├── lib/
│   └── server/
│       └── db.ts                  # Add CDN operations
└── app.d.ts                       # Add R2Bucket type

migrations/
└── XXXX_cdn.sql                   # CDN files table

wrangler.toml                      # Add R2 binding + CDN_URL

.github/
└── workflows/
    └── deploy.yml                 # CI/CD workflow
```

---

## Key Implementation Notes

1. **Admin Auth**: All admin endpoints check `locals.user.is_admin`
2. **File Validation**: Size limit (50MB), MIME type whitelist
3. **Unique Filenames**: Timestamp + random suffix prevents collisions
4. **Cache Headers**: Long cache (1 year) for immutable assets
5. **ETag Support**: Conditional requests for bandwidth savings
6. **CORS**: Enabled for font files
7. **Virtual Folders**: Organize files without actual directories

---

## Testing Checklist

- [ ] Upload single file
- [ ] Upload multiple files
- [ ] Upload to custom folder
- [ ] Create new folder during upload
- [ ] List files
- [ ] Copy URL to clipboard
- [ ] Open file in new tab
- [ ] Delete file
- [ ] Access file via cdn.grove.place/path
- [ ] CDN landing page displays correctly
- [ ] GitHub Actions deploys on push
