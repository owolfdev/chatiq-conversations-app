# Blog Image Generator

Standalone package for generating retro 8-bit pixel art feature images for blog posts using OpenAI DALL-E 3.

## Installation

### Option 1: As a local package (monorepo)

```bash
cd packages/blog-image-generator
npm install
npm run build
```

### Option 2: As a standalone npm package (when published)

```bash
npm install @chatiq/blog-image-generator
```

### Option 3: Copy to your blog service

Copy the entire `packages/blog-image-generator` directory to your blog service project.

## Usage

### CLI Tool

```bash
# Basic usage
blog-image-generator \
  --slug "my-post" \
  --title "My Blog Post Title" \
  --description "A description of the post" \
  --categories "tutorial,getting-started" \
  --tags "ai,chatbot,tutorial" \
  --output-dir "./public/blog/images" \
  --openai-api-key "sk-..."

# With word count
blog-image-generator \
  --slug "my-post" \
  --title "My Post" \
  --description "Description" \
  --word-count 1500 \
  --output-dir "./public/blog/images"

# With manual overrides
blog-image-generator \
  --slug "my-post" \
  --title "My Post" \
  --description "Description" \
  --image-theme "AI chatbots and automation" \
  --image-complexity "complex" \
  --output-dir "./public/blog/images"

# Using JSON input
blog-image-generator --json '{
  "slug": "my-post",
  "title": "My Post",
  "description": "Description",
  "categories": ["tutorial"],
  "tags": ["ai", "chatbot"],
  "output-dir": "./public/blog/images"
}'
```

### Programmatic Usage

```typescript
import { generateBlogImage, getWordCount } from "@chatiq/blog-image-generator";

const result = await generateBlogImage({
  slug: "my-post",
  title: "My Blog Post Title",
  description: "A description of the post",
  categories: ["tutorial", "getting-started"],
  tags: ["ai", "chatbot", "tutorial"],
  wordCount: 1500, // Optional
  imageTheme: "AI chatbots", // Optional manual override
  imageComplexity: "medium", // Optional: "simple" | "medium" | "complex"
  openaiApiKey: process.env.OPENAI_API_KEY!,
  outputDir: "./public/blog/images",
});

if (result.status === "complete") {
  console.log(`Image saved to: ${result.imagePath}`);
} else {
  console.error(`Generation failed: ${result.error}`);
}
```

## Configuration

### Environment Variables

- `OPENAI_API_KEY` - Your OpenAI API key (required if not passed as option)

### Complexity Levels

Images are automatically assigned complexity based on word count:

- **Simple** (< 500 words): 1×1, 1×2, or 2×1 grid
- **Medium** (500-1500 words): 2×2, 2×3, or 3×2 grid
- **Complex** (1500+ words): 3×3, 3×4, 4×3, 4×4, or 4×5 grid

You can override this with `imageComplexity` option.

### Theme Extraction

The tool automatically extracts themes from:
- Post title
- Post description
- Categories
- Tags

You can override with `imageTheme` option.

## Integration with Blog Service

### Example: Node.js/Express Blog Service

```javascript
const { generateBlogImage, getWordCount } = require("@chatiq/blog-image-generator");
const fs = require("fs");

async function createBlogPost(postData) {
  // 1. Create MDX file
  const mdxPath = `./content/blog/${postData.slug}.mdx`;
  fs.writeFileSync(mdxPath, postData.content);

  // 2. Calculate word count
  const wordCount = getWordCount(postData.content);

  // 3. Generate image
  const imageResult = await generateBlogImage({
    slug: postData.slug,
    title: postData.title,
    description: postData.description,
    categories: postData.categories,
    tags: postData.tags,
    wordCount: wordCount,
    openaiApiKey: process.env.OPENAI_API_KEY,
    outputDir: "./public/blog/images",
  });

  // 4. Update MDX metadata with image path
  const imagePath = `/blog/images/${imageResult.imagePath}`;
  // ... update metadata in MDX file

  return { post: postData, image: imageResult };
}
```

### Example: Next.js Blog Service

```typescript
// app/api/posts/create/route.ts
import { generateBlogImage, getWordCount } from "@chatiq/blog-image-generator";

export async function POST(req: Request) {
  const postData = await req.json();

  // Generate image
  const imageResult = await generateBlogImage({
    slug: postData.slug,
    title: postData.title,
    description: postData.description,
    categories: postData.categories,
    tags: postData.tags,
    wordCount: getWordCount(postData.content),
    openaiApiKey: process.env.OPENAI_API_KEY!,
    outputDir: path.join(process.cwd(), "public/blog/images"),
  });

  // Save post and return with image path
  return Response.json({
    ...postData,
    image: `/blog/images/${imageResult.imagePath}`,
  });
}
```

## API Reference

### `generateBlogImage(options, maxRetries?)`

Generates a blog post image.

**Parameters:**
- `options: ImageGenerationOptions` - Generation options
- `maxRetries?: number` - Maximum retry attempts (default: 3)

**Returns:** `Promise<ImageGenerationResult>`

**Options:**
```typescript
interface ImageGenerationOptions {
  slug: string;                    // Post slug (required)
  title: string;                   // Post title (required)
  description: string;              // Post description (required)
  categories: string[];             // Post categories
  tags: string[];                  // Post tags
  wordCount?: number;              // Word count (auto-calculated if not provided)
  imageTheme?: string;             // Manual theme override
  imageComplexity?: "simple" | "medium" | "complex"; // Manual complexity override
  openaiApiKey: string;            // OpenAI API key (required)
  outputDir: string;               // Output directory (required)
}
```

**Result:**
```typescript
interface ImageGenerationResult {
  imagePath: string;    // Relative path to generated image
  status: "complete" | "failed";
  error?: string;      // Error message if failed
}
```

### `getWordCount(content: string): number`

Calculates word count from blog post content (removes metadata, code blocks, etc.).

## Error Handling

The tool includes automatic retry logic (3 attempts by default) with exponential backoff. If all retries fail, it returns a placeholder image path.

## License

MIT

