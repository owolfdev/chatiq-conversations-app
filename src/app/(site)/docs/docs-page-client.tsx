"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import Chat from "@/components/chat/chat";
import { DEFAULT_BOT_SLUG } from "@/lib/config";

import * as Icons from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Type Definitions

type Article = {
  title: string;
  slug: string;
  description?: string;
  time?: string;
  category?: string;
  tags?: string[];
};

type Props = {
  popularArticles: Article[];
  allArticles: Article[];
};

const featureSections: Array<{
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
}> = [
  {
    title: "Quick Start",
    description: "Get set up in minutes with a guided checklist.",
    icon: Icons.Sparkles,
    href: "/docs/quick-start",
  },
  {
    title: "Pricing & Plans",
    description: "Compare plans, understand limits, and choose the right tier.",
    icon: Icons.CreditCard,
    href: "/docs/pricing",
  },
  {
    title: "API Reference",
    description: "Authenticate, send messages, and manage bots.",
    icon: Icons.Command,
    href: "/docs/api",
  },
  {
    title: "Integrations",
    description: "Connect ChatIQ to your site, CRM, or knowledge base.",
    icon: Icons.Link,
    href: "/docs/integrations",
  },
  {
    title: "Examples",
    description: "Explore templates and vertical-specific playbooks.",
    icon: Icons.Notebook,
    href: "/docs/examples",
  },
];

const supportSections: Array<{
  title: string;
  description: string;
  action: string;
  href: string;
  icon: LucideIcon;
}> = [
  {
    title: "Need more help?",
    description:
      "Browse troubleshooting guides, billing FAQs, and security policies.",
    action: "Visit help center",
    href: "/docs/help",
    icon: Icons.HelpCircle,
  },
  // {
  //   title: "Join the community",
  //   description:
  //     "Swap tips with other builders, share bots, and stay ahead of releases.",
  //   action: "Open community",
  //   href: "/community",
  //   icon: Icons.Users,
  // },
  {
    title: "Talk to support",
    description:
      "Can’t find an answer? Start a ticket and we’ll get back within 24 hours.",
    action: "Contact support",
    href: "/contact",
    icon: Icons.LifeBuoy,
  },
];

export default function DocsPageClient({
  popularArticles,
  allArticles,
}: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAiSearch, setShowAiSearch] = useState(false);
  const BookIcon = Icons.Book;
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);
  const filteredArticles =
    normalizedQuery === ""
      ? []
      : allArticles.filter((article) => {
          const title = article.title.toLowerCase();
          const description = article.description?.toLowerCase() ?? "";
          const tags = article.tags?.join(" ").toLowerCase() ?? "";
          const haystack = `${title} ${description} ${tags}`;
          return queryTokens.every((token) => haystack.includes(token));
        });

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <main className="grow container mx-auto px-4 py-16 space-y-12">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-6">
            <div className="inline-block p-3 rounded-full bg-secondary">
              <BookIcon className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold">Documentation</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need to build, deploy, and scale your chatbots with
              ChatIQ
            </p>
          </div>

          <div className="max-w-2xl mx-auto">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">Ask ChatIQ</p>
                <p className="text-xs text-muted-foreground">
                  Ask a question and get answers grounded in the docs.
                </p>
              </div>
              <Button
                variant={showAiSearch ? "secondary" : "outline"}
                onClick={() => setShowAiSearch((prev) => !prev)}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {showAiSearch ? "Hide AI search" : "Ask AI"}
              </Button>
            </div>
            {showAiSearch && (
              <div className="mt-6">
                <Chat botSlug={DEFAULT_BOT_SLUG} hidePrivacyToggle compact />
              </div>
            )}
            <div className="relative mt-6">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground/60" />
              <Input
                placeholder="Search documentation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 text-lg"
              />
            </div>
          </div>

          {normalizedQuery === "" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {featureSections.map(
                ({ title, description, icon: IconComponent, href }) => (
                  <Card
                    key={title}
                    className="bg-muted border-border hover:border-primary/40 transition-colors"
                  >
                    <CardHeader className="space-y-4">
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <IconComponent className="h-5 w-5 text-primary" />
                      </div>
                      <CardTitle>{title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <CardDescription>{description}</CardDescription>
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        asChild
                      >
                        <Link href={href}>
                          Learn more
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                )
              )}
            </div>
          )}

          {normalizedQuery === "" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Popular Articles</h2>
                <Button variant="ghost" asChild>
                  <Link href="/docs">
                    View all
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {popularArticles.map((article, index) => (
                  <Card
                    key={index}
                    className="bg-muted border-border hover:border-primary/40 transition-colors"
                  >
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg font-semibold">
                        {article.title}
                      </CardTitle>
                      {article.description ? (
                        <CardDescription>{article.description}</CardDescription>
                      ) : (
                        <CardDescription>{article.time}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="text-xs">
                          {article.category}
                        </Badge>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/docs/${article.slug}`}>
                            Read
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {normalizedQuery !== "" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">
                Search Results ({filteredArticles.length})
              </h2>
              {filteredArticles.length === 0 ? (
                <Card className="bg-muted border-border">
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No articles match your search.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredArticles.map((article, index) => (
                    <Card
                      key={`${article.slug}-${index}`}
                      className="bg-muted border-border hover:border-primary/40 transition-colors"
                    >
                      <CardHeader className="pb-4">
                        <CardTitle className="text-lg font-semibold">
                          {article.title}
                        </CardTitle>
                        {article.description && (
                          <CardDescription>
                            {article.description}
                          </CardDescription>
                        )}
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-center justify-between">
                          {article.category ? (
                            <Badge variant="secondary" className="text-xs">
                              {article.category}
                            </Badge>
                          ) : (
                            <span />
                          )}
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/docs/${article.slug}`}>
                              Read
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {supportSections.map(
              ({ title, description, action, href, icon: IconComponent }) => (
                <Card key={title} className="bg-muted border-border">
                  <CardHeader>
                    <CardTitle>{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" asChild>
                      <Link href={href}>
                        <IconComponent className="mr-2 h-4 w-4" />
                        {action}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              )
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
