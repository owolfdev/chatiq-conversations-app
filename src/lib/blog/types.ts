import type { ImageStatus, ImageComplexity } from "./generate-image";

export interface BlogPostMetadata {
  id: string;
  type: "blog";
  title: string;
  author: string;
  publishDate: string;
  description: string;
  categories: string[];
  tags: string[];
  modifiedDate: string;
  image: string | null;
  draft: boolean;
  relatedPosts: string[];
  slug: string;
  readingTime?: number;
  filePath?: string;
  // Image generation fields
  imageStatus?: ImageStatus;
  imageTheme?: string; // Manual theme override
  imageComplexity?: ImageComplexity; // Manual complexity override
}

export interface BlogCache {
  generatedAt: string;
  count: number;
  posts: BlogPostMetadata[];
}
