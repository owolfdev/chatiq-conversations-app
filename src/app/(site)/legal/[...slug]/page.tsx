import { notFound } from "next/navigation";
import Link from "next/link";
import { Scale } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";

const links = [
  { href: "/legal/terms", label: "Terms of Service" },
  { href: "/legal/privacy", label: "Privacy Policy" },
  { href: "/legal/security", label: "Security" },
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}): Promise<Metadata> {
  const slugPath = (await params).slug.join("/");

  try {
    const doc = await import(`@/content/legal/${slugPath}.mdx`);
    const { metadata } = doc;

    return {
      title: `${metadata.title} | ChatIQ`,
      description: metadata.description,
      alternates: {
        canonical: `/legal/${slugPath}`,
      },
      openGraph: {
        title: `${metadata.title} | ChatIQ`,
        description: metadata.description,
        url: `/legal/${slugPath}`,
        siteName: "ChatIQ",
        type: "article",
      },
      twitter: {
        card: "summary_large_image",
        title: `${metadata.title} | ChatIQ`,
        description: metadata.description,
      },
    };
  } catch {
    return {
      title: "Legal | ChatIQ",
      description: "Legal information for ChatIQ",
    };
  }
}

export default async function LegalPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const slugPath = (await params).slug.join("/");

  try {
    const doc = await import(`@/content/legal/${slugPath}.mdx`);
    const { default: Content, metadata } = doc;

    return (
      <main className="flex flex-1 flex-col bg-background text-foreground">
        <div className="container mx-auto flex-1 px-4 py-16">
          <div className="max-w-5xl mx-auto space-y-10">
            <header className="space-y-2 text-center">
              <div className="inline-block p-3 rounded-full bg-secondary">
                <Scale className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-4xl font-bold">Legal Information</h1>
              <p className="text-muted-foreground">
                Learn how we protect your data, what you can expect from us, and
                the policies that govern your use of the platform.
              </p>
            </header>

            <nav className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-center sm:gap-4">
              {links.map((link) => {
                const isActive = `/legal/${slugPath}` === link.href;

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "rounded-md px-4 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            <div className="max-w-3xl w-full mx-auto space-y-12">
              <div className="space-y-6">
                <h2 className="text-4xl md:text-5xl font-bold">
                  {metadata.title}
                </h2>
                {metadata.description && (
                  <p className="text-lg text-muted-foreground">
                    {metadata.description}
                  </p>
                )}
              </div>

              <article className="prose prose-neutral max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground prose-a:text-primary">
                <Content />
              </article>
            </div>
          </div>
        </div>
      </main>
    );
  } catch {
    notFound();
  }
}
