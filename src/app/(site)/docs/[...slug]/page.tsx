import { notFound } from "next/navigation";
import { Book } from "lucide-react";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}): Promise<Metadata> {
  const slugPath = (await params).slug.join("/");

  try {
    const doc = await import(`@/content/docs/${slugPath}.mdx`);
    const metadata = doc.metadata ?? {};
    return {
      title: metadata.title ?? "Docs",
      description: metadata.description,
      alternates: {
        canonical: `/docs/${slugPath}`,
      },
      openGraph: {
        title: metadata.title ?? "ChatIQ Docs",
        description: metadata.description,
        url: `/docs/${slugPath}`,
        siteName: "ChatIQ",
        type: "article",
      },
      twitter: {
        card: "summary_large_image",
        title: metadata.title ?? "ChatIQ Docs",
        description: metadata.description,
      },
    };
  } catch {
    return {
      title: "Docs",
    };
  }
}

export default async function DocsPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const slugPath = (await params).slug.join("/");

  try {
    const doc = await import(`@/content/docs/${slugPath}.mdx`);
    const { default: Content, metadata } = doc;

    return (
      <main className="flex flex-1 flex-col bg-background text-foreground">
        <div className="container mx-auto flex-1 px-4 py-16">
          <div className="max-w-4xl mx-auto space-y-12">
            <header className="text-center space-y-6">
              <div className="inline-block p-3 rounded-full bg-secondary">
                <Book className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-3">
                <h1 className="text-4xl md:text-5xl font-bold">
                  {metadata.title}
                </h1>
                {metadata.description && (
                  <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    {metadata.description}
                  </p>
                )}
              </div>
            </header>

            <article className="prose prose-neutral max-w-none dark:prose-invert">
              <Content />
            </article>
          </div>
        </div>
      </main>
    );
  } catch {
    notFound();
  }
}
