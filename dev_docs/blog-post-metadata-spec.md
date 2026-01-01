# Blog Post MDX Metadata Specification

This document defines the exact format required for blog post metadata in MDX files.

## Metadata Format

All blog posts must start with an `export const metadata` block at the top of the file, before any markdown content.

## TypeScript Interface

```typescript
interface BlogPostMetadata {
  // Required fields
  id: string; // Unique identifier (e.g., "blog-001")
  type: "blog"; // Must be literal "blog"
  title: string; // Post title
  author: string; // Author name
  publishDate: string; // ISO date string (YYYY-MM-DD) or ISO datetime
  description: string; // Post description/excerpt
  categories: string[]; // Array of category strings
  tags: string[]; // Array of tag strings
  modifiedDate: string; // ISO datetime string (YYYY-MM-DDTHH:mm:ss.sssZ)
  image: string | null; // Image path or null
  draft: boolean; // Whether post is a draft
  relatedPosts: string[]; // Array of related post slugs
  slug: string; // URL-friendly slug (usually matches filename)

  // Optional fields (auto-generated if not provided)
  readingTime?: number; // Reading time in minutes (auto-calculated)
  filePath?: string; // File path (auto-set by cache script)

  // Optional image generation fields
  imageStatus?: "pending" | "generating" | "complete" | "failed";
  imageTheme?: string; // Manual theme override for image generation
  imageComplexity?: "simple" | "medium" | "complex"; // Manual complexity override
}
```

## Field Descriptions

### Required Fields

| Field          | Type             | Description                                                     | Example                                            |
| -------------- | ---------------- | --------------------------------------------------------------- | -------------------------------------------------- |
| `id`           | `string`         | Unique identifier for the post                                  | `"blog-001"`                                       |
| `type`         | `"blog"`         | Must be the literal string `"blog"`                             | `"blog"`                                           |
| `title`        | `string`         | Post title (displayed in listings and headers)                  | `"Build your team's AI support bot in 10 minutes"` |
| `author`       | `string`         | Author name                                                     | `"ChatIQ Team"`                                    |
| `publishDate`  | `string`         | Publication date in ISO format (YYYY-MM-DD) or ISO datetime     | `"2025-12-02"` or `"2025-12-02T00:00:00.000Z"`     |
| `description`  | `string`         | Post description/excerpt (used in listings and meta tags)       | `"Learn how to create a custom AI support bot..."` |
| `categories`   | `string[]`       | Array of category strings (used for filtering)                  | `["tutorial", "getting-started"]`                  |
| `tags`         | `string[]`       | Array of tag strings (used for filtering and search)            | `["ai", "chatbot", "tutorial"]`                    |
| `modifiedDate` | `string`         | Last modification date in ISO datetime format                   | `"2025-12-02T00:00:00.000Z"`                       |
| `image`        | `string \| null` | Image path (relative to public dir) or `null`                   | `"/blog/images/my-post.jpg"` or `null`             |
| `draft`        | `boolean`        | Whether the post is a draft (drafts are excluded from listings) | `false`                                            |
| `relatedPosts` | `string[]`       | Array of related post slugs                                     | `["another-post-slug"]`                            |
| `slug`         | `string`         | URL-friendly identifier (usually matches filename without .mdx) | `"build-your-ai-support-bot-in-10-minutes"`        |

### Optional Fields

| Field             | Type                                | Description                                | Auto-Generated?             |
| ----------------- | ----------------------------------- | ------------------------------------------ | --------------------------- |
| `readingTime`     | `number`                            | Estimated reading time in minutes          | ✅ Yes (from content)       |
| `filePath`        | `string`                            | Relative file path                         | ✅ Yes (by cache script)    |
| `imageStatus`     | `string`                            | Image generation status                    | ✅ Yes (by image generator) |
| `imageTheme`      | `string`                            | Manual theme override for image generation | ❌ No                       |
| `imageComplexity` | `"simple" \| "medium" \| "complex"` | Manual complexity override                 | ❌ No                       |

## Example

```mdx
export const metadata = {
  id: "blog-001",
  type: "blog",
  title: "Build your team's AI support bot in 10 minutes",
  author: "ChatIQ Team",
  publishDate: "2025-12-02",
  description:
    "Learn how to create a custom AI support bot powered by your own knowledge base in just 10 minutes. No coding required.",
  categories: ["tutorial", "getting-started", "support"],
  tags: ["ai", "chatbot", "support", "tutorial", "quick-start"],
  modifiedDate: "2025-12-02T00:00:00.000Z",
  image: "/blog/images/build-your-ai-support-bot-in-10-minutes.jpg",
  draft: false,
  relatedPosts: [],
  slug: "build-your-ai-support-bot-in-10-minutes",
  // Optional fields
  imageTheme: "AI chatbots and automation", // Optional: manual theme override
  imageComplexity: "medium", // Optional: manual complexity override
};

# Build your team's AI support bot in 10 minutes

Your markdown content goes here...
```

## Format Requirements

### Dates

- **`publishDate`**: ISO date string `YYYY-MM-DD` or ISO datetime `YYYY-MM-DDTHH:mm:ss.sssZ`

  - ✅ `"2025-12-02"`
  - ✅ `"2025-12-02T00:00:00.000Z"`
  - ❌ `"December 2, 2025"` (not supported)

- **`modifiedDate`**: ISO datetime string `YYYY-MM-DDTHH:mm:ss.sssZ`
  - ✅ `"2025-12-02T00:00:00.000Z"`
  - ✅ `"2025-12-02T14:30:00.000Z"`
  - ❌ `"2025-12-02"` (should include time)

### Arrays

- **`categories`**: Array of strings (can be empty)

  - ✅ `["tutorial"]`
  - ✅ `["tutorial", "getting-started"]`
  - ✅ `[]` (empty array)

- **`tags`**: Array of strings (can be empty)

  - ✅ `["ai", "chatbot"]`
  - ✅ `[]` (empty array)

- **`relatedPosts`**: Array of post slugs (can be empty)
  - ✅ `["another-post-slug"]`
  - ✅ `[]` (empty array)

### Image Path

- **`image`**: String path relative to `public/` directory, or `null`
  - ✅ `"/blog/images/my-post.jpg"`
  - ✅ `null` (no image)
  - ❌ `"blog/images/my-post.jpg"` (missing leading slash)
  - ❌ `"https://example.com/image.jpg"` (must be relative path)

### Image Dimensions & Aspect Ratio

**Recommended Aspect Ratio: 16:9 (1.78:1)**

The blog UI displays images with `aspect-video` class, which uses a 16:9 aspect ratio. Images are displayed with `object-cover`, which means:

- **Square images (1:1)** will be cropped to fit 16:9
- **16:9 images** will display perfectly without cropping
- **Wider images** will be cropped on top/bottom
- **Taller images** will be cropped on left/right

**Recommended Dimensions:**

- **Width**: 1920px (or 1024px minimum)
- **Height**: 1080px (or 576px minimum)
- **Aspect Ratio**: 16:9 (1920×1080, 1280×720, 1024×576)

**DALL-E 3 Supported Sizes:**

- `1024x1024` (square - will be cropped in UI)
- `1792x1024` (16:9 - recommended)
- `1024x1792` (9:16 - portrait, not recommended)

**Note**: The current image generator uses `1024x1024` (square). For best results, update to `1792x1024` (16:9).

### Slug

- **`slug`**: URL-friendly identifier
  - Should match filename (without `.mdx` extension)
  - Lowercase, hyphens for spaces
  - ✅ `"build-your-ai-support-bot-in-10-minutes"`
  - ✅ `"my-awesome-post"`
  - ❌ `"My Awesome Post"` (should be lowercase)
  - ❌ `"my awesome post"` (should use hyphens)

## Auto-Generated Fields

These fields are automatically calculated/generated by the cache script and don't need to be provided:

- **`readingTime`**: Calculated from post content (words / 200)
- **`filePath`**: Set automatically by cache script
- **`imageStatus`**: Set by image generator (if using image generation)

## Validation Rules

1. **`type`** must be exactly `"blog"` (case-sensitive)
2. **`slug`** should match the filename (without `.mdx`)
3. **`id`** should be unique across all posts
4. **`publishDate`** must be a valid ISO date string
5. **`modifiedDate`** must be a valid ISO datetime string
6. **`draft: true`** posts are excluded from public listings
7. **`image: null`** means no image (placeholder may be used)
8. **`relatedPosts`** should contain valid post slugs that exist

## Minimal Example

```mdx
export const metadata = {
  id: "blog-002",
  type: "blog",
  title: "My First Post",
  author: "John Doe",
  publishDate: "2025-12-03",
  description: "A short description of the post",
  categories: ["general"],
  tags: ["news"],
  modifiedDate: "2025-12-03T00:00:00.000Z",
  image: null,
  draft: false,
  relatedPosts: [],
  slug: "my-first-post",
};

# My First Post

Post content here...
```

## Notes for Blog Creation Service

1. **File Naming**: The MDX file should be named `{slug}.mdx`
2. **Metadata First**: Metadata block must be at the very top of the file
3. **No Trailing Commas**: Avoid trailing commas in arrays/objects (some parsers don't like them)
4. **Image Path**: Set `image` to `null` initially, image generator will update it
5. **Slug Generation**: Generate slug from title (lowercase, hyphens, remove special chars)
6. **Date Format**: Use ISO format for dates (YYYY-MM-DD for publishDate)
7. **Arrays**: Always use arrays, even if empty `[]`

## Integration with Image Generator

If using the blog image generator:

1. Set `image: null` initially
2. Optionally set `imageTheme` for manual theme override
3. Optionally set `imageComplexity` for manual complexity override
4. After image generation, update `image` to the generated path
5. Image generator will set `imageStatus` automatically

Example with image generation fields:

```mdx
export const metadata = {
  // ... other fields ...
  image: null, // Will be set after image generation
  imageTheme: "AI chatbots and automation", // Optional override
  imageComplexity: "medium", // Optional override
};

;
```
