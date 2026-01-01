// src/app/product/page.tsx

import Link from "next/link";
import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import {
  ArrowUpRight,
  CheckCircle2,
  Globe2,
  MessageCircle,
  Rocket,
} from "lucide-react";

const siteUrl = "https://www.chatiq.io";

export const metadata: Metadata = {
  title: "Product",
  description:
    "Discover how ChatIQ turns your docs and FAQs into conversion-ready chatbots.",
  alternates: {
    canonical: "/product",
  },
  openGraph: {
    title: "ChatIQ Product",
    description:
      "Discover how ChatIQ turns your docs and FAQs into conversion-ready chatbots.",
    url: "/product",
    siteName: "ChatIQ",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ChatIQ Product",
    description:
      "Discover how ChatIQ turns your docs and FAQs into conversion-ready chatbots.",
  },
};

export default function ProductPage() {
  const faqItems = [
    {
      question: "How fast can I launch a ChatIQ bot?",
      answer:
        "Most teams can launch in minutes by connecting their docs and adding the embed.",
    },
    {
      question: "What content can I educate ChatIQ with?",
      answer:
        "You can educate it with docs, FAQs, product pages, and other marketing content.",
    },
    {
      question: "How do I add ChatIQ to my site?",
      answer:
        "Paste a single embed on any page or share a hosted chat link to get started.",
    },
  ];
  const softwareApplicationStructuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "ChatIQ",
    operatingSystem: "Web",
    applicationCategory: "BusinessApplication",
    description:
      "ChatIQ turns your docs and FAQs into conversion-ready chatbots you can embed anywhere.",
    url: `${siteUrl}/product`,
    image: `${siteUrl}/icon-512.png`,
    provider: {
      "@type": "Organization",
      name: "ChatIQ",
      url: siteUrl,
    },
  };
  const faqStructuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <main className="flex min-h-screen flex-col bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(softwareApplicationStructuredData),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqStructuredData),
        }}
      />
      <section className="container mx-auto flex max-w-6xl flex-col items-center gap-8 px-6 pb-20 pt-24 text-center">
        <div className="flex items-center gap-2 rounded-full border border-border/60 bg-muted px-4 py-2 text-sm font-semibold text-emerald-500">
          <Globe2 className="h-4 w-4" />
          Live at
          <Link
            href={siteUrl}
            className="inline-flex items-center gap-1 font-bold underline decoration-emerald-400 decoration-2 underline-offset-4"
          >
            {siteUrl.replace("https://", "")}
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="space-y-4">
          <p className="text-sm uppercase tracking-[0.25em] text-emerald-500">
            AI chatbots for real businesses
          </p>
          <h1 className="text-4xl font-black leading-tight sm:text-6xl md:text-7xl">
            Embed a GPT-powered chatbot educated on your content in minutes at{" "}
            <span className="text-emerald-500">ChatIQ.io</span>.
          </h1>
          <p className="text-lg text-muted-foreground sm:text-xl">
            ChatIQ ingests your docs, FAQs, and product pages, then ships a
            beautiful chat experience you can drop anywhere: marketing sites,
            product tours, and onboarding flows.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-4">
          <Button asChild size="lg" className="text-base">
            <Link href="/sign-up">Start evaluation</Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="text-base border-emerald-500 text-emerald-500 hover:bg-emerald-950"
          >
            <Link href="#why">See why teams choose ChatIQ</Link>
          </Button>
        </div>
      </section>

      <section
        id="why"
        className="container mx-auto grid max-w-5xl gap-8 px-6 pb-20 md:grid-cols-2"
      >
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-500">
            <Rocket className="h-4 w-4" />
            Built for shipping fast
          </div>
          <h2 className="text-3xl font-bold md:text-4xl">
            Turn traffic into conversations that close.
          </h2>
          <p className="text-muted-foreground">
            ChatIQ captures high-intent visitors with instant, on-brand answers.
            Upload your marketing copy, onboarding docs, and sales one-pagers,
            then drop a single embed to get a conversion-ready chatbot on any
            page.
          </p>
          <div className="flex flex-col gap-3">
            {[
              "Educate with docs, FAQs, and product pages with zero code.",
              "Control tone, guardrails, and suggested prompts to stay on brand.",
              "Embed anywhere with a single line or send traffic to a hosted chat link.",
              "Analytics that show the questions people ask before they buy.",
            ].map((item) => (
              <p key={item} className="flex items-start gap-3 text-left">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-500" />
                <span>{item}</span>
              </p>
            ))}
          </div>
          <div className="flex gap-4">
            <Button asChild className="bg-emerald-500 hover:bg-emerald-600">
              <Link href="/sign-up">Launch a bot</Link>
            </Button>
            <Button asChild variant="ghost" className="gap-2">
              <Link href="/contact">
                Talk to sales
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-border bg-muted/60 p-8">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent" />
          <div className="relative space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-background/80 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-emerald-500/10 p-3">
                  <MessageCircle className="h-6 w-6 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">
                    Customer support bot
                  </p>
                  <p className="text-lg font-bold">Acme Help Desk</p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-500">
                Live
              </span>
            </div>
            <div className="rounded-xl bg-background/90 p-6 shadow-sm">
              <p className="text-sm font-semibold text-emerald-500">Prompt</p>
              <p className="font-medium">
                You are the customer support assistant for Acme. Be friendly,
                concise, and link to the right help article when possible.
              </p>
              <div className="mt-6 grid gap-3">
                {[
                  {
                    question: "Where is my order?",
                    answer:
                      "Share your order number and email and I will pull the latest status. You can also track it here: acme.com/help/track-order.",
                  },
                  {
                    question: "Can I return an item after 30 days?",
                    answer:
                      "We accept returns within 45 days for unused items. Start a return at acme.com/help/returns and I will guide you through it.",
                  },
                  {
                    question: "Do you ship internationally?",
                    answer:
                      "Yes, we ship to 40+ countries. Estimated delivery times and rates are listed at acme.com/help/shipping.",
                  },
                ].map((item) => (
                  <div
                    key={item.question}
                    className="rounded-lg border border-border/70 bg-muted/60 p-3 text-left"
                  >
                    <p className="text-sm font-semibold text-muted-foreground">
                      Visitor asks
                    </p>
                    <p className="text-base font-medium">{item.question}</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      ChatIQ answers
                    </p>
                    <p className="text-sm">{item.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-border">
        <div className="container mx-auto flex max-w-4xl flex-col gap-8 px-6 py-16">
          <div className="text-center space-y-3">
            <p className="text-sm uppercase tracking-[0.25em] text-emerald-500">
              Frequently asked
            </p>
            <h2 className="text-3xl font-bold">FAQ</h2>
            <p className="text-muted-foreground">
              Quick answers to the questions we hear most.
            </p>
          </div>
          <div className="grid gap-6">
            {faqItems.map((item) => (
              <div
                key={item.question}
                className="rounded-2xl border border-border bg-muted/40 p-6"
              >
                <h3 className="text-lg font-semibold">{item.question}</h3>
                <p className="mt-2 text-muted-foreground">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="border-t border-border bg-muted/60">
        <div className="container mx-auto flex flex-col items-center gap-4 px-6 py-12 text-center">
          <p className="text-sm uppercase tracking-[0.25em] text-emerald-500">
            Ready when you are
          </p>
          <h3 className="text-3xl font-bold">Ship a marketing-ready bot now</h3>
          <p className="max-w-2xl text-muted-foreground">
            No setup fees, no waiting on engineering. Point ChatIQ at your
            marketing site, paste in your sales one-pager, and start converting
            visitors with answers pulled straight from your own content.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link href="/sign-up">Start evaluation</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="gap-2 border-emerald-500 text-emerald-500 hover:bg-emerald-950"
            >
              <Link href={siteUrl} target="_blank" rel="noreferrer">
                Visit {siteUrl.replace("https://", "")}
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
