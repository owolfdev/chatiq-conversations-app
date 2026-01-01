import { load } from "cheerio";

export interface UrlNode {
  url: string;
  title?: string;
  description?: string;
  children: UrlNode[];
}

export interface DiscoverOptions {
  baseUrl: string;
  maxDepth?: number;
  allowPathPrefix?: string;
  useSitemap?: boolean;
  delayMs?: number;
  timeoutMs?: number;
  maxPages?: number;
}

interface RobotsRules {
  disallow: string[];
}

const DEFAULT_DELAY_MS = 300;
const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_MAX_PAGES = 200;
const DEFAULT_MAX_DEPTH = 3;

const DISALLOWED_SCHEMES = new Set(["mailto:", "tel:", "javascript:"]);

function normalizeUrl(url: URL): string {
  url.hash = "";
  url.search = "";
  if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.slice(0, -1);
  }
  return url.toString();
}

function isHttpUrl(value: string): boolean {
  return value.startsWith("http://") || value.startsWith("https://");
}

function isBlockedHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (lower === "localhost" || lower.endsWith(".local")) {
    return true;
  }
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(lower)) {
    const [a, b] = lower.split(".").map((part) => Number(part));
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
  }
  return false;
}

function isAllowedByPrefix(pathname: string, prefix: string): boolean {
  if (prefix === "/") return true;
  if (pathname === prefix) return true;
  return pathname.startsWith(prefix.endsWith("/") ? prefix : `${prefix}/`);
}

function parseRobotsTxt(text: string): RobotsRules {
  const lines = text.split(/\r?\n/);
  let activeAgent: string | null = null;
  const disallow: string[] = [];

  for (const line of lines) {
    const trimmed = line.split("#")[0]?.trim();
    if (!trimmed) continue;
    const [rawKey, ...rest] = trimmed.split(":");
    const key = rawKey?.trim().toLowerCase();
    const value = rest.join(":").trim();

    if (key === "user-agent") {
      activeAgent = value.toLowerCase();
      continue;
    }

    if (key === "disallow" && (activeAgent === "*" || activeAgent === "chatgpt")) {
      if (value) {
        disallow.push(value.trim());
      }
    }
  }

  return { disallow };
}

function isPathBlocked(pathname: string, rules: RobotsRules): boolean {
  return rules.disallow.some((pattern) => {
    if (!pattern || pattern === "/") {
      return pattern === "/" ? true : false;
    }
    return pathname.startsWith(pattern);
  });
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ChatIQ/1.0; +https://chatiq.ai)",
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchRobotsRules(origin: string, timeoutMs: number): Promise<RobotsRules> {
  try {
    const response = await fetchWithTimeout(`${origin}/robots.txt`, timeoutMs);
    if (!response.ok) return { disallow: [] };
    const text = await response.text();
    return parseRobotsTxt(text);
  } catch {
    return { disallow: [] };
  }
}

async function fetchSitemapUrls(
  origin: string,
  timeoutMs: number
): Promise<string[]> {
  try {
    const response = await fetchWithTimeout(`${origin}/sitemap.xml`, timeoutMs);
    if (!response.ok) return [];
    const xml = await response.text();
    const $ = load(xml, { xmlMode: true });
    return $("loc")
      .map((_, el) => $(el).text().trim())
      .get()
      .filter((loc) => isHttpUrl(loc));
  } catch {
    return [];
  }
}

function extractPageMetadata(html: string): { title?: string; description?: string } {
  const $ = load(html);
  const title =
    $("h1").first().text().trim() ||
    $('meta[property="og:title"]').attr("content")?.trim() ||
    $("title").first().text().trim() ||
    undefined;
  const description =
    $('meta[name="description"]').attr("content")?.trim() ||
    $('meta[property="og:description"]').attr("content")?.trim() ||
    undefined;
  return { title, description };
}

function extractLinks(html: string, pageUrl: URL): string[] {
  const $ = load(html);
  const links: string[] = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href")?.trim();
    if (!href) return;
    if (href.startsWith("#")) return;
    if (DISALLOWED_SCHEMES.has(href.split("#")[0]?.toLowerCase() ?? "")) return;
    try {
      const resolved = new URL(href, pageUrl);
      links.push(resolved.toString());
    } catch {
      // ignore invalid urls
    }
  });
  return links;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function discoverUrls({
  baseUrl,
  maxDepth = DEFAULT_MAX_DEPTH,
  allowPathPrefix,
  useSitemap = true,
  delayMs = DEFAULT_DELAY_MS,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  maxPages = DEFAULT_MAX_PAGES,
}: DiscoverOptions): Promise<{ root: UrlNode; total: number; errors: string[] }> {
  const base = new URL(baseUrl);
  if (isBlockedHost(base.hostname)) {
    throw new Error("Base URL host is not allowed.");
  }

  const prefix = allowPathPrefix || base.pathname || "/";
  const origin = base.origin;
  const robots = await fetchRobotsRules(origin, timeoutMs);

  const queue: Array<{ url: string; depth: number; parent: string | null }> = [];
  const visited = new Set<string>();
  const errors: string[] = [];
  const nodes = new Map<string, UrlNode>();

  const normalizedBase = normalizeUrl(base);
  const rootNode: UrlNode = {
    url: normalizedBase,
    children: [],
  };
  nodes.set(normalizedBase, rootNode);
  queue.push({ url: normalizedBase, depth: 0, parent: null });
  visited.add(normalizedBase);

  if (useSitemap) {
    const sitemapUrls = await fetchSitemapUrls(origin, timeoutMs);
    for (const url of sitemapUrls) {
      try {
        const parsed = new URL(url);
        if (parsed.origin !== origin) continue;
        if (!isAllowedByPrefix(parsed.pathname, prefix)) continue;
        const normalized = normalizeUrl(parsed);
        if (visited.has(normalized)) continue;
        queue.push({ url: normalized, depth: 1, parent: normalizedBase });
        visited.add(normalized);
        nodes.set(normalized, { url: normalized, children: [] });
        rootNode.children.push(nodes.get(normalized)!);
      } catch {
        // ignore bad sitemap entries
      }
    }
  }

  while (queue.length > 0 && nodes.size <= maxPages) {
    const current = queue.shift();
    if (!current) break;
    if (current.depth > maxDepth) continue;

    const currentUrl = new URL(current.url);
    if (isPathBlocked(currentUrl.pathname, robots)) {
      continue;
    }

    let response: Response;
    try {
      response = await fetchWithTimeout(current.url, timeoutMs);
    } catch (error) {
      errors.push(
        `Failed to fetch ${current.url}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      continue;
    }

    if (!response.ok) {
      errors.push(`HTTP ${response.status} for ${current.url}`);
      continue;
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) {
      continue;
    }

    let html = "";
    try {
      html = await response.text();
    } catch (error) {
      errors.push(
        `Failed to read ${current.url}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      continue;
    }

    const metadata = extractPageMetadata(html);
    const node = nodes.get(current.url);
    if (node) {
      node.title = metadata.title ?? node.title;
      node.description = metadata.description ?? node.description;
    }

    if (current.depth === maxDepth) {
      await sleep(delayMs);
      continue;
    }

    const links = extractLinks(html, currentUrl);
    for (const link of links) {
      try {
        const parsed = new URL(link);
        if (parsed.origin !== origin) continue;
        if (!isAllowedByPrefix(parsed.pathname, prefix)) continue;
        if (isPathBlocked(parsed.pathname, robots)) continue;
        const normalized = normalizeUrl(parsed);
        if (visited.has(normalized)) continue;
        if (nodes.size >= maxPages) break;

        visited.add(normalized);
        const childNode: UrlNode = { url: normalized, children: [] };
        nodes.set(normalized, childNode);
        const parentNode = nodes.get(current.url) ?? rootNode;
        parentNode.children.push(childNode);
        queue.push({
          url: normalized,
          depth: current.depth + 1,
          parent: current.url,
        });
      } catch {
        // ignore invalid links
      }
    }

    await sleep(delayMs);
  }

  return { root: rootNode, total: nodes.size, errors };
}
