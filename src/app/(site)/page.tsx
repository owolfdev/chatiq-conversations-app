// src/app/page.tsx

import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";

import ChatWrapper from "@/components/chat/chat-wrapper";
import { Button } from "@/components/ui/button";
import {
  Bot,
  Code,
  Database,
  FileText,
  MessageSquare,
  Zap,
} from "lucide-react";

import { HeroActions } from "@/components/home/hero-actions";
import { PricingCardButton } from "@/components/home/pricing-card-button";
import { fetchPlanPrice, formatRecurringInterval } from "@/lib/pricing";
import { formatCurrency } from "@/lib/formatters";
import { DEFAULT_BOT_SLUG } from "@/lib/config";
import { headers } from "next/headers";
import { detectCurrencyFromHeaders } from "@/lib/geo/currency";
import { createClient } from "@/utils/supabase/server";
import { getAppUrl } from "@/lib/email/get-app-url";
import type { Metadata } from "next";

const appUrl = getAppUrl();

export const metadata: Metadata = {
  title: { absolute: "Home | ChatIQ" },
  description: "ChatIQ – custom AI chatbots built in minutes.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "ChatIQ",
    description: "ChatIQ – custom AI chatbots built in minutes.",
    url: `${appUrl}/`,
    siteName: "ChatIQ",
    type: "website",
    images: [
      {
        url: `${appUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "ChatIQ - Train on your content. Embed anywhere.",
      },
      {
        url: `${appUrl}/api/og-image`,
        width: 1200,
        height: 630,
        alt: "ChatIQ - Train on your content. Embed anywhere.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ChatIQ",
    description: "ChatIQ – custom AI chatbots built in minutes.",
    images: [`${appUrl}/og-image.png`, `${appUrl}/api/og-image`],
  },
};

export default async function HomePage() {
  // During build, skip Stripe API calls and use fallback values
  // At runtime, fetch actual prices from Stripe
  const isBuildTime = process.env.NEXT_PHASE === "phase-production-build";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Detect currency based on user's location
  const headersList = await headers();
  const currency = detectCurrencyFromHeaders(headersList);

  let proPriceAmount = currency === "thb" ? "฿699" : "$29";
  let proPriceSuffix = "/month";
  let teamPriceAmount = currency === "thb" ? "฿1,699" : "$79";
  let teamPriceSuffix = "/month";

  if (!isBuildTime) {
    // Only fetch from Stripe at runtime (not during build)
    // Use live mode in production, test mode otherwise
    try {
      const [proPrice, teamPrice] = await Promise.all([
        fetchPlanPrice({ plan: "pro", currency }), // Use detected currency
        fetchPlanPrice({ plan: "team", currency }), // Use detected currency
      ]);

      proPriceAmount =
        formatCurrency(proPrice.unitAmount, proPrice.currency) ??
        (currency === "thb" ? "฿699" : "$29");
      proPriceSuffix = formatRecurringInterval(proPrice.interval) ?? "/month";

      teamPriceAmount =
        formatCurrency(teamPrice.unitAmount, teamPrice.currency) ??
        (currency === "thb" ? "฿1,699" : "$79");
      teamPriceSuffix = formatRecurringInterval(teamPrice.interval) ?? "/month";
    } catch (error) {
      // If Stripe fetch fails at runtime, use fallbacks
      console.error(
        "Failed to fetch prices at runtime, using fallbacks",
        error
      );
    }
  }

  return (
    <main className="flex-grow bg-background text-foreground">
      {/* Hero Section */}
      <section
        id="home"
        className="container mx-auto px-4 py-20 flex flex-col items-center text-center"
      >
        <div className="inline-block p-2 bg-muted rounded-full mb-6">
          <Bot className="h-8 w-8 text-emerald-500" />
        </div>
        <h1 className="text-6xl md:text-9xl font-bold mb-4 dark:text-emerald-500 text-foreground">
          ChatIQ
        </h1>
        <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mb-8">
          Train it on your content. Embed it anywhere. Power your growth.
        </p>
        <HeroActions demoSectionId="demo" />
      </section>
      {/* Line QR Code Section */}
      <section className="container mx-auto px-4 py-12 flex flex-col items-center text-center">
        <h2 className="text-xl md:text-2xl font-bold mb-4">
          Friend our official account on Line
        </h2>
        <div>
          <Image
            src="/images/qr/241rlpt-logo.jpg"
            alt="Line QR Code - Friend our official account on Line"
            width={300}
            height={300}
            className="rounded-lg border border-border"
          />
        </div>
      </section>
      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 py-20">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
          Everything you need to build powerful AI chatbots for your business
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard
            icon={<FileText className="h-8 w-8 text-emerald-500" />}
            title="Document Upload"
            description="Upload PDFs, docs, and more to train your chatbot on your specific content."
          />
          <FeatureCard
            icon={<MessageSquare className="h-8 w-8 text-emerald-500" />}
            title="Custom Prompts"
            description="Fine-tune your chatbot's personality and responses with custom system prompts."
          />
          <FeatureCard
            icon={<Code className="h-8 w-8 text-emerald-500" />}
            title="API Access"
            description="Integrate your chatbot anywhere with our simple REST API and SDKs."
          />
          <FeatureCard
            icon={<Database className="h-8 w-8 text-emerald-500" />}
            title="Conversation History"
            description="Store and analyze conversations to improve your chatbot over time."
          />
          <FeatureCard
            icon={<Zap className="h-8 w-8 text-emerald-500" />}
            title="Instant Deployment"
            description="Deploy your chatbot with one click and start chatting immediately."
          />
          <FeatureCard
            icon={<Bot className="h-8 w-8 text-emerald-500" />}
            title="GPT-Powered"
            description="Leverage the latest GPT models for human-like, intelligent conversations."
          />
        </div>

        <div className="max-w-4xl mx-auto mt-16 rounded-lg border border-border bg-muted/30 p-6">
          <h3 className="text-xl md:text-2xl font-semibold mb-2">
            What is a chatbot?
          </h3>
          <p className="text-muted-foreground">
            In ChatIQ, a chatbot is a business tool you educate to handle a
            specific job, like support, sales, or internal help. You can create
            multiple bots and give each one its own knowledge, tone, and
            purpose. Each bot can be embedded on unlimited channels (your
            website, Line, other social channels, etc.).
          </p>
          <div className="mt-4 text-muted-foreground">
            Examples: a customer support bot and an internal team bot, a sales
            bot and a technical docs bot, or separate bots for different brands
            or departments.
          </div>
        </div>
      </section>
      {/* Pricing Section */}
      <section id="pricing" className="container mx-auto px-4 py-20">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
          Simple, transparent pricing
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          <PricingCard
            title="Evaluation"
            price="$0"
            priceSuffix="/evaluation"
            description="14-day evaluation to validate fit, try a real use case, and see how ChatIQ can support your team."
            features={[
              "1 chatbot",
              "Smart document for bot knowledge",
              "No credit card required",
              "For testing only (upgrade for production use)",
            ]}
            buttonText="Get Started"
            buttonVariant="outline"
            plan="free"
            currency={currency}
          />
          <PricingCard
            title="Pro"
            price={proPriceAmount}
            priceSuffix={proPriceSuffix}
            description="Perfect for solo entrepreneurs and small businesses"
            features={[
              "1 user account",
              "Up to 3 chatbots with unique training and personalities",
              "Each bot can be embedded everywhere (unlimited channels)",
              "2,000 AI calls per month (shared across all bots)",
              "Up to 50 knowledge documents",
              "Pre-configured responses",
            ]}
            buttonText="Get Started With Pro"
            buttonVariant="default"
            plan="pro"
            currency={currency}
          />
          <PricingCard
            title="Team"
            price={teamPriceAmount}
            priceSuffix={teamPriceSuffix}
            description="For growing teams, diverse outlets, or multiple locations"
            features={[
              "Up to 5 team members",
              "Up to 10 chatbots (perfect for multiple departments, brands, or clients)",
              "Each bot can be embedded everywhere (unlimited channels)",
              "10,000 AI calls per month (shared across all bots and team)",
              "Up to 200 knowledge documents",
              "Team collaboration & role permissions",
              "Advanced analytics dashboard",
              "Need more than 5 users? Per user upgrades available.",
            ]}
            buttonText="Get Started With Team"
            buttonVariant="default"
            plan="team"
            highlighted
            currency={currency}
          />
          <PricingCard
            title="Business (Custom)"
            price="Custom pricing"
            priceSuffix={null}
            description="Custom scope and rollout designed around your stack and goals."
            features={[
              "Dedicated engineer designs and implements custom integrations",
              "Bespoke features, dashboards, and workflows",
              "Deployment tailored to your stack, security, and data needs",
              "Unlimited users, chatbots, and API usage",
              "Enterprise security: SSO, compliance, audit trails",
              "SLA guarantees with 24/7 priority support",
              "Direct engineering access",
              "White-label deployment available upon request",
            ]}
            buttonText="Let's Build Something Custom"
            buttonVariant="outline"
            plan="enterprise"
            currency={currency}
          />
        </div>
      </section>
      {/* Demo Section with Real Chat */}
      <section id="demo" className="container mx-auto px-4 py-20">
        <div className="flex flex-col items-center text-center mb-12">
          <div className="inline-flex items-center justify-center p-3 bg-emerald-500/10 rounded-full mb-6">
            <Bot className="h-10 w-10 text-emerald-500" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Try it yourself
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-6">
            Experience the power of{" "}
            <span className="text-emerald-500 font-semibold">
              AI-powered conversations
            </span>{" "}
            right here. This demo chatbot is trained on real documentation and
            powered by{" "}
            <span className="text-emerald-500 font-semibold">GPT</span>.
          </p>
        </div>
        <div className="max-w-2xl mx-auto mb-10">
          <ChatWrapper
            botSlug={DEFAULT_BOT_SLUG}
            isInternal={true}
            source="web"
            sourceDetail={{ label: "chatiq-home" }}
            autoFocusInput={false}
          />
        </div>
        <p className="text-lg text-muted-foreground text-center max-w-2xl mx-auto mb-8">
          Ask questions, get instant answers, and see how easy it is to build
          your own intelligent assistant.
        </p>
        <div className="flex justify-center">
          <Link href={user ? "/dashboard" : "/sign-up"}>
            <Button
              size="lg"
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 text-lg"
            >
              Get Started Now
            </Button>
          </Link>
        </div>
      </section>
      <ChatWrapper
        botSlug={DEFAULT_BOT_SLUG}
        variant="floating"
        isInternal={true}
        source="web"
        sourceDetail={{ label: "chatiq-home" }}
      />
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-muted p-6 rounded-lg border border-border hover:border-emerald-500/50 transition-all">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}

function PricingCard({
  title,
  price,
  priceSuffix = "/month",
  description,
  features,
  buttonText,
  buttonVariant = "default",
  highlighted = false,
  plan,
  currency,
}: {
  title: string;
  price: string;
  priceSuffix?: string | null;
  description: string;
  features: string[];
  buttonText: string;
  buttonVariant?: "default" | "outline";
  highlighted?: boolean;
  plan?: "free" | "pro" | "team" | "enterprise";
  currency?: "usd" | "thb";
}) {
  return (
    <div
      className={`p-8 rounded-lg border ${
        highlighted
          ? "border-emerald-500 bg-muted/80"
          : "border-border bg-muted/30"
      } flex flex-col justify-between`}
    >
      {highlighted ? (
        <span className="text-xs font-semibold tracking-wide uppercase text-emerald-600 mb-2">
          Most Popular
        </span>
      ) : null}
      <h3 className="text-2xl font-bold mb-2">{title}</h3>
      <div className="flex items-baseline mb-4">
        <span className="text-4xl font-bold">{price}</span>
        {priceSuffix ? (
          <span className="text-muted-foreground ml-2">{priceSuffix}</span>
        ) : null}
      </div>
      <p className="text-muted-foreground mb-6">{description}</p>
      <ul className="space-y-3 mb-8">
        {features.map((feature) => (
          <li key={feature} className="flex items-start">
            <svg
              aria-label={`${feature} icon`}
              aria-hidden="true"
              className="h-5 w-5 text-emerald-500 mr-2 shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            {feature}
          </li>
        ))}
      </ul>
      <PricingCardButton
        plan={plan}
        buttonText={buttonText}
        buttonVariant={buttonVariant}
        currency={currency}
      />
    </div>
  );
}
