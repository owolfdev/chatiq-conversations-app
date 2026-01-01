# Blog Post Metadata Examples

## Complete Example (All Fields)

```mdx
export const metadata = {
  id: "blog-001",
  type: "blog",
  title: "Build your team's AI support bot in 10 minutes",
  author: "ChatIQ Team",
  publishDate: "2025-12-02",
  description: "Learn how to create a custom AI support bot powered by your own knowledge base in just 10 minutes. No coding required.",
  categories: [
    "tutorial",
    "getting-started",
    "support"
  ],
  tags: [
    "ai",
    "chatbot",
    "support",
    "tutorial",
    "quick-start"
  ],
  modifiedDate: "2025-12-02T00:00:00.000Z",
  image: "/blog/images/build-your-ai-support-bot-in-10-minutes.jpg",
  draft: false,
  relatedPosts: [],
  slug: "build-your-ai-support-bot-in-10-minutes",
  imageTheme: "AI chatbots and automation",
  imageComplexity: "medium"
};

# Build your team's AI support bot in 10 minutes

Your content here...
```

## Minimal Example (Required Fields Only)

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
  slug: "my-first-post"
};

# My First Post

Post content here...
```

## Draft Post Example

```mdx
export const metadata = {
  id: "blog-003",
  type: "blog",
  title: "Work in Progress",
  author: "Jane Smith",
  publishDate: "2025-12-04",
  description: "This is a draft post",
  categories: ["draft"],
  tags: [],
  modifiedDate: "2025-12-04T10:30:00.000Z",
  image: null,
  draft: true,
  relatedPosts: [],
  slug: "work-in-progress"
};

# Work in Progress

Draft content...
```

## Post with Related Posts

```mdx
export const metadata = {
  id: "blog-004",
  type: "blog",
  title: "Advanced AI Techniques",
  author: "Dr. AI Expert",
  publishDate: "2025-12-05",
  description: "Learn advanced AI techniques for chatbots",
  categories: ["advanced", "tutorial"],
  tags: ["ai", "machine-learning", "advanced"],
  modifiedDate: "2025-12-05T14:20:00.000Z",
  image: "/blog/images/advanced-ai-techniques.jpg",
  draft: false,
  relatedPosts: [
    "build-your-ai-support-bot-in-10-minutes",
    "getting-started-with-ai"
  ],
  slug: "advanced-ai-techniques"
};

# Advanced AI Techniques

Content here...
```

## Post with Image Generation Overrides

```mdx
export const metadata = {
  id: "blog-005",
  type: "blog",
  title: "Custom Image Theme Example",
  author: "Design Team",
  publishDate: "2025-12-06",
  description: "This post uses custom image generation settings",
  categories: ["design", "tutorial"],
  tags: ["design", "images"],
  modifiedDate: "2025-12-06T09:15:00.000Z",
  image: null,
  draft: false,
  relatedPosts: [],
  slug: "custom-image-theme-example",
  imageTheme: "Design tools and creative software",
  imageComplexity: "complex"
};

# Custom Image Theme Example

Content here...
```

## Common Patterns

### Multiple Categories

```javascript
categories: [
  "tutorial",
  "getting-started",
  "api",
  "integration"
]
```

### Multiple Tags

```javascript
tags: [
  "ai",
  "chatbot",
  "tutorial",
  "quick-start",
  "api",
  "integration"
]
```

### ISO Date Formats

```javascript
// Date only (recommended for publishDate)
publishDate: "2025-12-02"

// Full datetime (required for modifiedDate)
modifiedDate: "2025-12-02T14:30:00.000Z"
```

### Image Paths

```javascript
// With image
image: "/blog/images/my-post.jpg"

// Without image
image: null
```

## Validation Checklist

When creating metadata, ensure:

- [ ] `id` is unique
- [ ] `type` is exactly `"blog"`
- [ ] `slug` matches filename (without `.mdx`)
- [ ] `publishDate` is valid ISO date
- [ ] `modifiedDate` is valid ISO datetime
- [ ] `categories` is an array (can be empty)
- [ ] `tags` is an array (can be empty)
- [ ] `relatedPosts` is an array (can be empty)
- [ ] `image` is either a valid path starting with `/blog/images/` or `null`
- [ ] `draft` is a boolean
- [ ] All required fields are present
- [ ] No trailing commas in arrays/objects

