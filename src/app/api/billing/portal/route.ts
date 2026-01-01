// src/app/api/billing/portal/route.ts

import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { getUserTeamId } from "@/lib/teams/get-user-team-id";
import { getStripeClient, isLiveMode } from "@/lib/stripe";
import { env } from "@/lib/env";
import { getAppUrl } from "@/lib/email/get-app-url";
import { AUDIT_ACTION, AUDIT_RESOURCE } from "@/lib/audit/constants";
import { logAuditEvent } from "@/lib/audit/log-event";

function redirectWithError(code: string, reason?: string) {
  const appUrl = getAppUrl();
  const url = new URL(
    `/dashboard/billing?error=${code}`,
    appUrl
  );
  if (reason) {
    url.searchParams.set("reason", reason);
  }
  return NextResponse.redirect(url);
}

export async function GET() {
  try {
    const headerList = await headers();
    const forwardedFor = headerList.get("x-forwarded-for") || "";
    const ipAddress =
      forwardedFor.split(",")[0]?.trim() || headerList.get("x-real-ip") || null;
    const userAgent = headerList.get("user-agent") || null;

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      const appUrl = getAppUrl();
      return NextResponse.redirect(
        new URL("/sign-in", appUrl)
      );
    }

    const teamId = await getUserTeamId(user.id);

    if (!teamId) {
      return redirectWithError("no-team");
    }

    const admin = createAdminClient();
    const { data: team, error: teamError } = await admin
      .from("bot_teams")
      .select("stripe_customer_id")
      .eq("id", teamId)
      .maybeSingle();

    if (teamError || !team) {
      return redirectWithError("no-team");
    }

    if (!team.stripe_customer_id) {
      return redirectWithError(
        "no-customer",
        "No Stripe customer associated with this team"
      );
    }

    const stripe = getStripeClient(isLiveMode());
    const appUrl = getAppUrl();

    const session = await stripe.billingPortal.sessions.create({
      customer: team.stripe_customer_id,
      return_url: `${appUrl}/dashboard/billing`,
    });

    if (!session.url) {
      return redirectWithError("portal", "missing-session-url");
    }

    await logAuditEvent({
      teamId,
      userId: user.id,
      action: AUDIT_ACTION.BILLING_PORTAL,
      resourceType: AUDIT_RESOURCE.BILLING,
      resourceId: session.id,
      metadata: {
        customer_id: team.stripe_customer_id,
        return_url: `${appUrl}/dashboard/billing`,
      },
      ipAddress,
      userAgent,
    });

    return NextResponse.redirect(session.url, { status: 303 });
  } catch (error) {
    console.error("[stripe] Failed to create billing portal session", error);
    const reason =
      error && typeof error === "object" && "message" in error
        ? String((error as Error).message)
        : undefined;
    return redirectWithError("portal", reason);
  }
}
