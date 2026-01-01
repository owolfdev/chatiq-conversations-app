#!/usr/bin/env node

/**
 * CLI tool for generating blog post images
 *
 * Usage:
 *   blog-image-generator --slug "my-post" --title "My Post" --description "Description" --categories "tutorial" --tags "ai,chatbot" --output-dir "./public/blog/images"
 *
 * Or with JSON input:
 *   blog-image-generator --json '{"slug":"my-post","title":"My Post",...}'
 */

const { generateBlogImage, getWordCount } = require("../dist/index.js");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};

  // Check for JSON input
  const jsonIndex = args.indexOf("--json");
  if (jsonIndex !== -1 && args[jsonIndex + 1]) {
    try {
      const jsonData = JSON.parse(args[jsonIndex + 1]);
      return jsonData;
    } catch (error) {
      console.error("❌ Invalid JSON input:", error.message);
      process.exit(1);
    }
  }

  // Parse individual arguments
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]?.replace(/^--/, "");
    const value = args[i + 1];

    if (key && value) {
      // Handle arrays (comma-separated)
      if (key === "categories" || key === "tags") {
        options[key] = value.split(",").map((s) => s.trim());
      } else {
        options[key] = value;
      }
    }
  }

  return options;
}

async function main() {
  const options = parseArgs();

  // Validate required fields
  if (!options.slug || !options.title || !options.description) {
    console.error("❌ Missing required fields: slug, title, description");
    console.error("\nUsage:");
    console.error(
      "  blog-image-generator --slug <slug> --title <title> --description <description> [options]"
    );
    console.error("\nOptions:");
    console.error("  --slug <slug>              Post slug (required)");
    console.error("  --title <title>            Post title (required)");
    console.error("  --description <desc>        Post description (required)");
    console.error("  --categories <cat1,cat2>   Comma-separated categories");
    console.error("  --tags <tag1,tag2>         Comma-separated tags");
    console.error(
      "  --word-count <number>      Word count (auto-calculated if not provided)"
    );
    console.error("  --image-theme <theme>      Manual theme override");
    console.error(
      "  --image-complexity <level>  Manual complexity: simple|medium|complex"
    );
    console.error(
      "  --output-dir <path>         Output directory (default: ./public/blog/images)"
    );
    console.error(
      "  --openai-api-key <key>      OpenAI API key (or set OPENAI_API_KEY env var)"
    );
    console.error(
      "  --json <json>              JSON input (alternative to individual args)"
    );
    process.exit(1);
  }

  // Get OpenAI API key
  const apiKey = options["openai-api-key"] || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error(
      "❌ OpenAI API key required. Set OPENAI_API_KEY env var or use --openai-api-key"
    );
    process.exit(1);
  }

  // Set output directory
  const outputDir = options["output-dir"] || "./public/blog/images";
  const absoluteOutputDir = path.resolve(process.cwd(), outputDir);

  // Calculate word count if content file provided
  let wordCount = options["word-count"]
    ? parseInt(options["word-count"], 10)
    : undefined;

  if (!wordCount && options["content-file"]) {
    try {
      const content = fs.readFileSync(options["content-file"], "utf-8");
      wordCount = getWordCount(content);
      console.log(`📊 Calculated word count: ${wordCount}`);
    } catch (error) {
      console.warn(`⚠️  Could not read content file: ${error.message}`);
    }
  }

  // Prepare generation options
  const generationOptions = {
    slug: options.slug,
    title: options.title,
    description: options.description,
    categories: options.categories || [],
    tags: options.tags || [],
    wordCount: wordCount,
    imageTheme: options["image-theme"],
    imageComplexity: options["image-complexity"],
    openaiApiKey: apiKey,
    outputDir: absoluteOutputDir,
  };

  console.log(`🖼️  Generating image for: ${options.slug}`);
  console.log(`📁 Output directory: ${absoluteOutputDir}\n`);

  try {
    const result = await generateBlogImage(generationOptions);

    if (result.status === "complete") {
      console.log(`\n✅ Image generated successfully!`);
      console.log(
        `   📄 Path: ${path.join(absoluteOutputDir, result.imagePath)}`
      );
      process.exit(0);
    } else {
      console.error(
        `\n❌ Image generation failed: ${result.error || "Unknown error"}`
      );
      console.log(
        `   📄 Using placeholder: ${path.join(
          absoluteOutputDir,
          result.imagePath
        )}`
      );
      process.exit(1);
    }
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  });
}

module.exports = { main };
