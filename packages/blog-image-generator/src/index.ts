/**
 * Blog post image generation using OpenAI DALL-E 3
 *
 * Standalone module for generating retro 8-bit pixel art feature images for blog posts
 */

import fs from "fs/promises";
import path from "path";

export type ImageComplexity = "simple" | "medium" | "complex";
export type ImageStatus = "pending" | "generating" | "complete" | "failed";

export interface ImageGenerationOptions {
  slug: string;
  title: string;
  description: string;
  categories: string[];
  tags: string[];
  wordCount?: number;
  imageTheme?: string; // Manual override
  imageComplexity?: ImageComplexity; // Manual override
  openaiApiKey: string; // Required - no env dependency
  outputDir: string; // Where to save images (e.g., "./public/blog/images")
}

export interface ImageGenerationResult {
  imagePath: string; // Relative path from outputDir
  status: ImageStatus;
  error?: string;
}

/**
 * Calculate grid size based on complexity
 */
function calculateGridSize(complexity: ImageComplexity): string {
  const gridSizes = {
    simple: ["1×1", "1×2", "2×1"],
    medium: ["2×2", "2×3", "3×2"],
    complex: ["3×3", "3×4", "4×3", "4×4", "4×5"],
  };

  const sizes = gridSizes[complexity];
  return sizes[Math.floor(Math.random() * sizes.length)];
}

/**
 * Determine complexity from word count or manual override
 */
function determineComplexity(
  wordCount: number,
  manualOverride?: ImageComplexity
): ImageComplexity {
  if (manualOverride) {
    return manualOverride;
  }

  if (wordCount < 500) return "simple";
  if (wordCount < 1500) return "medium";
  if (wordCount < 3000) return "complex";
  return "complex";
}

/**
 * Extract theme from title, description, categories, and tags
 */
function extractTheme(options: ImageGenerationOptions): string {
  // Manual override takes precedence
  if (options.imageTheme) {
    return options.imageTheme;
  }

  // Combine title, description, categories, and tags
  const text = [
    options.title,
    options.description,
    ...options.categories,
    ...options.tags,
  ]
    .join(" ")
    .toLowerCase();

  // Extract key terms (remove common words)
  const commonWords = new Set([
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "with",
    "by",
    "from",
    "as",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "will",
    "would",
    "should",
    "could",
    "may",
    "might",
    "must",
    "can",
    "this",
    "that",
    "these",
    "those",
    "how",
    "what",
    "when",
    "where",
    "why",
    "who",
    "which",
  ]);

  // Extract meaningful words (2+ characters, not common words)
  const words = text
    .split(/\s+/)
    .map((w) => w.replace(/[^\w]/g, ""))
    .filter((w) => w.length >= 2 && !commonWords.has(w));

  // Count word frequency
  const wordCounts = new Map<string, number>();
  words.forEach((word) => {
    wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
  });

  // Get top 3 most frequent words
  const topWords = Array.from(wordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([word]) => word);

  // Use first category as fallback if no good keywords found
  if (topWords.length === 0 && options.categories.length > 0) {
    return options.categories[0];
  }

  // Combine top words into theme
  return topWords.join(", ") || options.categories[0] || "technology";
}

/**
 * Build the DALL-E prompt for 8-bit pixel art
 */
function buildPrompt(options: ImageGenerationOptions): string {
  const theme = extractTheme(options);
  const complexity = determineComplexity(
    options.wordCount || 1000,
    options.imageComplexity
  );
  const gridSize = calculateGridSize(complexity);

  return `Create a retro 8-bit pixel-art illustration inspired by early 1980s computer graphics.

Generate a grid layout with ${gridSize} tiles.

Each tile should contain a single object related to the theme: "${theme}".

The objects should be drawn in chunky 8-bit pixel style with visible pixel edges, limited palettes, and simple shading.

Use retro computer background colors chosen at random from a range of bright RGB tones: electric blue, hot magenta, neon green, mustard yellow, cyan, tangerine orange, etc.

The overall style should feel like a vintage game inventory screen.

No faces or people — only theme-related objects.

Maintain slight CRT-era imperfections: minimal dithering, slight color banding, or tiny scanline hints if appropriate.

Keep the composition tidy, with the objects centered in each tile.`;
}

/**
 * Generate image using DALL-E 3
 */
async function generateImageWithDALLE(
  prompt: string,
  apiKey: string
): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1792x1024", // 16:9 aspect ratio (matches UI aspect-video)
      quality: "standard",
      response_format: "url",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DALL-E API error: ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as {
    data?: Array<{ url: string }>;
    error?: { message: string };
  };

  if (data.error) {
    throw new Error(`DALL-E API error: ${data.error.message}`);
  }

  const imageUrl = data.data?.[0]?.url;
  if (!imageUrl) {
    throw new Error("DALL-E API returned no image URL");
  }

  return imageUrl;
}

/**
 * Download image from URL and save to file
 */
async function downloadAndSaveImage(
  imageUrl: string,
  filePath: string
): Promise<void> {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  const imageData = Buffer.from(buffer);

  // Ensure directory exists
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });

  // Save image
  await fs.writeFile(filePath, imageData);
}

/**
 * Generate blog post image with retry logic
 */
export async function generateBlogImage(
  options: ImageGenerationOptions,
  maxRetries: number = 3
): Promise<ImageGenerationResult> {
  const imageFileName = `${options.slug}.jpg`;
  const imagePath = path.join(options.outputDir, imageFileName);

  // Check if image already exists
  try {
    await fs.access(imagePath);
    return {
      imagePath: imageFileName, // Return relative path
      status: "complete",
    };
  } catch {
    // Image doesn't exist, proceed with generation
  }

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Build prompt
      const prompt = buildPrompt(options);
      console.log(
        `[Image Generation] Attempt ${attempt}/${maxRetries} for ${options.slug}`
      );
      console.log(`[Image Generation] Prompt: ${prompt.substring(0, 100)}...`);

      // Generate image
      const imageUrl = await generateImageWithDALLE(
        prompt,
        options.openaiApiKey
      );

      // Download and save
      await downloadAndSaveImage(imageUrl, imagePath);

      console.log(
        `[Image Generation] ✅ Successfully generated image for ${options.slug}`
      );

      return {
        imagePath: imageFileName,
        status: "complete",
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(
        `[Image Generation] ❌ Attempt ${attempt}/${maxRetries} failed for ${options.slug}:`,
        lastError.message
      );

      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // All retries failed - return placeholder
  console.error(
    `[Image Generation] ❌ All attempts failed for ${options.slug}, using placeholder`
  );

  // Ensure placeholder exists
  const placeholderPath = path.join(options.outputDir, "placeholder.svg");
  try {
    await fs.access(placeholderPath);
  } catch {
    // Placeholder doesn't exist, create a simple one
    const placeholderSvg = `<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
      <rect width="1024" height="1024" fill="#0f3460"/>
      <text x="512" y="512" font-family="monospace" font-size="48" fill="#e94560" text-anchor="middle" dominant-baseline="middle">Image Loading...</text>
    </svg>`;
    await fs.writeFile(placeholderPath, placeholderSvg, "utf-8");
  }

  return {
    imagePath: "placeholder.svg",
    status: "failed",
    error: lastError?.message || "Image generation failed after retries",
  };
}

/**
 * Get word count from blog post content
 */
export function getWordCount(content: string): number {
  // Remove metadata, code blocks, and markdown syntax
  const text = content
    .replace(/export const metadata = \{[\s\S]*?\};/g, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]+`/g, "")
    .replace(/[#*\[\]()]/g, "")
    .replace(/\n+/g, " ");

  // Count words
  const words = text.split(/\s+/).filter((word) => word.length > 0);
  return words.length;
}
