# Quick Start Guide

## Installation

```bash
cd packages/blog-image-generator
npm install
npm run build
```

## Basic Usage

### CLI

```bash
# Set your OpenAI API key
export OPENAI_API_KEY="sk-..."

# Generate an image
node bin/cli.js \
  --slug "my-post" \
  --title "My Blog Post" \
  --description "A great blog post about AI" \
  --categories "tutorial" \
  --tags "ai,chatbot" \
  --output-dir "./public/blog/images"
```

### Programmatic

```typescript
import { generateBlogImage } from "./dist/index.js";

const result = await generateBlogImage({
  slug: "my-post",
  title: "My Blog Post",
  description: "A great blog post about AI",
  categories: ["tutorial"],
  tags: ["ai", "chatbot"],
  openaiApiKey: process.env.OPENAI_API_KEY!,
  outputDir: "./public/blog/images",
});

console.log(`Image saved: ${result.imagePath}`);
```

## Integration with Blog Service

When creating a blog post in your service:

1. Create the MDX file
2. Generate the image using this package
3. Update MDX metadata with image path
4. Save everything

See `README.md` for full documentation.

