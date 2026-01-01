// src/lib/billing/log-event.ts
// Helper function to log Stripe webhook events to bot_billing_events table

import type Stripe from "stripe";
import { createAdminClient } from "@/utils/supabase/admin";

export interface BillingEventLog {
  stripeEventId: string;
  type: string;
  customerId?: string | null;
  subscriptionId?: string | null;
  payload: Stripe.Event;
  stripeCreatedAt?: Date | null;
}

/**
 * Logs a Stripe webhook event to the bot_billing_events table.
 * This function is called BEFORE processing the event to ensure we have
 * a complete audit trail and can check for idempotency.
 *
 * @param event - The Stripe event object
 * @returns The inserted record ID if successful, null if failed
 */
export async function logBillingEvent(
  event: Stripe.Event
): Promise<string | null> {
  try {
    const admin = createAdminClient();

    // Extract customer_id and subscription_id from the event payload
    const customerId = extractCustomerId(event.data.object);
    const subscriptionId = extractSubscriptionId(event.data.object);

    const payload = {
      stripe_event_id: event.id,
      type: event.type,
      customer_id: customerId ?? null,
      subscription_id: subscriptionId ?? null,
      payload: event as unknown as Record<string, unknown>, // Store full event as JSONB
      stripe_created_at: event.created
        ? new Date(event.created * 1000).toISOString()
        : null,
      received_at: new Date().toISOString(),
      processing_status: "pending" as const,
    };

    const { data, error } = await admin
      .from("bot_billing_events")
      .insert(payload)
      .select("id")
      .single();

    if (error) {
      // If it's a unique constraint violation, the event was already logged
      // This is expected for idempotency checks
      if (error.code === "23505") {
        // PostgreSQL unique violation
        const { logger } = await import("@/lib/logger");
        logger.debug(`[billing] Event ${event.id} already logged (idempotency check)`, {
          eventId: event.id,
          eventType: event.type,
        });
        return null;
      }

      const { logger } = await import("@/lib/logger");
      logger.error("[billing] Failed to log billing event", error, {
        eventId: event.id,
        eventType: event.type,
        errorCode: error.code,
      });
      return null;
    }

    return data?.id ?? null;
  } catch (error) {
    const { logger } = await import("@/lib/logger");
    logger.error("[billing] Unexpected error while logging billing event", error, {
      eventId: event.id,
      eventType: event.type,
    });
    return null;
  }
}

/**
 * Checks if a Stripe event has already been processed (idempotency check).
 *
 * @param stripeEventId - The Stripe event ID (evt_xxx)
 * @returns true if event exists and was successfully processed, false otherwise
 */
export async function isEventProcessed(
  stripeEventId: string
): Promise<boolean> {
  try {
    const admin = createAdminClient();

    const { data, error } = await admin
      .from("bot_billing_events")
      .select("processing_status")
      .eq("stripe_event_id", stripeEventId)
      .maybeSingle();

    if (error) {
      console.error("[billing] Error checking event processing status", {
        error,
        eventId: stripeEventId,
      });
      // On error, assume not processed to be safe
      return false;
    }

    // If event exists and was successfully processed, skip it
    return data?.processing_status === "success";
  } catch (error) {
    console.error(
      "[billing] Unexpected error while checking event processing status",
      {
        error,
        eventId: stripeEventId,
      }
    );
    // On error, assume not processed to be safe
    return false;
  }
}

/**
 * Updates the processing status of a billing event.
 *
 * @param stripeEventId - The Stripe event ID (evt_xxx)
 * @param status - Processing status: 'success' or 'failed'
 * @param errorMessage - Optional error message if status is 'failed'
 */
export async function updateEventProcessingStatus(
  stripeEventId: string,
  status: "success" | "failed",
  errorMessage?: string
): Promise<void> {
  try {
    const admin = createAdminClient();

    const { error } = await admin
      .from("bot_billing_events")
      .update({
        processed_at: new Date().toISOString(),
        processing_status: status,
        error_message: errorMessage ?? null,
      })
      .eq("stripe_event_id", stripeEventId);

    if (error) {
      console.error("[billing] Failed to update event processing status", {
        error,
        eventId: stripeEventId,
        status,
      });
    }
  } catch (error) {
    console.error(
      "[billing] Unexpected error while updating event processing status",
      {
        error,
        eventId: stripeEventId,
        status,
      }
    );
  }
}

/**
 * Extracts customer ID from various Stripe object types.
 */
function extractCustomerId(
  object: Stripe.Event.Data.Object
): string | null {
  if (!object) return null;

  // Check for customer field (checkout.session, subscription, etc.)
  if ("customer" in object && object.customer) {
    if (typeof object.customer === "string") {
      return object.customer;
    }
    // Customer object (expanded)
    if (
      typeof object.customer === "object" &&
      object.customer !== null &&
      "id" in object.customer &&
      typeof object.customer.id === "string"
    ) {
      return object.customer.id;
    }
  }

  return null;
}

/**
 * Extracts subscription ID from various Stripe object types.
 */
function extractSubscriptionId(
  object: Stripe.Event.Data.Object
): string | null {
  if (!object) return null;

  // Checkout session has subscription field
  if ("subscription" in object && object.subscription) {
    if (typeof object.subscription === "string") {
      return object.subscription;
    }
    // Subscription object (expanded)
    if (
      typeof object.subscription === "object" &&
      object.subscription !== null &&
      "id" in object.subscription &&
      typeof object.subscription.id === "string"
    ) {
      return object.subscription.id;
    }
  }

  // For subscription.* events, the object itself is the subscription
  if (
    "id" in object &&
    typeof object.id === "string" &&
    object.id.startsWith("sub_")
  ) {
    return object.id;
  }

  return null;
}

