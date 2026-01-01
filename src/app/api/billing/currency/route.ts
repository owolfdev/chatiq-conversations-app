// src/app/api/billing/currency/route.ts

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { getUserTeamId } from "@/lib/teams/get-user-team-id";
import type { BillingCurrency } from "@/lib/stripe";
import { AUDIT_ACTION, AUDIT_RESOURCE } from "@/lib/audit/constants";
import { logAuditEvent } from "@/lib/audit/log-event";

type Payload = {
  billing_currency?: BillingCurrency;
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "You must be signed in to update billing settings." },
        { status: 401 }
      );
    }

    const teamId = await getUserTeamId(user.id);
    if (!teamId) {
      return NextResponse.json(
        { error: "No team found for the current user." },
        { status: 400 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as Payload;
    const billingCurrency = body.billing_currency;

    if (!billingCurrency || !["usd", "thb"].includes(billingCurrency)) {
      return NextResponse.json(
        { error: "Invalid billing currency. Expected 'usd' or 'thb'." },
        { status: 400 }
      );
    }

    // Ensure user is team owner before allowing change
    const { data: membership } = await supabase
      .from("bot_team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (membership?.role !== "owner") {
      return NextResponse.json(
        { error: "Only team owners can change billing currency." },
        { status: 403 }
      );
    }

    const admin = createAdminClient();
    const { error: updateError } = await admin
      .from("bot_teams")
      .update({
        billing_currency: billingCurrency,
        updated_at: new Date().toISOString(),
      })
      .eq("id", teamId);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update billing currency." },
        { status: 500 }
      );
    }

    await logAuditEvent({
      teamId,
      userId: user.id,
      action: AUDIT_ACTION.BILLING_UPDATE,
      resourceType: AUDIT_RESOURCE.BILLING,
      resourceId: teamId,
      metadata: {
        billing_currency: billingCurrency,
      },
    });

    return NextResponse.json({ billing_currency: billingCurrency });
  } catch (error) {
    console.error("[billing] Failed to update billing currency", error);
    return NextResponse.json(
      { error: "Unexpected error updating billing currency." },
      { status: 500 }
    );
  }
}
