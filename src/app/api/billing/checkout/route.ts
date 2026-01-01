// src/app/api/billing/checkout/route.ts

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type Stripe from "stripe";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { getUserTeamId } from "@/lib/teams/get-user-team-id";
import {
  getStripeClient,
  getStripePriceId,
  getPlanFromPriceId,
  BillingPlan,
  BillingCurrency,
  isLiveMode,
} from "@/lib/stripe";
import { env } from "@/lib/env";
import { getAppUrl } from "@/lib/email/get-app-url";
import { AUDIT_ACTION, AUDIT_RESOURCE } from "@/lib/audit/constants";
import { logAuditEvent } from "@/lib/audit/log-event";

type CheckoutRequestBody = {
  plan?: BillingPlan;
  currency?: BillingCurrency;
  successUrl?: string;
  cancelUrl?: string;
};

const DEFAULT_PLAN: BillingPlan = "pro";
const DEFAULT_CURRENCY: BillingCurrency = "usd";

export async function POST(request: NextRequest) {
  try {
    const forwardedFor = request.headers.get("x-forwarded-for") || "";
    const ipAddress =
      forwardedFor.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      null;
    const userAgent = request.headers.get("user-agent") || null;

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "You must be signed in to create a checkout session." },
        { status: 401 }
      );
    }

    const body = (await request
      .json()
      .catch(() => ({}))) as CheckoutRequestBody;
    const plan = body.plan ?? DEFAULT_PLAN;
    const currency = body.currency ?? DEFAULT_CURRENCY;

    if (!["pro", "team"].includes(plan)) {
      return NextResponse.json(
        { error: "Invalid plan. Expected 'pro' or 'team'." },
        { status: 400 }
      );
    }

    if (!["usd", "thb"].includes(currency)) {
      return NextResponse.json(
        { error: "Invalid currency. Expected 'usd' or 'thb'." },
        { status: 400 }
      );
    }

    const teamId = await getUserTeamId(user.id);
    if (!teamId) {
      return NextResponse.json(
        { error: "No team found for the current user." },
        { status: 400 }
      );
    }

    const { data: team, error: teamError } = await supabase
      .from("bot_teams")
      .select("id, name, stripe_customer_id, plan, billing_currency")
      .eq("id", teamId)
      .limit(1)
      .maybeSingle();

    if (teamError || !team) {
      return NextResponse.json(
        { error: "Unable to load team details." },
        { status: 400 }
      );
    }

    // Use team's billing currency if not specified in request, or auto-detect if not set
    let finalCurrency = currency;
    if (!currency || currency === DEFAULT_CURRENCY) {
      if (team.billing_currency === "thb" || team.billing_currency === "usd") {
        finalCurrency = team.billing_currency;
      } else {
        // If team has an existing subscription, check its currency
        if (team.stripe_customer_id && team.stripe_customer_id !== "NULL") {
          try {
            const stripe = getStripeClient(isLiveMode());
            const subscriptions = await stripe.subscriptions.list({
              customer: team.stripe_customer_id,
              status: "all",
              limit: 1,
            });
            
            if (subscriptions.data.length > 0) {
              const activeSub = subscriptions.data[0];
              const price = activeSub.items.data[0]?.price;
              if (price?.currency === "thb") {
                finalCurrency = "thb";
              } else if (price?.currency === "usd") {
                finalCurrency = "usd";
              }
            }
          } catch (error) {
            console.warn("[stripe] Failed to check existing subscription currency", error);
          }
        }
        
        // If still not determined, auto-detect from headers
        if (finalCurrency === DEFAULT_CURRENCY) {
          const { detectCurrencyFromHeaders } = await import("@/lib/geo/currency");
          finalCurrency = detectCurrencyFromHeaders(request.headers);
        }
      }
    }

    const stripe = getStripeClient(isLiveMode());

    // Normalize legacy bad values like the literal string 'NULL'
    let customerId =
      team.stripe_customer_id && team.stripe_customer_id !== "NULL"
        ? team.stripe_customer_id
        : null;

    if (!customerId) {
      const customerPayload: Stripe.CustomerCreateParams = {
        email: user.email ?? undefined,
        name: `ChatIQ | ${
          user.user_metadata?.full_name ?? user.email ?? "Customer"
        }`,
        metadata: {
          app: "chatiq",
          supabase_user_id: user.id,
          team_id: team.id,
        },
      };

      const customer = await stripe.customers.create(customerPayload);
      customerId = customer.id;

      const admin = createAdminClient();
      const { error: updateError } = await admin
        .from("bot_teams")
        .update({
          stripe_customer_id: customerId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", team.id);

      if (updateError) {
        return NextResponse.json(
          { error: "Failed to persist Stripe customer ID." },
          { status: 500 }
        );
      }
    } else {
      // Ensure metadata stays in sync (best-effort, ignore failures)
      try {
        await stripe.customers.update(customerId, {
          metadata: {
            app: "chatiq",
            supabase_user_id: user.id,
            team_id: team.id,
          },
        });
      } catch (error) {
        console.warn("[stripe] Failed to refresh customer metadata", error);
      }
    }

    let priceId: string;
    try {
      priceId = getStripePriceId(plan, finalCurrency, isLiveMode());
    } catch (error) {
      console.error("[stripe] Failed to get price ID", {
        plan,
        currency: finalCurrency,
        isLive: isLiveMode(),
        error: error instanceof Error ? error.message : String(error),
      });
      return NextResponse.json(
        {
          error: `Price not configured for ${plan} plan in ${finalCurrency.toUpperCase()}. Please contact support.`,
        },
        { status: 400 }
      );
    }

    // Check if user already has an active subscription
    // If upgrading, modify existing subscription instead of creating a new one
    let existingSubscription: Stripe.Subscription | null = null;
    if (customerId) {
      try {
        const subscriptions = await stripe.subscriptions.list({
          customer: customerId,
          status: "active",
          limit: 1,
        });
        existingSubscription = subscriptions.data[0] ?? null;
      } catch (error) {
        console.warn("[stripe] Failed to check existing subscriptions", error);
        // Continue with checkout creation if we can't check
      }
    }

    // If user has an active subscription, update it instead of creating a new one
    if (existingSubscription) {
      const currentPriceId = existingSubscription.items.data[0]?.price?.id;
      
      // Only update if it's a different plan
      if (currentPriceId !== priceId) {
        try {
          // Update the subscription to the new plan
          // This handles proration automatically
          const updatedSubscription = await stripe.subscriptions.update(
            existingSubscription.id,
            {
              items: [
                {
                  id: existingSubscription.items.data[0]?.id,
                  price: priceId,
                },
              ],
              proration_behavior: "always_invoice", // Charge prorated amount immediately
              metadata: {
                team_id: team.id,
                app: "chatiq",
                requested_plan: plan,
                currency: finalCurrency,
              },
            }
          );

          // Determine if this is an upgrade or downgrade
          const currentPlanFromPrice = getPlanFromPriceId(currentPriceId);
          const planHierarchy: Record<string, number> = {
            free: 0,
            pro: 1,
            team: 2,
            enterprise: 3,
          };
          const currentTier = currentPlanFromPrice ? planHierarchy[currentPlanFromPrice] ?? -1 : -1;
          const targetTier = planHierarchy[plan] ?? -1;
          const isUpgrade = targetTier > currentTier;
          const isDowngrade = targetTier < currentTier && currentTier > 0;

          await logAuditEvent({
            teamId: team.id,
            userId: user.id,
            action: AUDIT_ACTION.BILLING_UPDATE,
            resourceType: AUDIT_RESOURCE.BILLING,
            resourceId: updatedSubscription.id,
            metadata: {
              plan,
              currency: finalCurrency,
              is_live_mode: isLiveMode(),
              previous_price_id: currentPriceId,
              new_price_id: priceId,
              subscription_id: existingSubscription.id,
              change_type: isUpgrade ? "upgrade" : isDowngrade ? "downgrade" : "subscription_update",
            },
            ipAddress,
            userAgent,
          });

          // Redirect to billing page with success message
          const appUrl = getAppUrl();
          const successParam = isUpgrade ? "upgrade=success" : isDowngrade ? "downgrade=success" : "change=success";
          return NextResponse.json({
            url: `${appUrl}/dashboard/billing?${successParam}`,
            upgraded: isUpgrade,
            downgraded: isDowngrade,
            subscriptionId: updatedSubscription.id,
          });
        } catch (error) {
          console.error("[stripe] Failed to update subscription", error);
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          return NextResponse.json(
            {
              error: "Failed to change subscription. Please try again or contact support.",
              details:
                process.env.NODE_ENV === "development" ? errorMessage : undefined,
            },
            { status: 500 }
          );
        }
      } else {
        // User already has this plan, redirect to billing page
        const appUrl = getAppUrl();
        return NextResponse.json({
          url: `${appUrl}/dashboard/billing?already_subscribed=true`,
          alreadySubscribed: true,
        });
      }
    }

    // No existing subscription - create new checkout session
    const appUrl = getAppUrl();
    const successUrl =
      body.successUrl ??
      `${appUrl}/dashboard/billing?checkout=success`;
    const cancelUrl =
      body.cancelUrl ??
      `${appUrl}/dashboard/billing?checkout=cancelled`;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        team_id: team.id,
        app: "chatiq",
        requested_plan: plan,
        currency: finalCurrency,
      },
      subscription_data: {
        metadata: {
          team_id: team.id,
          app: "chatiq",
        },
      },
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Failed to create checkout session." },
        { status: 500 }
      );
    }

    await logAuditEvent({
      teamId: team.id,
      userId: user.id,
      action: AUDIT_ACTION.BILLING_UPDATE,
      resourceType: AUDIT_RESOURCE.BILLING,
      resourceId: session.id,
      metadata: {
        plan,
        currency: finalCurrency,
        is_live_mode: isLiveMode(),
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_id: customerId,
        new_customer: !team.stripe_customer_id,
        price_id: priceId,
      },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[stripe] Checkout session creation failed", error);
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: "Unexpected error creating checkout session.",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}
