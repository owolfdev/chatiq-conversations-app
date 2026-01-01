// src/app/api/stripe/webhook/route.ts

import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { getStripeClient, getPlanFromPriceId, isLiveMode } from "@/lib/stripe";
import { getStripeKeys } from "@/lib/env";
import { createAdminClient } from "@/utils/supabase/admin";
import { AUDIT_ACTION, AUDIT_RESOURCE } from "@/lib/audit/constants";
import { logAuditEvent } from "@/lib/audit/log-event";
import {
  logBillingEvent,
  isEventProcessed,
  updateEventProcessingStatus,
} from "@/lib/billing/log-event";
import type { PlanId } from "@/lib/plans/quotas";

const relevantEvents = new Set<Stripe.Event.Type>([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing Stripe signature" },
      { status: 400 }
    );
  }

  const liveMode = isLiveMode();
  const stripe = getStripeClient(liveMode);
  const { webhookSecret } = getStripeKeys(liveMode);

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error("[stripe] Invalid webhook signature", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Step 1: Log ALL events to bot_billing_events table (complete audit trail)
  // This happens regardless of whether we process the event or not
  await logBillingEvent(event);

  // Step 2: Check idempotency - if event was already successfully processed, skip
  const alreadyProcessed = await isEventProcessed(event.id);
  if (alreadyProcessed) {
    console.log(
      `[stripe] Event ${event.id} (${event.type}) already processed, skipping`
    );
    return NextResponse.json({ received: true, skipped: true });
  }

  // Step 3: Only process events we care about
  if (!relevantEvents.has(event.type)) {
    // Event logged but not processed (not in relevantEvents)
    await updateEventProcessingStatus(event.id, "success");
    return NextResponse.json({ received: true });
  }

  // Step 4: Process the event
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSession(session);
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }
      default:
        break;
    }

    // Step 5: Mark event as successfully processed
    await updateEventProcessingStatus(event.id, "success");
  } catch (error) {
    console.error("[stripe] Webhook handler error", error);
    // Mark event as failed
    await updateEventProcessingStatus(
      event.id,
      "failed",
      error instanceof Error ? error.message : String(error)
    );
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutSession(session: Stripe.Checkout.Session) {
  if (session.mode !== "subscription") {
    return;
  }

  const teamId = session.metadata?.team_id;
  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id;

  if (!teamId || !customerId) {
    console.warn(
      "[stripe] checkout.session.completed missing team_id/customer",
      {
        teamId,
        customerId,
      }
    );
    return;
  }

  const supabase = createAdminClient();
  
  // Determine currency from session metadata or currency field
  const sessionCurrency = session.metadata?.currency || session.currency;
  const billingCurrency = sessionCurrency === "thb" ? "thb" : sessionCurrency === "usd" ? "usd" : undefined;
  
  const updateData: {
    stripe_customer_id: string;
    billing_currency?: "usd" | "thb";
    updated_at: string;
  } = {
    stripe_customer_id: customerId,
    updated_at: new Date().toISOString(),
  };
  
  if (billingCurrency) {
    updateData.billing_currency = billingCurrency;
  }
  
  const { error } = await supabase
    .from("bot_teams")
    .update(updateData)
    .eq("id", teamId);

  if (error) {
    throw new Error(`Failed to link Stripe customer to team: ${error.message}`);
  }

  await logAuditEvent({
    teamId,
    action: AUDIT_ACTION.BILLING_UPDATE,
    resourceType: AUDIT_RESOURCE.BILLING,
    resourceId: typeof session.subscription === "string" ? session.subscription : session.subscription?.id ?? session.id,
    metadata: {
      event: "checkout.session.completed",
      customer_id: customerId,
      session_id: session.id,
      subscription_id:
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id ?? null,
      requested_plan: session.metadata?.requested_plan ?? null,
      currency: session.currency ?? null,
      amount_total: session.amount_total,
      livemode: session.livemode,
    },
  });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = getCustomerId(subscription.customer);
  if (!customerId) {
    console.warn("[stripe] subscription update missing customer", {
      subscriptionId: subscription.id,
    });
    return;
  }

  const priceId = subscription.items.data[0]?.price?.id;
  const priceCurrency = subscription.items.data[0]?.price?.currency;
  const plan = priceId ? getPlanFromPriceId(priceId) : null;

  if (!plan) {
    console.warn("[stripe] Unable to resolve plan for subscription", {
      subscriptionId: subscription.id,
      priceId,
    });
    return;
  }

  await updateTeamPlan(customerId, plan, {
    event: "customer.subscription.updated",
    subscriptionId: subscription.id,
    priceId,
    currency: priceCurrency === "thb" ? "thb" : priceCurrency === "usd" ? "usd" : undefined,
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = getCustomerId(subscription.customer);
  if (!customerId) {
    console.warn("[stripe] subscription deleted missing customer", {
      subscriptionId: subscription.id,
    });
    return;
  }

  const stripe = getStripeClient(isLiveMode());

  try {
    const otherSubscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      expand: ["data.items.data.price"],
      limit: 10,
    });

    const activeSubscription = otherSubscriptions.data
      .filter((sub) => sub.id !== subscription.id)
      .filter((sub) => sub.status === "active" || sub.status === "trialing")
      .sort((a, b) => (b.created ?? 0) - (a.created ?? 0))[0];

    if (activeSubscription) {
      const nextPriceId = activeSubscription.items.data[0]?.price?.id;
      const nextPlan = nextPriceId ? getPlanFromPriceId(nextPriceId) : null;

      if (nextPlan) {
        await updateTeamPlan(customerId, nextPlan, {
          event: "customer.subscription.deleted",
          subscriptionId: subscription.id,
          priceId: nextPriceId ?? null,
        });
        return;
      }
    }
  } catch (error) {
    console.error("[stripe] Failed to inspect remaining subscriptions", {
      customerId,
      subscriptionId: subscription.id,
      error,
    });
  }

  await updateTeamPlan(customerId, "free", {
    event: "customer.subscription.deleted",
    subscriptionId: subscription.id,
    priceId: subscription.items.data[0]?.price?.id ?? null,
  });
}

async function updateTeamPlan(
  customerId: string,
  plan: PlanId,
  context?: {
    event?: string;
    subscriptionId?: string | null;
    priceId?: string | null;
    currency?: "usd" | "thb";
  }
) {
  const supabase = createAdminClient();

  const { data: team, error: fetchError } = await supabase
    .from("bot_teams")
    .select("id, plan, billing_currency")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (fetchError) {
    throw new Error(
      `Failed to lookup team by stripe_customer_id: ${fetchError.message}`
    );
  }

  if (!team) {
    console.warn("[stripe] No team found for customer", { customerId, plan });
    return;
  }

  // Determine if we need to update plan or currency
  const planChanged = team.plan !== plan;
  const currencyChanged = context?.currency && team.billing_currency !== context.currency;
  
  if (!planChanged && !currencyChanged) {
    return;
  }

  const previousPlan = team.plan as PlanId;
  const updateData: {
    plan?: PlanId;
    billing_currency?: "usd" | "thb";
    updated_at: string;
  } = {
    updated_at: new Date().toISOString(),
  };

  if (planChanged) {
    updateData.plan = plan;
  }

  if (currencyChanged && context.currency) {
    updateData.billing_currency = context.currency;
  }

  const { error: updateError } = await supabase
    .from("bot_teams")
    .update(updateData)
    .eq("id", team.id);

  if (updateError) {
    throw new Error(
      `Failed to update team plan for ${team.id}: ${updateError.message}`
    );
  }

  await logAuditEvent({
    teamId: team.id,
    action: AUDIT_ACTION.BILLING_UPDATE,
    resourceType: AUDIT_RESOURCE.BILLING,
    resourceId: context?.subscriptionId ?? customerId,
    metadata: {
      event: context?.event ?? "subscription.plan_change",
      customer_id: customerId,
      previous_plan: previousPlan,
      new_plan: plan,
      price_id: context?.priceId ?? null,
    },
  });
}

function getCustomerId(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null
): string | null {
  if (!customer) return null;
  if (typeof customer === "string") return customer;
  if ("deleted" in customer && customer.deleted) return null;
  return customer.id;
}
