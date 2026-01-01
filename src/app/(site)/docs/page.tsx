// src/app/docs/page.tsx
import path from "path";
import fs from "fs/promises";
import DocsPageClient from "./docs-page-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Docs",
  description:
    "Browse ChatIQ documentation, integrations, and quick-start guides.",
  alternates: {
    canonical: "/docs",
  },
  openGraph: {
    title: "ChatIQ Docs",
    description:
      "Browse ChatIQ documentation, integrations, and quick-start guides.",
    url: "/docs",
    siteName: "ChatIQ",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ChatIQ Docs",
    description:
      "Browse ChatIQ documentation, integrations, and quick-start guides.",
  },
};

type DocEntry = {
  title: string;
  slug: string;
  description?: string;
  category?: string;
  tags?: string[];
};

async function walkDocs(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkDocs(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith(".mdx")) {
      files.push(fullPath);
    }
  }

  return files;
}

async function getAllDocs(): Promise<DocEntry[]> {
  const docsRoot = path.join(process.cwd(), "src/content/docs");
  const files = await walkDocs(docsRoot);
  const relPaths = files.map((file) =>
    path.relative(docsRoot, file).replace(/\\/g, "/")
  );
  const relSet = new Set(relPaths);

  const entries: DocEntry[] = [];

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

    try {
      const doc = await import(`@/content/docs/${importPath}.mdx`);
      const metadata = doc.metadata ?? {};
      entries.push({
        title: metadata.title ?? slug,
        description: metadata.description ?? "",
        category: metadata.category,
        tags: Array.isArray(metadata.tags) ? metadata.tags : [],
        slug,
      });
    } catch {
      // Skip docs that fail to import.
    }
  }

  return entries.sort((a, b) => a.title.localeCompare(b.title));
}

export default async function DocsPage() {
  const allArticles = await getAllDocs();
  const popularArticleSeeds = [
    {
      slug: "quick-start",
      fallbackTitle: "Quick Start Guide",
      category: "Getting Started",
    },
    {
      slug: "pricing",
      fallbackTitle: "Pricing & Plans",
      category: "Getting Started",
    },
    {
      slug: "canned-and-cached-responses-guide",
      fallbackTitle: "Pre-configured and Cached Responses",
      category: "Getting Started",
    },
    {
      slug: "api-getting-started",
      fallbackTitle: "API Getting Started",
      category: "API Reference",
    },
    {
      slug: "api",
      fallbackTitle: "API Reference",
      category: "API Reference",
    },
    {
      slug: "api-streaming",
      fallbackTitle: "Streaming Guide",
      category: "API Reference",
    },
    {
      slug: "api-documents",
      fallbackTitle: "Documents API",
      category: "API Reference",
    },
    {
      slug: "integrations/nextjs",
      fallbackTitle: "Next.js Integration",
      category: "Integrations",
    },
    {
      slug: "integrations/website",
      fallbackTitle: "Website Integration",
      category: "Integrations",
    },
    {
      slug: "integrations/react",
      fallbackTitle: "React Integration",
      category: "Integrations",
    },
    {
      slug: "examples",
      fallbackTitle: "Examples & Templates",
      category: "Examples",
    },
    {
      slug: "examples/support-bot",
      fallbackTitle: "Support Bot Example",
      category: "Examples",
    },
    {
      slug: "examples/documentation-bot",
      fallbackTitle: "Documentation Bot Example",
      category: "Examples",
    },
  ];
  const articleBySlug = new Map(
    allArticles.map((article) => [article.slug, article])
  );
  const popularArticles = popularArticleSeeds.map((seed) => {
    const doc = articleBySlug.get(seed.slug);
    return {
      title: doc?.title ?? seed.fallbackTitle,
      description: doc?.description,
      slug: seed.slug,
      category: seed.category,
    };
  });

  return (
    <DocsPageClient
      popularArticles={popularArticles}
      allArticles={allArticles}
    />
  );
}
