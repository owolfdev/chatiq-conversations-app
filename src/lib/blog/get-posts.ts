import type { BlogCache, BlogPostMetadata } from "./types";
import postsCache from "./posts-cache.json";

/**
 * Get all blog posts from cache
 */
export function getAllPosts(): BlogPostMetadata[] {
  const cache = postsCache as BlogCache;
  return cache.posts
    .filter((post) => !post.draft)
    .sort(
      (a, b) =>
        new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
    );
}

/**
 * Get a single blog post by slug
 */
export function getPostBySlug(slug: string): BlogPostMetadata | undefined {
  const posts = getAllPosts();
  return posts.find((post) => post.slug === slug);
}

/**
 * Get posts by category
 */
export function getPostsByCategory(category: string): BlogPostMetadata[] {
  const posts = getAllPosts();
  return posts.filter((post) =>
    post.categories.some((cat) => cat.toLowerCase() === category.toLowerCase())
  );
}

/**
 * Get posts by tag
 */
export function getPostsByTag(tag: string): BlogPostMetadata[] {
  const posts = getAllPosts();
  return posts.filter((post) =>
    post.tags.some((t) => t.toLowerCase() === tag.toLowerCase())
  );
}

/**
 * Get all unique categories
 */
export function getAllCategories(): string[] {
  const posts = getAllPosts();
  const categories = new Set<string>();
  posts.forEach((post) => {
    post.categories.forEach((cat) => categories.add(cat));
  });
  return Array.from(categories).sort();
}

/**
 * Get all unique tags
 */
export function getAllTags(): string[] {
  const posts = getAllPosts();
  const tags = new Set<string>();
  posts.forEach((post) => {
    post.tags.forEach((tag) => tags.add(tag));
  });
  return Array.from(tags).sort();
}

/**
 * Search posts by query (searches title, description, and content tags)
 */
export function searchPosts(query: string): BlogPostMetadata[] {
  const posts = getAllPosts();
  const lowerQuery = query.toLowerCase();
  
  return posts.filter((post) => {
    const searchableText = [
      post.title,
      post.description,
      ...post.tags,
      ...post.categories,
    ]
      .join(" ")
      .toLowerCase();
    
    return searchableText.includes(lowerQuery);
  });
}
