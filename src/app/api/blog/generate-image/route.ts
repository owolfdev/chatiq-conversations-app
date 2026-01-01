import { NextRequest, NextResponse } from "next/server";
import {
  generateBlogImage,
  getWordCount,
  type ImageGenerationOptions,
} from "@/lib/blog/generate-image";
import fs from "fs/promises";
import path from "path";

/**
 * API route for generating blog post images
 * 
 * POST /api/blog/generate-image
 * Body: { slug, title, description, categories, tags, wordCount?, imageTheme?, imageComplexity? }
 * 
 * Returns image path immediately, generates image asynchronously
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ImageGenerationOptions;

    // Validate required fields
    if (!body.slug || !body.title || !body.description) {
      return NextResponse.json(
        { error: "Missing required fields: slug, title, description" },
        { status: 400 }
      );
    }

    // Read the MDX file to get word count if not provided
    let wordCount = body.wordCount;
    if (!wordCount) {
      try {
        const mdxPath = path.join(
          process.cwd(),
          "src/content/blog",
          `${body.slug}.mdx`
        );
        const content = await fs.readFile(mdxPath, "utf-8");
        wordCount = getWordCount(content);
      } catch (error) {
        console.warn(
          `Could not read MDX file for ${body.slug}, using default word count`
        );
        wordCount = 1000; // Default
      }
    }

    // Generate image (async, but we return immediately)
    const options: ImageGenerationOptions = {
      ...body,
      wordCount,
    };

    // Start generation in background (don't await)
    generateBlogImage(options).catch((error) => {
      console.error(`Failed to generate image for ${body.slug}:`, error);
    });

    // Return image path immediately (before generation completes)
    const imagePath = `/blog/images/${body.slug}.jpg`;

    return NextResponse.json({
      imagePath,
      status: "generating",
      message: "Image generation started",
    });
  } catch (error) {
    console.error("Error in generate-image API:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

