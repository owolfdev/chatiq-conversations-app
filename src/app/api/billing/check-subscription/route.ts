// src/app/api/billing/check-subscription/route.ts
// Lightweight endpoint to check if user has an active subscription
// Used to determine if upgrade confirmation dialog should be shown

import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getUserTeamId } from "@/lib/teams/get-user-team-id";
import { getStripeClient, isLiveMode } from "@/lib/stripe";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ hasActiveSubscription: false });
    }

    const teamId = await getUserTeamId(user.id);
    if (!teamId) {
      return NextResponse.json({ hasActiveSubscription: false });
    }

    const { data: team } = await supabase
      .from("bot_teams")
      .select("stripe_customer_id, plan")
      .eq("id", teamId)
      .maybeSingle();

    if (!team || !team.stripe_customer_id || team.stripe_customer_id === "NULL") {
      return NextResponse.json({ 
        hasActiveSubscription: false,
        currentPlan: team?.plan || "free"
      });
    }

    // Check if there's an active subscription in Stripe
    try {
      const stripe = getStripeClient(isLiveMode());
      const subscriptions = await stripe.subscriptions.list({
        customer: team.stripe_customer_id,
        status: "active",
        limit: 1,
      });

      const hasActiveSubscription = subscriptions.data.length > 0;

      return NextResponse.json({
        hasActiveSubscription,
        currentPlan: team.plan || "free",
      });
    } catch (error) {
      console.warn("[billing] Failed to check Stripe subscription", error);
      // If we can't check Stripe, use the plan from database as fallback
      return NextResponse.json({
        hasActiveSubscription: team.plan !== "free",
        currentPlan: team.plan || "free",
      });
    }
  } catch (error) {
    console.error("[billing] Error checking subscription", error);
    return NextResponse.json({ hasActiveSubscription: false });
  }
}

