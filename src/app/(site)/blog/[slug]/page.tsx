import { notFound } from "next/navigation";
import { format } from "date-fns";
import { Calendar, Clock, Tag, Folder, ArrowLeft } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { getPostBySlug, getAllPosts } from "@/lib/blog/get-posts";
import type { BlogPostMetadata } from "@/lib/blog/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-static";

const siteUrl = "https://www.chatiq.io";

const toAbsoluteUrl = (url: string) => {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  return `${siteUrl}${url.startsWith("/") ? "" : "/"}${url}`;
};

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    return {
      title: "Post Not Found",
    };
  }

  return {
    title: post.title,
    description: post.description,
    alternates: {
      canonical: `/blog/${post.slug}`,
    },
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      url: `/blog/${post.slug}`,
      siteName: "ChatIQ",
      publishedTime: post.publishDate,
      modifiedTime: post.modifiedDate,
      authors: [post.author],
      images: post.image ? [post.image] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: post.image ? [post.image] : [],
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  // Dynamically import the MDX content
  let Content;
  try {
    const module = await import(`@/content/blog/${slug}.mdx`);
    Content = module.default;
  } catch (error) {
    console.error(`Error loading blog post ${slug}:`, error);
    notFound();
  }

  // Get related posts
  const allPosts = getAllPosts();
  const relatedPosts = post.relatedPosts
    .map((relatedSlug) => allPosts.find((p) => p.slug === relatedSlug))
    .filter((p): p is BlogPostMetadata => p !== undefined);
  const blogUrl = `${siteUrl}/blog/${post.slug}`;
  const blogPostingStructuredData = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    image: post.image ? [toAbsoluteUrl(post.image)] : undefined,
    datePublished: post.publishDate,
    dateModified: post.modifiedDate || post.publishDate,
    author: {
      "@type": "Person",
      name: post.author,
    },
    publisher: {
      "@type": "Organization",
      name: "ChatIQ",
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/icon-512.png`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": blogUrl,
    },
    url: blogUrl,
    keywords: post.tags.length ? post.tags.join(", ") : undefined,
  };

  return (
    <main className="flex min-h-screen flex-1 flex-col bg-background text-foreground blog-solid-bg">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(blogPostingStructuredData),
        }}
      />
      <div className="container mx-auto flex-1 px-4 py-16">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Back Button */}
          <Link href="/blog" className="">
            <Button variant="ghost" size="sm" className="gap-2 mb-4">
              <ArrowLeft className="h-4 w-4" />
              Back to Blog
            </Button>
          </Link>

          {/* Header */}
          <header className="space-y-6">
            <div className="flex flex-wrap gap-2">
              {post.categories.map((category) => (
                <Badge key={category} variant="secondary">
                  <Folder className="h-3 w-3 mr-1" />
                  {category}
                </Badge>
              ))}
            </div>

            <h1 className="text-4xl md:text-5xl font-bold">{post.title}</h1>

            {post.description && (
              <p className="text-xl text-muted-foreground">
                {post.description}
              </p>
            )}

            {/* Featured Image */}
            {post.image && (
              <div className="aspect-video w-full bg-muted rounded-lg overflow-hidden relative">
                <Image
                  src={post.image}
                  alt={post.title}
                  fill
                  sizes="(max-width: 1024px) 100vw, 800px"
                  className="object-cover"
                />
              </div>
            )}

            {/* Meta Information */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground border-b pb-6">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {format(new Date(post.publishDate), "MMMM d, yyyy")}
              </div>
              {post.readingTime && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {post.readingTime} min read
                </div>
              )}
              <div>By {post.author}</div>
            </div>

            {/* Tags */}
            {post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="gap-1">
                    <Tag className="h-3 w-3" />
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </header>

          {/* Content */}
          <article className="prose prose-neutral max-w-none dark:prose-invert">
            <Content />
          </article>

          {/* Related Posts */}
          {relatedPosts.length > 0 && (
            <div className="border-t pt-8 space-y-4">
              <h2 className="text-2xl font-bold">Related Posts</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {relatedPosts.map((relatedPost) => (
                  <Link
                    key={relatedPost.slug}
                    href={`/blog/${relatedPost.slug}`}
                    className="block p-4 border rounded-lg hover:shadow-md transition-shadow"
                  >
                    <h3 className="font-semibold mb-2">{relatedPost.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {relatedPost.description}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
