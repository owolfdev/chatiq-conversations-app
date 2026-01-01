// src/app/actions/admin/get-stripe-diagnostics.ts
// Server action to gather comprehensive Stripe diagnostics

import { env, isStripeLiveModeConfigured, getStripeKeys } from "@/lib/env";
import { getStripeClient, getStripePriceId, isLiveMode, BillingPlan, BillingCurrency } from "@/lib/stripe";
import type Stripe from "stripe";

export interface StripeDiagnostics {
  env: {
    test: {
      publishableKey: boolean;
      secretKey: boolean;
      webhookSecret: boolean;
      prices: {
        proUsd: string | null;
        teamUsd: string | null;
        proThb: string | null;
        teamThb: string | null;
      };
    };
    live: {
      publishableKey: boolean;
      secretKey: boolean;
      webhookSecret: boolean;
      prices: {
        proUsd: string | null;
        teamUsd: string | null;
        proThb: string | null;
        teamThb: string | null;
      };
    };
    liveModeConfigured: boolean;
  };
  connectivity: {
    test: "success" | "error" | "not_configured";
    testError?: string;
    live: "success" | "error" | "not_configured";
    liveError?: string;
  };
  prices: {
    test: Array<{
      key: string;
      plan: string;
      currency: string;
      priceId: string | null;
      status: "success" | "error" | "not_configured";
      error?: string;
      details?: {
        unitAmount: number | null;
        currency: string | null;
        interval: string | null;
        active: boolean;
      };
    }>;
    live: Array<{
      key: string;
      plan: string;
      currency: string;
      priceId: string | null;
      status: "success" | "error" | "not_configured";
      error?: string;
      details?: {
        unitAmount: number | null;
        currency: string | null;
        interval: string | null;
        active: boolean;
      };
    }>;
  };
  system: {
    nodeEnv: string;
    nextPhase: string | null;
    isBuildTime: boolean;
    currentMode: "test" | "live";
    willUseLiveMode: boolean;
  };
}

export async function getStripeDiagnostics(): Promise<StripeDiagnostics> {
  // Environment variable status
  const testKeys = getStripeKeys(false);
  const liveKeys = getStripeKeys(true);
  const liveModeConfigured = isStripeLiveModeConfigured();

  const diagnostics: StripeDiagnostics = {
    env: {
      test: {
        publishableKey: !!env.STRIPE_PUBLISHABLE_KEY,
        secretKey: !!env.STRIPE_SECRET_KEY,
        webhookSecret: !!env.STRIPE_WEBHOOK_SECRET,
        prices: {
          proUsd: env.STRIPE_PRICE_PRO_USD || null,
          teamUsd: env.STRIPE_PRICE_TEAM_USD || null,
          proThb: env.STRIPE_PRICE_PRO_THB || null,
          teamThb: env.STRIPE_PRICE_TEAM_THB || null,
        },
      },
      live: {
        publishableKey: !!env.STRIPE_PUBLISHABLE_KEY_LIVE,
        secretKey: !!env.STRIPE_SECRET_KEY_LIVE,
        webhookSecret: !!env.STRIPE_WEBHOOK_SECRET_LIVE,
        prices: {
          proUsd: env.STRIPE_PRICE_PRO_USD_LIVE || null,
          teamUsd: env.STRIPE_PRICE_TEAM_USD_LIVE || null,
          proThb: env.STRIPE_PRICE_PRO_THB_LIVE || null,
          teamThb: env.STRIPE_PRICE_TEAM_THB_LIVE || null,
        },
      },
      liveModeConfigured,
    },
    connectivity: {
      test: "not_configured",
      live: "not_configured",
    },
    prices: {
      test: [],
      live: [],
    },
    system: {
      nodeEnv: env.NODE_ENV,
      nextPhase: process.env.NEXT_PHASE || null,
      isBuildTime: process.env.NEXT_PHASE === "phase-production-build",
      currentMode: isLiveMode() ? "live" : "test",
      willUseLiveMode: isLiveMode(),
    },
  };

  // Test API connectivity for test mode
  if (testKeys.secretKey) {
    try {
      const stripe = getStripeClient(false);
      // Try to retrieve balance (lightweight API call that works with any API key)
      await stripe.balance.retrieve();
      diagnostics.connectivity.test = "success";
    } catch (error) {
      diagnostics.connectivity.test = "error";
      diagnostics.connectivity.testError =
        error instanceof Error ? error.message : String(error);
    }
  }

  // Test API connectivity for live mode
  if (liveModeConfigured && liveKeys.secretKey) {
    try {
      const stripe = getStripeClient(true);
      // Try to retrieve balance (lightweight API call that works with any API key)
      await stripe.balance.retrieve();
      diagnostics.connectivity.live = "success";
    } catch (error) {
      diagnostics.connectivity.live = "error";
      diagnostics.connectivity.liveError =
        error instanceof Error ? error.message : String(error);
    }
  }

  // Validate test mode prices
  const testPriceConfigs: Array<{
    key: string;
    plan: BillingPlan;
    currency: BillingCurrency;
  }> = [
    { key: "pro-usd", plan: "pro", currency: "usd" },
    { key: "team-usd", plan: "team", currency: "usd" },
    { key: "pro-thb", plan: "pro", currency: "thb" },
    { key: "team-thb", plan: "team", currency: "thb" },
  ];

  for (const config of testPriceConfigs) {
    const priceKey = `${config.plan}${config.currency === "usd" ? "Usd" : "Thb"}` as
      | "proUsd"
      | "teamUsd"
      | "proThb"
      | "teamThb";
    const priceId = diagnostics.env.test.prices[priceKey];

    if (!priceId) {
      diagnostics.prices.test.push({
        key: config.key,
        plan: config.plan,
        currency: config.currency,
        priceId: null,
        status: "not_configured",
      });
      continue;
    }

    try {
      const stripe = getStripeClient(false);
      const price = await stripe.prices.retrieve(priceId);

      diagnostics.prices.test.push({
        key: config.key,
        plan: config.plan,
        currency: config.currency,
        priceId,
        status: "success",
        details: {
          unitAmount: price.unit_amount,
          currency: price.currency,
          interval: price.recurring?.interval || null,
          active: price.active,
        },
      });
    } catch (error) {
      diagnostics.prices.test.push({
        key: config.key,
        plan: config.plan,
        currency: config.currency,
        priceId,
        status: "error",
        error:
          error instanceof Error
            ? error.message
            : String(error),
      });
    }
  }

  // Validate live mode prices (if configured)
  if (liveModeConfigured) {
    for (const config of testPriceConfigs) {
      const priceKey = `${config.plan}${config.currency === "usd" ? "Usd" : "Thb"}` as
        | "proUsd"
        | "teamUsd"
        | "proThb"
        | "teamThb";
      const priceId = diagnostics.env.live.prices[priceKey];

      if (!priceId) {
        diagnostics.prices.live.push({
          key: config.key,
          plan: config.plan,
          currency: config.currency,
          priceId: null,
          status: "not_configured",
        });
        continue;
      }

      try {
        const stripe = getStripeClient(true);
        const price = await stripe.prices.retrieve(priceId);

        diagnostics.prices.live.push({
          key: config.key,
          plan: config.plan,
          currency: config.currency,
          priceId,
          status: "success",
          details: {
            unitAmount: price.unit_amount,
            currency: price.currency,
            interval: price.recurring?.interval || null,
            active: price.active,
          },
        });
      } catch (error) {
        diagnostics.prices.live.push({
          key: config.key,
          plan: config.plan,
          currency: config.currency,
          priceId,
          status: "error",
          error:
            error instanceof Error
              ? error.message
              : String(error),
        });
      }
    }
  }

  return diagnostics;
}

