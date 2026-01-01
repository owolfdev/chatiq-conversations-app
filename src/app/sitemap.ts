import type { MetadataRoute } from "next";
import path from "path";
import fs from "fs/promises";
import { getAllPosts } from "@/lib/blog/get-posts";
import { getAppUrl } from "@/lib/email/get-app-url";

type MdxEntry = {
  slug: string;
  lastModified: Date;
};

const docsRoot = path.join(process.cwd(), "src/content/docs");
const legalRoot = path.join(process.cwd(), "src/content/legal");

async function walkMdxFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkMdxFiles(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith(".mdx")) {
      files.push(fullPath);
    }
  }

  return files;
}

async function getDocsEntries(): Promise<MdxEntry[]> {
  const files = await walkMdxFiles(docsRoot);
  const relPaths = files.map((file) =>
    path.relative(docsRoot, file).replace(/\\/g, "/")
  );
  const relSet = new Set(relPaths);
  const entries: MdxEntry[] = [];

  for (const relPath of relPaths) {
    if (!relPath.endsWith(".mdx")) continue;

    if (relPath.endsWith("/index.mdx")) {
      const sibling = relPath.replace(/\/index\.mdx$/, ".mdx");
      if (relSet.has(sibling)) {
        continue;
      }
    }

    const importPath = relPath.replace(/\.mdx$/, "");
    let slug = importPath;
    if (slug.endsWith("/index")) {
      slug = slug.slice(0, -"/index".length);
    }
    if (slug === "index") continue;

    const filePath = path.join(docsRoot, relPath);
    const stat = await fs.stat(filePath);
    entries.push({ slug, lastModified: stat.mtime });
  }

  return entries;
}

async function getLegalEntries(): Promise<MdxEntry[]> {
  const files = await walkMdxFiles(legalRoot);
  const entries: MdxEntry[] = [];

  for (const filePath of files) {
    const relPath = path.relative(legalRoot, filePath).replace(/\\/g, "/");
    if (!relPath.endsWith(".mdx")) continue;

    let slug = relPath.replace(/\.mdx$/, "");
    if (slug.endsWith("/index")) {
      slug = slug.slice(0, -"/index".length);
    }
    if (slug === "index") continue;

    const stat = await fs.stat(filePath);
    entries.push({ slug, lastModified: stat.mtime });
  }

  return entries;
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

function buildUrl(baseUrl: string, pathname: string): string {
  const normalizedBase = normalizeBaseUrl(baseUrl);
  return `${normalizedBase}${
    pathname.startsWith("/") ? pathname : `/${pathname}`
  }`;
}

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? null : parsed;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getAppUrl();
  const now = new Date();

  const staticPages = [
    { path: "/", priority: 1 },
    { path: "/pricing", priority: 0.9 },
    { path: "/contact", priority: 0.8 },
    { path: "/product", priority: 0.7 },
    // { path: "/gallery", priority: 0.7 },
    { path: "/blog", priority: 0.8 },
    { path: "/docs", priority: 0.8 },
    { path: "/legal/terms", priority: 0.6 },
    { path: "/legal/privacy", priority: 0.6 },
    { path: "/legal/security", priority: 0.6 },
  ];

  const sitemapEntries: MetadataRoute.Sitemap = staticPages.map((page) => ({
    url: buildUrl(baseUrl, page.path),
    lastModified: now,
    priority: page.priority,
  }));

  const posts = getAllPosts();
  posts.forEach((post) => {
    const lastModified =
      parseDate(post.modifiedDate) ?? parseDate(post.publishDate) ?? now;
    sitemapEntries.push({
      url: buildUrl(baseUrl, `/blog/${post.slug}`),
      lastModified,
      priority: 0.7,
    });
  });

  const [docsEntries, legalEntries] = await Promise.all([
    getDocsEntries(),
    getLegalEntries(),
  ]);

  docsEntries.forEach((entry) => {
    sitemapEntries.push({
      url: buildUrl(baseUrl, `/docs/${entry.slug}`),
      lastModified: entry.lastModified,
      priority: 0.6,
    });
  });

  legalEntries.forEach((entry) => {
    sitemapEntries.push({
      url: buildUrl(baseUrl, `/legal/${entry.slug}`),
      lastModified: entry.lastModified,
      priority: 0.4,
    });
  });

  return sitemapEntries;
}
