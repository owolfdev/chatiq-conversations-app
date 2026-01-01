"use server";

import { load } from "cheerio";

const MAX_CONTENT_SIZE = 500000; // 500KB max HTML size
const FETCH_TIMEOUT = 30000; // 30 seconds
const MAX_TEXT_LENGTH = 20000; // Match MAX_CHARACTERS in document form

export interface ImportFromUrlResult {
  success: boolean;
  title?: string;
  content?: string;
  error?: string;
}

/**
 * Fetches a URL and extracts clean text content from HTML
 */
export async function importFromUrl(url: string): Promise<ImportFromUrlResult> {
  // Validate URL format
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
    // Only allow http/https
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return {
        success: false,
        error: "Only HTTP and HTTPS URLs are supported",
      };
    }
  } catch {
    return {
      success: false,
      error: "Invalid URL format. Please include the protocol (http:// or https://)",
    };
  }

  // Fetch the URL with timeout
  let response: Response;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ChatIQ/1.0; +https://chatiq.ai)",
      },
    });

    clearTimeout(timeoutId);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return {
        success: false,
        error: "Request timed out. The URL took too long to respond.",
      };
    }
    return {
      success: false,
      error: `Failed to fetch URL: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }

  // Check response status
  if (!response.ok) {
    return {
      success: false,
      error: `HTTP ${response.status}: ${response.statusText}`,
    };
  }

  // Check content type
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) {
    return {
      success: false,
      error: "URL does not return HTML content",
    };
  }

  // Read response with size limit
  const contentLength = response.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_CONTENT_SIZE) {
    return {
      success: false,
      error: `Content too large (max ${MAX_CONTENT_SIZE / 1000}KB)`,
    };
  }

  let html: string;
  try {
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_CONTENT_SIZE) {
      return {
        success: false,
        error: `Content too large (max ${MAX_CONTENT_SIZE / 1000}KB)`,
      };
    }
    html = new TextDecoder("utf-8").decode(buffer);
  } catch (error) {
    return {
      success: false,
      error: `Failed to read response: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }

  // Parse HTML and extract content
  try {
    const $ = load(html);

    // Remove unwanted elements
    $("script, style, nav, header, footer, aside, .sidebar, .navigation, .menu, .ad, .ads, .advertisement").remove();

    // Extract title
    let title =
      $("h1").first().text().trim() ||
      $('meta[property="og:title"]').attr("content")?.trim() ||
      $("title").first().text().trim() ||
      parsedUrl.pathname.split("/").pop() ||
      "Imported Document";

    // Extract main content
    // Try to find main content area first
    let content = "";
    const mainSelectors = [
      "main",
      "article",
      '[role="main"]',
      ".content",
      ".main-content",
      "#content",
      "#main",
    ];

    for (const selector of mainSelectors) {
      const mainContent = $(selector).first();
      if (mainContent.length > 0) {
        content = mainContent.text();
        break;
      }
    }

    // Fallback to body if no main content found
    if (!content) {
      content = $("body").text();
    }

    // Clean up whitespace
    content = content
      .replace(/\s+/g, " ") // Replace multiple whitespace with single space
      .replace(/\n\s*\n/g, "\n\n") // Normalize line breaks
      .trim();

    // Truncate if too long
    if (content.length > MAX_TEXT_LENGTH) {
      content = content.slice(0, MAX_TEXT_LENGTH);
      content = content.slice(0, content.lastIndexOf(" ")) + "...";
    }

    if (content.length === 0) {
      return {
        success: false,
        error: "No text content found on this page",
      };
    }

    // Truncate title if too long
    if (title.length > 200) {
      title = title.slice(0, 197) + "...";
    }

    return {
      success: true,
      title,
      content,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse HTML: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}
