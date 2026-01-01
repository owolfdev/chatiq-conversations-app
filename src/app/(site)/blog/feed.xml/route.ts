import { getAllPosts } from "@/lib/blog/get-posts";
import { getAppUrl } from "@/lib/email/get-app-url";

export async function GET() {
  const posts = getAllPosts();
  const baseUrl = getAppUrl();

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>ChatIQ Blog</title>
    <description>Learn how to build AI chatbots, improve customer support, and scale your business with ChatIQ.</description>
    <link>${baseUrl}/blog</link>
    <atom:link href="${baseUrl}/blog/feed.xml" rel="self" type="application/rss+xml"/>
    <language>en-US</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${posts
      .map(
        (post) => `    <item>
      <title><![CDATA[${post.title}]]></title>
      <description><![CDATA[${post.description}]]></description>
      <link>${baseUrl}/blog/${post.slug}</link>
      <guid isPermaLink="true">${baseUrl}/blog/${post.slug}</guid>
      <pubDate>${new Date(post.publishDate).toUTCString()}</pubDate>
      <author>${post.author}</author>
      ${post.categories.map((cat) => `<category><![CDATA[${cat}]]></category>`).join("\n      ")}
      ${post.tags.map((tag) => `<category><![CDATA[${tag}]]></category>`).join("\n      ")}
    </item>`
      )
      .join("\n")}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}

