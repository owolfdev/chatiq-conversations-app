import BlogPageClient from "./blog-page-client";
import { getAllPosts, getAllCategories, getAllTags } from "@/lib/blog/get-posts";

export const dynamic = "force-static";

export const metadata = {
  title: "Blog",
  description: "Learn how to build AI chatbots, improve customer support, and scale your business with ChatIQ.",
  alternates: {
    canonical: "/blog",
  },
  openGraph: {
    title: "ChatIQ Blog",
    description:
      "Learn how to build AI chatbots, improve customer support, and scale your business with ChatIQ.",
    url: "/blog",
    siteName: "ChatIQ",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ChatIQ Blog",
    description:
      "Learn how to build AI chatbots, improve customer support, and scale your business with ChatIQ.",
  },
};

export default function BlogPage() {
  const posts = getAllPosts();
  const categories = getAllCategories();
  const tags = getAllTags();

  return <BlogPageClient posts={posts} categories={categories} tags={tags} />;
}
