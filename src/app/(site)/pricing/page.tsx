// src/app/pricing/page.tsx
import type { ReactNode } from "react";
import type { Metadata } from "next";
import { PricingCardButton } from "@/components/home/pricing-card-button";
import { fetchPlanPrice, formatRecurringInterval } from "@/lib/pricing";
import { formatCurrency } from "@/lib/formatters";
import { headers } from "next/headers";
import { detectCurrencyFromHeaders } from "@/lib/geo/currency";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "See ChatIQ pricing for Evaluation, Pro, and Team plans with clear usage limits.",
  alternates: {
    canonical: "/pricing",
  },
  openGraph: {
    title: "ChatIQ Pricing",
    description:
      "See ChatIQ pricing for Evaluation, Pro, and Team plans with clear usage limits.",
    url: "/pricing",
    siteName: "ChatIQ",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ChatIQ Pricing",
    description:
      "See ChatIQ pricing for Evaluation, Pro, and Team plans with clear usage limits.",
  },
};

export default async function PricingPage() {
  // During build, skip Stripe API calls and use fallback values
  // At runtime, fetch actual prices from Stripe
  const isBuildTime = process.env.NEXT_PHASE === "phase-production-build";

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
      const proPrice = await fetchPlanPrice({
        plan: "pro",
        currency,
        useLive: process.env.NODE_ENV === "production",
      });
      if (proPrice) {
        const formattedPrice = proPrice.unitAmount
          ? formatCurrency(proPrice.unitAmount, proPrice.currency)
          : null;
        proPriceAmount = formattedPrice ?? proPriceAmount;
        const formattedSuffix = formatRecurringInterval(proPrice.interval);
        proPriceSuffix = formattedSuffix ?? proPriceSuffix;
      }

      const teamPrice = await fetchPlanPrice({
        plan: "team",
        currency,
        useLive: process.env.NODE_ENV === "production",
      });
      if (teamPrice) {
        const formattedPrice = teamPrice.unitAmount
          ? formatCurrency(teamPrice.unitAmount, teamPrice.currency)
          : null;
        teamPriceAmount = formattedPrice ?? teamPriceAmount;
        const formattedSuffix = formatRecurringInterval(teamPrice.interval);
        teamPriceSuffix = formattedSuffix ?? teamPriceSuffix;
      }
    } catch (error) {
      console.error("Failed to fetch pricing from Stripe:", error);
      // Use fallback values on error
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose the plan that's right for you. All plans include a 14-day
            evaluation with no credit card required.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
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
              "Additional users upgrade available.",
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

        <div className="max-w-4xl mx-auto mt-12 rounded-lg border border-border bg-muted/30 p-6">
          <h2 className="text-xl md:text-2xl font-semibold mb-2">
            What is a chatbot?
          </h2>
          <p className="text-muted-foreground">
            In ChatIQ, a chatbot is a business tool you educate to handle a
            specific job, like support, sales, or internal help. You can create
            multiple bots and give each one its own knowledge, tone, and purpose.
            Each bot can be embedded on unlimited channels (your website, Line,
            other social channels, etc.).
          </p>
          <div className="mt-4 text-muted-foreground">
            Examples: a customer support bot and an internal team bot, a sales
            bot and a technical docs bot, or separate bots for different brands
            or departments.
          </div>
        </div>

        <div className="mt-16 text-center">
          <p className="text-sm text-muted-foreground">
            Questions?{" "}
            <a
              href="/contact"
              className="text-emerald-600 hover:text-emerald-700 underline"
            >
              Contact our sales team
            </a>
          </p>
        </div>
      </div>
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
              className="h-5 w-5 text-emerald-500 mr-2 flex-shrink-0 mt-0.5"
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
