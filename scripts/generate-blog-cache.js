#!/usr/bin/env node

/**
 * Generate blog posts cache from MDX files
 *
 * This script scans src/content/blog/*.mdx files, extracts metadata,
 * and generates src/lib/blog/posts-cache.json for fast blog listing/search.
 *
 * Run: node scripts/generate-blog-cache.js
 * Or: npm run generate-blog-cache
 */

const fs = require("fs");
const path = require("path");

const BLOG_DIR = path.join(process.cwd(), "src/content/blog");
const CACHE_DIR = path.join(process.cwd(), "src/lib/blog");
const CACHE_FILE = path.join(CACHE_DIR, "posts-cache.json");

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

function extractMetadataFromMDX(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");

  // Extract metadata export block
  const metadataMatch = content.match(
    /export const metadata = \{([\s\S]*?)\};/
  );
  if (!metadataMatch) {
    console.warn(`⚠️  No metadata found in ${filePath}`);
    return null;
  }

  try {
    // Use Function constructor for safer evaluation
    // This is safer than eval because it doesn't have access to local scope
    const metadataCode = `return {${metadataMatch[1]}};`;
    const metadataFn = new Function(metadataCode);
    const metadata = metadataFn();

    // Derive slug from filename if not provided
    const filename = path.basename(filePath, ".mdx");
    if (!metadata.slug) {
      metadata.slug = filename;
    }

    // Add file path for reference
    metadata.filePath = path.relative(process.cwd(), filePath);

    return metadata;
  } catch (error) {
    console.error(`❌ Error parsing metadata in ${filePath}:`, error.message);
    console.error(`   Try checking the metadata format in the MDX file.`);
    return null;
  }
}

function calculateReadingTime(content) {
  // Remove code blocks and metadata
  const textContent = content
    .replace(/export const metadata = \{[\s\S]*?\};/g, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]+`/g, "");

  // Average reading speed: 200 words per minute
  const words = textContent
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
  const minutes = Math.ceil(words / 200);

  return minutes;
}

function getWordCount(content) {
  // Remove code blocks and metadata
  const textContent = content
    .replace(/export const metadata = \{[\s\S]*?\};/g, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]+`/g, "");

  const words = textContent.split(/\s+/).filter((word) => word.length > 0);
  return words.length;
}

function checkImageExists(imagePath) {
  if (!imagePath) return false;
  const publicPath = path.join(process.cwd(), "public", imagePath);
  try {
    fs.accessSync(publicPath);
    return true;
  } catch {
    return false;
  }
}

function triggerImageGeneration(metadata, content) {
  // If image is explicitly set in metadata, use it (and check if it exists)
  if (metadata.image !== null && metadata.image !== undefined) {
    const imageExists = checkImageExists(metadata.image);
    return {
      imagePath: metadata.image,
      status: imageExists ? "complete" : "pending",
    };
  }

  // If image is explicitly set to null, don't generate
  if (metadata.image === null) {
    return { imagePath: null, status: "pending" };
  }

  // Default: use slug-based image path
  const imagePath = `/blog/images/${metadata.slug}.jpg`;
  const imageExists = checkImageExists(imagePath);

  // If image already exists, use it
  if (imageExists) {
    return { imagePath, status: "complete" };
  }

  // Check if we should generate (only for non-draft posts)
  if (metadata.draft) {
    return { imagePath: null, status: "pending" };
  }

  // Set image path immediately (blog can publish)
  // Image will be generated asynchronously via API
  console.log(
    `🖼️  Image path set for: ${metadata.slug} (generation will happen async)`
  );

  return {
    imagePath,
    status: "pending", // Will be updated when generation completes
  };
}

function generateCache() {
  console.log("📝 Generating blog posts cache...\n");

  if (!fs.existsSync(BLOG_DIR)) {
    console.log(`⚠️  Blog directory not found: ${BLOG_DIR}`);
    console.log("   Creating directory...");
    fs.mkdirSync(BLOG_DIR, { recursive: true });
    fs.writeFileSync(
      CACHE_FILE,
      JSON.stringify(
        { generatedAt: new Date().toISOString(), count: 0, posts: [] },
        null,
        2
      )
    );
    console.log("✅ Cache file created (empty)");
    return;
  }

  const files = fs
    .readdirSync(BLOG_DIR)
    .filter((file) => file.endsWith(".mdx"));

  if (files.length === 0) {
    console.log("⚠️  No MDX files found in blog directory");
    fs.writeFileSync(
      CACHE_FILE,
      JSON.stringify(
        { generatedAt: new Date().toISOString(), count: 0, posts: [] },
        null,
        2
      )
    );
    console.log("✅ Cache file created (empty)");
    return;
  }

  const posts = [];

  for (const file of files) {
    const filePath = path.join(BLOG_DIR, file);
    const metadata = extractMetadataFromMDX(filePath);

    if (!metadata) {
      continue;
    }

    // Skip draft posts
    if (metadata.draft === true) {
      console.log(`⏭️  Skipping draft: ${file}`);
      continue;
    }

    // Calculate reading time and check image
    const content = fs.readFileSync(filePath, "utf-8");
    metadata.readingTime = calculateReadingTime(content);

    // Handle image generation
    const imageResult = triggerImageGeneration(metadata, content);
    metadata.image = imageResult.imagePath;
    metadata.imageStatus = imageResult.status;

    posts.push(metadata);
    console.log(`✅ Processed: ${metadata.title}`);
  }

  // Sort by publish date (newest first)
  posts.sort((a, b) => {
    const dateA = new Date(a.publishDate);
    const dateB = new Date(b.publishDate);
    return dateB - dateA;
  });

  // Write cache file
  const cacheData = {
    generatedAt: new Date().toISOString(),
    count: posts.length,
    posts: posts,
  };

  fs.writeFileSync(CACHE_FILE, JSON.stringify(cacheData, null, 2));

  console.log(`\n✨ Cache generated successfully!`);
  console.log(`   📄 ${posts.length} posts processed`);
  console.log(`   💾 Cache saved to: ${CACHE_FILE}`);
}

// Run if called directly
if (require.main === module) {
  generateCache();
}

module.exports = { generateCache };
